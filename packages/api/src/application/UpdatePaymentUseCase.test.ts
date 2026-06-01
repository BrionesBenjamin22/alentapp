import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentDTO, UpdatePaymentRequest } from '@alentapp/shared';
import { UpdatePaymentUseCase } from './UpdatePaymentUseCase.js';
import type { MemberRepository } from '../domain/MemberRepository.js';
import type { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

describe('UpdatePaymentUseCase', () => {
    const mockPaymentRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as PaymentRepository;

    const mockMemberRepo = {} as unknown as MemberRepository;
    const paymentValidator = new PaymentValidator(mockMemberRepo);
    const useCase = new UpdatePaymentUseCase(mockPaymentRepo, paymentValidator);

    const existingPayment: PaymentDTO = {
        id: 'payment-1',
        amount: 1500,
        month: 5,
        year: 2026,
        status: 'Pending',
        due_date: '2026-05-10',
        payment_date: null,
        member_id: 'member-1',
        created_at: '2026-05-02T00:00:00.000Z',
        updated_at: '2026-05-02T00:00:00.000Z',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockPaymentRepo.findById).mockResolvedValue(existingPayment);
        vi.mocked(mockPaymentRepo.update).mockResolvedValue({
            ...existingPayment,
            amount: 2000,
            updated_at: '2026-05-03T00:00:00.000Z',
        });
    });

    it('debe actualizar campos validos de un pago existente', async () => {
        const updateData: UpdatePaymentRequest = { amount: 2000, month: 6 };

        await useCase.execute('payment-1', updateData);

        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('payment-1');
        expect(mockPaymentRepo.update).toHaveBeenCalledWith('payment-1', updateData);
    });

    it('debe lanzar error si el pago no existe', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('payment-no', { amount: 2000 })).rejects.toThrow('El pago no existe');
        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });

    it('debe rechazar modificaciones del socio asociado', async () => {
        const updateData = { member_id: 'member-2' } as unknown as UpdatePaymentRequest;

        await expect(useCase.execute('payment-1', updateData)).rejects.toThrow('No se puede modificar el socio asociado al pago');
        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });

    it('debe rechazar montos invalidos', async () => {
        await expect(useCase.execute('payment-1', { amount: -500 })).rejects.toThrow('El monto del pago debe ser mayor a cero');
        expect(mockPaymentRepo.update).not.toHaveBeenCalled();
    });
});
