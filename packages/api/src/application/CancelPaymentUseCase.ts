import type { PaymentDTO } from '@alentapp/shared';
import type { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

export class CancelPaymentUseCase {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentValidator: PaymentValidator
    ) {}

    async execute(id: string): Promise<PaymentDTO> {
        const existingPayment = await this.paymentRepository.findById(id);
        if (!existingPayment) {
            throw new Error('El pago no existe');
        }

        this.paymentValidator.validateCanCancel(existingPayment);

        return this.paymentRepository.cancel(id);
    }
}
