import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO, CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

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
            },
        });

        return this.mapToDTO(loan);
    }

    async getAll(): Promise<EquipmentLoanDTO[]> {
        const loans = await prisma.equipmentLoan.findMany({
            where: { deleted_at: null },
            orderBy: { loan_date: 'desc' },
            include: {
                member: true // Lo traemos para que el Frontend pueda mostrar el nombre
            }
        });
        
        return loans.map(loan => this.mapToDTO(loan));
    }

    async getById(id: string): Promise<EquipmentLoanDTO | null> {
        const loan = await prisma.equipmentLoan.findFirst({
            where: { id, deleted_at: null }
        });
        
        return loan ? this.mapToDTO(loan) : null;
    }

    async update(id: string, data: UpdateEquipmentLoanRequest): Promise<EquipmentLoanDTO> {
        const loan = await prisma.equipmentLoan.update({
            where: { id },
            data: {
                ...(data.status && { status: data.status }),
                ...(data.due_date && { due_date: new Date(data.due_date) }),
            },
        });

        return this.mapToDTO(loan);
    }

    async delete(id: string): Promise<EquipmentLoanDTO> {
        // Hacemos un soft delete actualizando el deleted_at con la fecha actual
        const loan = await prisma.equipmentLoan.update({
            where: { id },
            data: {
                deleted_at: new Date(),
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
            // Agregamos el member anidado si Prisma lo trajo con el 'include'
            ...(loan.member && { member: loan.member }) 
        };
    }
}