import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaymentDTO } from '@alentapp/shared';
import { CancelPaymentUseCase } from './DeletePaymentUseCase.js';
import type { MemberRepository } from '../domain/MemberRepository.js';
import type { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

describe('DeletePaymentUseCase', () => {
    const mockPaymentRepo = {
        findById: vi.fn(),
        cancel: vi.fn(),
    } as unknown as PaymentRepository;

    const mockMemberRepo = {} as unknown as MemberRepository;
    const paymentValidator = new PaymentValidator(mockMemberRepo);
    const useCase = new CancelPaymentUseCase(mockPaymentRepo, paymentValidator);

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
        vi.mocked(mockPaymentRepo.cancel).mockResolvedValue({
            ...existingPayment,
            status: 'Canceled',
            updated_at: '2026-05-03T00:00:00.000Z',
        });
    });

    it('debe cancelar un pago existente', async () => {
        const result = await useCase.execute('payment-1');

        expect(mockPaymentRepo.findById).toHaveBeenCalledWith('payment-1');
        expect(mockPaymentRepo.cancel).toHaveBeenCalledWith('payment-1');
        expect(result.status).toBe('Canceled');
    });

    it('debe lanzar error si el pago a cancelar no existe', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute('payment-no')).rejects.toThrow('El pago no existe');
        expect(mockPaymentRepo.cancel).not.toHaveBeenCalled();
    });

    it('debe rechazar la cancelacion de un pago ya cancelado', async () => {
        vi.mocked(mockPaymentRepo.findById).mockResolvedValueOnce({
            ...existingPayment,
            status: 'Canceled',
        });

        await expect(useCase.execute('payment-1')).rejects.toThrow('El pago ya se encuentra cancelado');
        expect(mockPaymentRepo.cancel).not.toHaveBeenCalled();
    });

    it('debe propagar errores del repositorio al cancelar', async () => {
        vi.mocked(mockPaymentRepo.cancel).mockRejectedValueOnce(new Error('Error interno, reintente mas tarde'));

        await expect(useCase.execute('payment-1')).rejects.toThrow('Error interno, reintente mas tarde');
    });
});
