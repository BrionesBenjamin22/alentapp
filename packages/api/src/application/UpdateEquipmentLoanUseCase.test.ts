import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateEquipmentLoanUseCase } from './UpdateEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { UpdateEquipmentLoanRequest, EquipmentLoanDTO } from '@alentapp/shared';

describe('UpdateEquipmentLoanUseCase', () => {
    // --- SECCIÓN DE PREPARACIÓN (MOCKS) ---
    // Falsificamos el repositorio. Para el Update, solo necesitamos simular la lectura (getById) y la escritura (update).
    const repositorioPrestamosMock = {
        getById: vi.fn(),
        update: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    // Inyectamos el mock en el Caso de Uso
    const casoDeUso = new UpdateEquipmentLoanUseCase(repositorioPrestamosMock);

    // Creamos un préstamo base "feliz" (en estado Loaned) para reutilizar como punto de partida en los tests
    const prestamoExistenteMock: EquipmentLoanDTO = {
        id: 'prestamo-1', item_name: 'Red de Voley', status: 'Loaned',
        loan_date: '2026-05-18T10:00:00Z', due_date: null, member_id: 'socio-1', deleted_at: null
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // 1. Test de actualización exitosa (Transición válida)
    it('debe permitir actualizar el estado de Loaned a Returned exitosamente', async () => {
        // ARRANGE (Preparar): 
        // 1. Simulamos lo que envía el Frontend (queremos devolver el préstamo)
        const datosActualizacion: UpdateEquipmentLoanRequest = { status: 'Returned' };
        // 2. Simulamos que la base de datos encuentra el préstamo original (en Loaned)
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoExistenteMock);
        // 3. Simulamos que la base de datos guarda y devuelve el objeto con el estado cambiado
        vi.mocked(repositorioPrestamosMock.update).mockResolvedValueOnce({
            ...prestamoExistenteMock, status: 'Returned'
        });

        // ACT (Actuar): Ejecutamos la actualización
        const resultado = await casoDeUso.execute('prestamo-1', datosActualizacion);

        // ASSERT (Validar): 
        // Verificamos que se haya mandado a guardar con el ID y los datos correctos
        expect(repositorioPrestamosMock.update).toHaveBeenCalledWith('prestamo-1', datosActualizacion);
        // Verificamos que la salida refleje la transición exitosa
        expect(resultado.status).toBe('Returned');
    });

    // 2. Test de validación de préstamo inexistente
    it('debe lanzar error NOT_FOUND si se intenta actualizar un prestamo inexistente', async () => {
        // ARRANGE: Simulamos que la búsqueda por ID en la BD no encuentra nada
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(null);

        // ACT & ASSERT: Esperamos que falle lanzando 'NOT_FOUND'
        await expect(casoDeUso.execute('prestamo-inexistente', { status: 'Returned' })).rejects.toThrow('NOT_FOUND');
        // Validamos que NO se haya intentado ejecutar la actualización (protegemos la BD)
        expect(repositorioPrestamosMock.update).not.toHaveBeenCalled();
    });

    // 3. Test de validación de máquina de estados (Transición inválida desde estado terminal)
    it('debe lanzar error INVALID_TRANSITION si se intenta modificar un prestamo ya devuelto', async () => {
        // ARRANGE: Alteramos el mock base para simular un préstamo que YA fue devuelto (estado terminal)
        const prestamoDevueltoMock = { ...prestamoExistenteMock, status: 'Returned' } as EquipmentLoanDTO;
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoDevueltoMock);

        // ACT & ASSERT: Intentamos pasarlo a 'Damaged'. El sistema debe frenarlo porque 'Returned' es inamovible.
        await expect(casoDeUso.execute('prestamo-1', { status: 'Damaged' })).rejects.toThrow('INVALID_TRANSITION');
    });

    // 4. Test de validación de regla de negocio (Fecha de devolución cronológicamente inválida)
    it('debe lanzar error INVALID_DUE_DATE si la fecha de devolucion es anterior a la fecha de prestamo', async () => {
        // ARRANGE: Traemos el préstamo normal (prestado el 18-05-2026)
        vi.mocked(repositorioPrestamosMock.getById).mockResolvedValueOnce(prestamoExistenteMock);

        // Preparamos un intento de actualización queriendo decir que se devolvió un año antes de que se prestara
        const fechaInvalida: UpdateEquipmentLoanRequest = { due_date: '2025-01-01T10:00:00Z' };

        // ACT & ASSERT: El caso de uso debe comparar las fechas y frenar la ejecución
        await expect(casoDeUso.execute('prestamo-1', fechaInvalida)).rejects.toThrow('INVALID_DUE_DATE');
    });
});