import { FastifyRequest, FastifyReply } from "fastify";
import { NewSportUseCase } from "../application/NewSportUseCase.js";
import { GetSportsUseCase } from "../application/GetSportsUseCase.js";
import { GetSportUseCase } from "../application/GetSportUseCase.js";
import { UpdateSportUseCase } from "../application/UpdateSportUseCase.js";
import { CreateSportRequest, UpdateSportRequest } from "../../../shared/index.js";

export class SportController {
    constructor(
        private newSportUseCase: NewSportUseCase,
        private getSportsUseCase: GetSportsUseCase,
        private getSportUseCase: GetSportUseCase,
        private updateSportUseCase: UpdateSportUseCase
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
        try {
            const sports = await this.getSportsUseCase.execute();
            reply.status(200).send({ data: sports });
        } catch (error: any) {
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }

    async getById(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };
            const sport = await this.getSportUseCase.execute(id);
            reply.status(200).send({ data: sport });
        } catch (error: any) {
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }

    async create(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        try {
            const createSportRequest: CreateSportRequest = request.body as CreateSportRequest;
            const newSport = await this.newSportUseCase.execute(createSportRequest);
            reply.status(201).send(newSport);
        }
        catch (error: any) {
             if (error.message.includes('Ya existe un deporte')) {
                return reply.status(409).send({ error: error.message });
            }
            if (error.message.includes('obligatorio') ||
                error.message.includes('obligatoria') || 
                error.message.includes('debe ser') || 
                error.message.includes('no puede ser')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }

    async update(request: FastifyRequest, reply: FastifyReply): Promise<void> {
        try {
            const { id } = request.params as { id: string };
            const updateSportRequest: UpdateSportRequest = request.body as UpdateSportRequest;
            const sport = await this.updateSportUseCase.execute(id, updateSportRequest);
            reply.status(200).send({ data: sport });
        } catch (error: any) {
            if (error.message.includes('no existe')) {
                return reply.status(404).send({ error: error.message });
            }
            if (error.message.includes('Solo se permite') || error.message.includes('no puede')) {
                return reply.status(400).send({ error: error.message });
            }
            if (error.message.includes('obligatorio') ||
                error.message.includes('obligatoria') ||
                error.message.includes('debe ser')) {
                return reply.status(400).send({ error: error.message });
            }
            return reply.status(500).send({ error: "Error interno, reintente más tarde" });
        }
    }
    
}