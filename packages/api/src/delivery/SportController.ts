import { FastifyRequest, FastifyReply } from "fastify";
import { NewSportUseCase } from "../application/NewSportUseCase.js";
import { CreateSportRequest } from "../../../shared/index.js";

export class SportController {
    constructor(private newSportUseCase: NewSportUseCase) {}

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
    
}