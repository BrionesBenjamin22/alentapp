import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/client/client.js";
import { SportDTO, CreateSportRequest, UpdateSportRequest} from "../../../shared/index.js";
import { SportRepository } from "../domain/SportRepository.js";

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
}

const prisma = new PrismaClient({
    adapter: new PrismaPg(process.env.DATABASE_URL)
});

type DBSport = {
    id: string;
    name: string;
    description: string;
    max_capacity: number;
    additional_price: number;
    is_federated: boolean;
    created_at: Date;
    updated_at: Date;
};

export class PostgresSportRepository implements SportRepository {
    async create(data: CreateSportRequest): Promise<SportDTO> {
        const newSport = await prisma.sport.create({
            data: {
                name: data.name,
                description: data.description,
                max_capacity: data.maxCapacity,
                additional_price: data.additionalPrice,
                is_federated: data.isFederated,
            }
        });

        return this.mapToDTO(newSport);
    }

    async findById(id: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findUnique({
            where: { id },
        });

        return sport ? this.mapToDTO(sport) : null;
    }

    async findByName(name: string): Promise<SportDTO | null> {
        const sport = await prisma.sport.findUnique({
            where: { name }
        });
        return sport ? this.mapToDTO(sport) : null;
    }

    async findAll(): Promise<SportDTO[]> {
        const sports = await prisma.sport.findMany({
            orderBy: { created_at: 'desc' },
        });

        return sports.map(sport => this.mapToDTO(sport));
    }

    async update(id: string, data: UpdateSportRequest): Promise<SportDTO> {
        const sport = await prisma.sport.update({
            where: { id },
            data: {
                ...(data.description !== undefined && { description: data.description }),
                ...(data.maxCapacity !== undefined && { max_capacity: data.maxCapacity }),
            },
        });

        return this.mapToDTO(sport);
    }

    async delete(id: string): Promise<void> {
        await prisma.sport.delete({
            where: { id },
        });
    }

    private mapToDTO(sport: DBSport): SportDTO {
        return {
            id: sport.id,
            name: sport.name,
            description: sport.description,
            maxCapacity: sport.max_capacity,
            additionalPrice: sport.additional_price,
            isFederated: sport.is_federated,
            created_at: sport.created_at.toISOString(),
            updated_at: sport.updated_at.toISOString(),
        };
    }
}