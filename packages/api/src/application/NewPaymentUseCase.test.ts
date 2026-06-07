import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CreatePaymentRequest, MemberDTO, PaymentDTO } from '@alentapp/shared';
import { CreatePaymentUseCase } from './NewPaymentUseCase.js';
import type { MemberRepository } from '../domain/MemberRepository.js';
import type { PaymentRepository } from '../domain/PaymentRepository.js';
import { PaymentValidator } from '../domain/services/PaymentValidator.js';

describe('CreatePaymentUseCase', () => {
    const mockPaymentRepo = {
        create: vi.fn(),
    } as unknown as PaymentRepository;

    const mockMemberRepo = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    const paymentValidator = new PaymentValidator(mockMemberRepo);
    const useCase = new CreatePaymentUseCase(mockPaymentRepo, paymentValidator);

    const existingMember: MemberDTO = {
        id: 'member-1',
        dni: '12345678',
        name: 'Juan Perez',
        email: 'juan@test.com',
        birthdate: '1990-01-01',
        category: 'Pleno',
        status: 'Activo',
        created_at: '2026-04-20T00:00:00.000Z',
    };

    const validRequest: CreatePaymentRequest = {
        amount: 1500,
        month: 5,
        year: 2026,
        due_date: '2026-05-10',
        member_id: 'member-1',
    };

    const createdPayment: PaymentDTO = {
        id: 'payment-1',
        ...validRequest,
        status: 'Pending',
        payment_date: null,
        created_at: '2026-05-02T00:00:00.000Z',
        updated_at: '2026-05-02T00:00:00.000Z',
    };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(mockMemberRepo.findById).mockResolvedValue(existingMember);
        vi.mocked(mockPaymentRepo.create).mockResolvedValue(createdPayment);
    });

    it('debe crear un pago pendiente por defecto', async () => {
        const result = await useCase.execute(validRequest);

        expect(mockMemberRepo.findById).toHaveBeenCalledWith('member-1');
        expect(mockPaymentRepo.create).toHaveBeenCalledWith({
            ...validRequest,
            status: 'Pending',
            payment_date: null,
        });
        expect(result).toEqual(createdPayment);
    });

    it('debe crear un pago abonado con fecha de pago', async () => {
        const request: CreatePaymentRequest = {
            ...validRequest,
            status: 'Paid',
            payment_date: '2026-05-02T10:30:00.000Z',
        };
        const paidPayment: PaymentDTO = {
            ...createdPayment,
            ...request,
            status: 'Paid',
            payment_date: '2026-05-02T10:30:00.000Z',
        };
        vi.mocked(mockPaymentRepo.create).mockResolvedValueOnce(paidPayment);

        const result = await useCase.execute(request);

        expect(mockPaymentRepo.create).toHaveBeenCalledWith(request);
        expect(result.status).toBe('Paid');
        expect(result.payment_date).toBe('2026-05-02T10:30:00.000Z');
    });

    it('debe rechazar el pago si el socio no existe', async () => {
        vi.mocked(mockMemberRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute(validRequest)).rejects.toThrow('El socio asociado al pago no existe');
        expect(mockPaymentRepo.create).not.toHaveBeenCalled();
    });

    it('debe rechazar datos de alta invalidos', async () => {
        const request = { ...validRequest, amount: 0 };

        await expect(useCase.execute(request)).rejects.toThrow('El monto del pago debe ser mayor a cero');
        expect(mockPaymentRepo.create).not.toHaveBeenCalled();
    });
});
