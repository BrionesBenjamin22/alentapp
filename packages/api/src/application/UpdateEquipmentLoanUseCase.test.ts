import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateEquipmentLoanUseCase } from './UpdateEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { UpdateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

describe('UpdateEquipmentLoanUseCase', () => {
    const repositorioPrestamosMock = {
        getById: vi.fn(),
        update: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    const casoDeUso = new UpdateEquipmentLoanUseCase(repositorioPrestamosMock);

    const prestamoExistenteMock: EquipmentLoanDTO = {
        id: 'prestamo-1', item_name: 'Red de Voley', status: 'Loaned',
        loan_date: '2026-05-18T10:00:00Z', due_date: null, member_id: 'socio-1', deleted_at: null
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe permitir actualizar el estado de Loaned a Returned exitosamente', async () => {
        const datosActualizacion: UpdateEquipmentLoanRequest = { status: 'Returned' };
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoExistenteMock);
        vi.mocked(repositorioPrestamosMock.update).mockResolvedValueOnce({
            ...prestamoExistenteMock, status: 'Returned'
        });

        const resultado = await casoDeUso.execute('prestamo-1', datosActualizacion);

        expect(repositorioPrestamosMock.update).toHaveBeenCalledWith('prestamo-1', datosActualizacion);
        expect(resultado.status).toBe('Returned');
    });

    it('debe lanzar error NOT_FOUND si se intenta actualizar un prestamo inexistente', async () => {
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(null);

        await expect(casoDeUso.execute('prestamo-inexistente', { status: 'Returned' })).rejects.toThrow('NOT_FOUND');
        expect(repositorioPrestamosMock.update).not.toHaveBeenCalled();
    });

    it('debe lanzar error INVALID_TRANSITION si se intenta modificar un prestamo ya devuelto', async () => {
        const prestamoDevueltoMock = { ...prestamoExistenteMock, status: 'Returned' } as EquipmentLoanDTO;
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoDevueltoMock);

        await expect(casoDeUso.execute('prestamo-1', { status: 'Damaged' })).rejects.toThrow('INVALID_TRANSITION');
    });

    it('debe lanzar error INVALID_DUE_DATE si la fecha de devolucion es anterior a la fecha de prestamo', async () => {
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoExistenteMock);

        const fechaInvalida: UpdateEquipmentLoanRequest = { due_date: '2025-01-01T10:00:00Z' };

        await expect(casoDeUso.execute('prestamo-1', fechaInvalida)).rejects.toThrow('INVALID_DUE_DATE');
    });
});