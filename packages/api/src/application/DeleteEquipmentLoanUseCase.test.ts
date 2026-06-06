import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteEquipmentLoanUseCase } from './DeleteEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

describe('DeleteEquipmentLoanUseCase', () => {
    const repositorioPrestamosMock = {
        getById: vi.fn(),
        delete: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    const casoDeUso = new DeleteEquipmentLoanUseCase(repositorioPrestamosMock);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe procesar el borrado logico exitosamente si el prestamo esta en estado Loaned', async () => {
        const prestamoActivoMock = { id: 'prestamo-1', status: 'Loaned' } as EquipmentLoanDTO;
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoActivoMock);
        
        vi.mocked(repositorioPrestamosMock.delete).mockResolvedValueOnce({
            ...prestamoActivoMock, deleted_at: new Date().toISOString()
        });

        await casoDeUso.execute('prestamo-1');
        expect(repositorioPrestamosMock.delete).toHaveBeenCalledWith('prestamo-1');
    });

    it('debe lanzar error NOT_FOUND si el prestamo a eliminar no existe', async () => {
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(null);

        await expect(casoDeUso.execute('prestamo-999')).rejects.toThrow('NOT_FOUND');
        expect(repositorioPrestamosMock.delete).not.toHaveBeenCalled();
    });

    it('debe lanzar error INVALID_STATUS si se intenta eliminar un prestamo en estado Damaged', async () => {
        const prestamoDaniadoMock = { id: 'prestamo-1', status: 'Damaged' } as EquipmentLoanDTO;
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoDaniadoMock);

        await expect(casoDeUso.execute('prestamo-1')).rejects.toThrow('INVALID_STATUS');
        expect(repositorioPrestamosMock.delete).not.toHaveBeenCalled();
    });
});