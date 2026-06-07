import { FastifyReply, FastifyRequest } from 'fastify';
import { CreateEquipmentLoanUseCase } from '../application/NewEquipmentLoanUseCase.js';
import { GetEquipmentLoansUseCase } from '../application/GetEquipmentLoansUseCase.js';
import { UpdateEquipmentLoanUseCase } from '../application/UpdateEquipmentLoanUseCase.js';
import { DeleteEquipmentLoanUseCase } from '../application/DeleteEquipmentLoanUseCase.js';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

export class EquipmentLoanController {
    constructor(
        private createEquipmentLoanUseCase: CreateEquipmentLoanUseCase,
        private getEquipmentLoansUseCase: GetEquipmentLoansUseCase,
        private updateEquipmentLoanUseCase: UpdateEquipmentLoanUseCase,
        private deleteEquipmentLoanUseCase: DeleteEquipmentLoanUseCase
    ) {}

    async create(request: FastifyRequest<{ Body: CreateEquipmentLoanRequest }>, reply: FastifyReply) {
        try {
            const loan = await this.createEquipmentLoanUseCase.execute(request.body);
            return reply.status(201).send(loan);
        } catch (error: any) {
            return reply.status(400).send({ error: error.message });
        }
    }

    async getAll(request: FastifyRequest, reply: FastifyReply) {
        try {
            const loans = await this.getEquipmentLoansUseCase.execute();
            return reply.status(200).send(loans);
        } catch (error: any) {
            return reply.status(500).send({ error: 'Internal server error' });
        }
    }

    async update(request: FastifyRequest<{ Params: { id: string }, Body: UpdateEquipmentLoanRequest }>, reply: FastifyReply) {
        try {
            const loan = await this.updateEquipmentLoanUseCase.execute(request.params.id, request.body);
            return reply.status(200).send(loan);
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') {
                return reply.status(404).send({ error: 'El préstamo no existe' });
            }
            if (error.message === 'INVALID_TRANSITION') {
                return reply.status(422).send({ error: 'Transición de estado inválida. Los estados Returned y Damaged son terminales.' });
            }
            if (error.message === 'INVALID_DUE_DATE') {
                return reply.status(422).send({ error: 'La fecha de devolución debe ser posterior a la fecha de préstamo' });
            }
            return reply.status(500).send({ error: 'Internal server error' });
        }
    }

    async delete(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
        try {
            const loan = await this.deleteEquipmentLoanUseCase.execute(request.params.id);
            return reply.status(200).send(loan);
        } catch (error: any) {
            if (error.message === 'NOT_FOUND') {
                return reply.status(404).send({ error: 'El préstamo no existe' });
            }
            if (error.message === 'INVALID_STATUS') {
                return reply.status(422).send({ error: 'No se puede eliminar un préstamo en estado Returned o Damaged' });
            }
            return reply.status(500).send({ error: 'Internal server error' });
        }
    }
}