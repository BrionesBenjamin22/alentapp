import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteEquipmentLoanUseCase } from './DeleteEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

describe('DeleteEquipmentLoanUseCase', () => {
    // --- SECCIÓN DE PREPARACIÓN (MOCKS) ---
    // Falsificamos el repositorio. Para la eliminación, el caso de uso necesita buscar (getById) y "borrar" (delete).
    const repositorioPrestamosMock = {
        getById: vi.fn(),
        delete: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    // Inyectamos el mock en nuestro Caso de Uso
    const casoDeUso = new DeleteEquipmentLoanUseCase(repositorioPrestamosMock);

    // Limpiamos el historial de llamadas de los mocks antes de cada test
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // 1. Test de procesamiento de borrado lógico (Soft Delete) exitoso
    it('debe procesar el borrado logico exitosamente si el prestamo esta en estado Loaned', async () => {
        // ARRANGE (Preparar): 
        // 1. Simulamos un préstamo que cumple con la regla de negocio para ser eliminado (estado 'Loaned')
        const prestamoActivoMock = { id: 'prestamo-1', status: 'Loaned' } as EquipmentLoanDTO;
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoActivoMock);
        
        // 2. Simulamos que el repositorio hace el soft delete y devuelve el objeto con la fecha de borrado seteada
        vi.mocked(repositorioPrestamosMock.delete).mockResolvedValueOnce({
            ...prestamoActivoMock, deleted_at: new Date().toISOString()
        });

        // ACT (Actuar): Mandamos a ejecutar el borrado de ese ID
        await casoDeUso.execute('prestamo-1');

        // ASSERT (Validar): 
        // Comprobamos que el caso de uso efectivamente haya delegado la acción de borrar al repositorio con el ID correcto
        expect(repositorioPrestamosMock.delete).toHaveBeenCalledWith('prestamo-1');
    });

    // 2. Test de validación de existencia del préstamo
    it('debe lanzar error NOT_FOUND si el prestamo a eliminar no existe', async () => {
        // ARRANGE: Simulamos que la base de datos no encuentra el ID solicitado (devuelve null)
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(null);

        // ACT & ASSERT: 
        // Esperamos que el caso de uso rechaze la promesa y lance el error 'NOT_FOUND'
        await expect(casoDeUso.execute('prestamo-999')).rejects.toThrow('NOT_FOUND');
        // Validamos que el sistema protegió la BD y nunca llamó al método delete
        expect(repositorioPrestamosMock.delete).not.toHaveBeenCalled();
    });

    // 3. Test de validación de estado prohibido para eliminación
    it('debe lanzar error INVALID_STATUS si se intenta eliminar un prestamo en estado Damaged', async () => {
        // ARRANGE: Simulamos que el préstamo existe, pero está en un estado terminal ('Damaged')
        const prestamoDaniadoMock = { id: 'prestamo-1', status: 'Damaged' } as EquipmentLoanDTO;
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoDaniadoMock);

        // ACT & ASSERT: 
        // El caso de uso debe frenar la operación porque un ítem dañado (o devuelto) es inborrable por regla de negocio
        await expect(casoDeUso.execute('prestamo-1')).rejects.toThrow('INVALID_STATUS');
        // Nuevamente, comprobamos que se haya bloqueado la llegada a la base de datos
        expect(repositorioPrestamosMock.delete).not.toHaveBeenCalled();
    });
});