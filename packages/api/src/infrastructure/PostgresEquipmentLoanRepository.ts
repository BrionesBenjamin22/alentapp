import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO, CreateEquipmentLoanRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL),
});

export class PostgresEquipmentLoanRepository implements EquipmentLoanRepository {
    async create(data: CreateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        const loan = await prisma.equipmentLoan.create({
            data: {
                item_name: data.item_name,
                member_id: data.member_id,
                ...(data.due_date && { due_date: new Date(data.due_date) }),
                // status, loan_date y deleted_at se manejan solos por los defaults de Prisma
            },
        });

        return this.mapToDTO(loan);
    }

    private mapToDTO(loan: any): EquipmentLoanDTO {
        return {
            id: loan.id,
            item_name: loan.item_name,
            status: loan.status,
            loan_date: loan.loan_date.toISOString(),
            due_date: loan.due_date ? loan.due_date.toISOString() : null,
            member_id: loan.member_id,
            deleted_at: loan.deleted_at ? loan.deleted_at.toISOString() : null,
        };
    }
}