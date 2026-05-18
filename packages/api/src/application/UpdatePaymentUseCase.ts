import type { PaymentDTO, UpdatePaymentRequest } from '@alentapp/shared';
import type { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

export class UpdatePaymentUseCase {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentValidator: PaymentValidator
    ) {}

    async execute(id: string, data: UpdatePaymentRequest): Promise<PaymentDTO> {
        const existingPayment = await this.paymentRepository.findById(id);
        if (!existingPayment) {
            throw new Error('El pago no existe');
        }

        this.paymentValidator.validateForUpdate(data, existingPayment);

        return this.paymentRepository.update(id, data);
    }
}
