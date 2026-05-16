import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client/client.js';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { CreateDisciplineRequest, DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg(process.env.DATABASE_URL),
});

type DBDiscipline = {
  id: string;
  reason: string;
  start_date: Date;
  end_date: Date;
  is_total_suspension: boolean;
  member_id: string;
  created_at: Date;
  updated_at: Date;
};

export class PostgresDisciplineRepository implements DisciplineRepository {
  async create(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
    const discipline = await prisma.discipline.create({
      data: {
        member_id: data.memberId,
        reason: data.reason,
        start_date: new Date(data.startDate),
        end_date: new Date(data.endDate),
        is_total_suspension: data.isTotalSuspension,
      },
    });

    return this.mapToDTO(discipline);
  }

  async findById(id: string): Promise<DisciplineDTO | null> {
    const discipline = await prisma.discipline.findUnique({
      where: { id },
    });

    return discipline ? this.mapToDTO(discipline) : null;
  }

  async findAll(): Promise<DisciplineDTO[]> {
    const disciplines = await prisma.discipline.findMany({
      orderBy: { created_at: 'desc' },
    });

    return disciplines.map((discipline) => this.mapToDTO(discipline));
  }

  async update(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO> {
    const discipline = await prisma.discipline.update({
      where: { id },
      data: {
        ...(data.reason !== undefined && { reason: data.reason }),
        ...(data.startDate !== undefined && { start_date: new Date(data.startDate) }),
        ...(data.endDate !== undefined && { end_date: new Date(data.endDate) }),
        ...(data.isTotalSuspension !== undefined && { is_total_suspension: data.isTotalSuspension }),
      },
    });

    return this.mapToDTO(discipline);
  }

  async delete(id: string): Promise<void> {
    await prisma.discipline.delete({
      where: { id },
    });
  }

  private mapToDTO(discipline: DBDiscipline): DisciplineDTO {
    return {
      id: discipline.id,
      memberId: discipline.member_id,
      reason: discipline.reason,
      startDate: discipline.start_date.toISOString(),
      endDate: discipline.end_date.toISOString(),
      isTotalSuspension: discipline.is_total_suspension,
      createdAt: discipline.created_at.toISOString(),
      updatedAt: discipline.updated_at.toISOString(),
    };
  }
}
