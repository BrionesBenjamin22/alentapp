import type { CreatePaymentRequest, PaymentDTO } from '@alentapp/shared';
import type { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

export class CreatePaymentUseCase {
    constructor(
        private readonly paymentRepository: PaymentRepository,
        private readonly paymentValidator: PaymentValidator
    ) {}

    async execute(data: CreatePaymentRequest): Promise<PaymentDTO> {
        await this.paymentValidator.validateForCreate(data);

        const paymentToCreate: CreatePaymentRequest = {
            ...data,
            status: data.status ?? 'Pending',
            payment_date: data.payment_date ?? null,
        };

        return this.paymentRepository.create(paymentToCreate);
    }
}
