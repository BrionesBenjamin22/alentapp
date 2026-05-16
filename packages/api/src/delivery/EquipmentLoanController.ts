import { FastifyRequest, FastifyReply } from 'fastify';
import { CreateEquipmentLoanUseCase } from '../application/CreateEquipmentLoanUseCase.js';
import { CreateEquipmentLoanRequest } from '@alentapp/shared';

export class EquipmentLoanController {
    constructor(private readonly createUseCase: CreateEquipmentLoanUseCase) {}

    async create(
        request: FastifyRequest<{ Body: CreateEquipmentLoanRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const loan = await this.createUseCase.execute(request.body);
            return reply.status(201).send({ data: loan });
        } catch (error: any) {
            const message = error.message;
            
            // Mapeo de errores según TDD-0010
            if (message === 'El socio no existe') {
                return reply.status(404).send({ error: message });
            } else if (message.includes('Cadet') || message.includes('Cadete')) {
                return reply.status(403).send({ error: message });
            } else if (message.includes('Activo') || message.includes('futura')) {
                return reply.status(422).send({ error: message });
            } else {
                return reply.status(400).send({ error: message });
            }
        }
    }
}