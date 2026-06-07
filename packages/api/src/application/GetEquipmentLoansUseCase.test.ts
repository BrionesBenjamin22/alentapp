import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetEquipmentLoansUseCase } from './GetEquipmentLoansUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

describe('GetEquipmentLoansUseCase', () => {
    const repositorioPrestamosMock = {
        getAll: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    const casoDeUso = new GetEquipmentLoansUseCase(repositorioPrestamosMock);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe retornar el arreglo completo de prestamos activos desde el repositorio', async () => {
        const listaMock: EquipmentLoanDTO[] = [
            { id: '1', item_name: 'Pesa 5kg', status: 'Loaned', loan_date: '', due_date: null, member_id: '', deleted_at: null }
        ];

        vi.mocked(repositorioPrestamosMock.getAll).mockResolvedValueOnce(listaMock);

        const resultado = await casoDeUso.execute();

        expect(repositorioPrestamosMock.getAll).toHaveBeenCalledOnce();
        expect(resultado).toHaveLength(1);
        expect(resultado[0].item_name).toBe('Pesa 5kg');
    });
});