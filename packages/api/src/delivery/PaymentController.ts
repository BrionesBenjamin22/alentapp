import type { FastifyReply, FastifyRequest } from 'fastify';
import type { CreatePaymentRequest, UpdatePaymentRequest } from '@alentapp/shared';
import type { CreatePaymentUseCase } from '../application/CreatePaymentUseCase.js';
import type { GetPaymentsUseCase } from '../application/GetPaymentsUseCase.js';
import type { UpdatePaymentUseCase } from '../application/UpdatePaymentUseCase.js';

export class PaymentController {
    constructor(
        private readonly createPaymentUseCase: CreatePaymentUseCase,
        private readonly getPaymentsUseCase: GetPaymentsUseCase,
        private readonly updatePaymentUseCase: UpdatePaymentUseCase,
    ) {}

    async getAll(_request: FastifyRequest, reply: FastifyReply) {
        try {
            const payments = await this.getPaymentsUseCase.execute();
            return reply.status(200).send({ data: payments });
        } catch (error: any) {
            return reply.status(500).send({ error: error.message });
        }
    }

    async create(
        request: FastifyRequest<{ Body: CreatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const payment = await this.createPaymentUseCase.execute(request.body);
            return reply.status(201).send({ data: payment });
        } catch (error: any) {
            const message = error.message;

            if (message === 'El socio asociado al pago no existe') {
                return reply.status(404).send({ error: message });
            }

            if (this.isValidationError(message)) {
                return reply.status(400).send({ error: message });
            }

            request.log.error({ err: error }, 'Error inesperado al crear pago');
            return reply.status(500).send({ error: 'Error interno, reintente mas tarde' });
        }
    }

    async update(
        request: FastifyRequest<{ Params: { id: string }; Body: UpdatePaymentRequest }>,
        reply: FastifyReply,
    ) {
        try {
            const { id } = request.params;
            const payment = await this.updatePaymentUseCase.execute(id, request.body);
            return reply.status(200).send({ data: payment });
        } catch (error: any) {
            const message = error.message;

            if (message === 'El pago no existe') {
                return reply.status(404).send({ error: message });
            }

            if (this.isValidationError(message)) {
                return reply.status(400).send({ error: message });
            }

            request.log.error({ err: error }, 'Error inesperado al actualizar pago');
            return reply.status(500).send({ error: 'Error interno, reintente mas tarde' });
        }
    }

    private isValidationError(message: string): boolean {
        return (
            message === 'El monto del pago debe ser mayor a cero' ||
            message === 'El mes debe estar comprendido entre 1 y 12' ||
            message === 'El socio asociado al pago es obligatorio' ||
            message === 'No se puede modificar el socio asociado al pago' ||
            message === 'La fecha de pago es obligatoria para pagos abonados' ||
            message === 'Un pago pendiente no debe tener fecha de pago' ||
            message.startsWith('El ano del pago') ||
            message.startsWith('El aÃ±o del pago') ||
            message.startsWith('El estado del pago') ||
            message.startsWith('La fecha de vencimiento') ||
            message.startsWith('La fecha de pago')
        );
    }
}
