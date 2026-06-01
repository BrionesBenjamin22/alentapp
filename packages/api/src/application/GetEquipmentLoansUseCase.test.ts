import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GetEquipmentLoansUseCase } from './GetEquipmentLoansUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { EquipmentLoanDTO } from '@alentapp/shared';

describe('GetEquipmentLoansUseCase', () => {
    // --- SECCIÓN DE PREPARACIÓN (MOCKS) ---
    // Falsificamos el repositorio. Para la lectura global, solo necesitamos el método getAll.
    const repositorioPrestamosMock = {
        getAll: vi.fn(),
    } as unknown as EquipmentLoanRepository;

    // Inyectamos el mock en nuestro Caso de Uso
    const casoDeUso = new GetEquipmentLoansUseCase(repositorioPrestamosMock);

    // Limpiamos el historial para asegurar un entorno limpio
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // 1. Test de obtención de listado completo
    it('debe retornar el arreglo completo de prestamos activos desde el repositorio', async () => {
        // ARRANGE (Preparar): 
        // 1. Creamos una lista ficticia con un préstamo de prueba
        const listaMock: EquipmentLoanDTO[] = [
            { id: '1', item_name: 'Pesa 5kg', status: 'Loaned', loan_date: '', due_date: null, member_id: '', deleted_at: null }
        ];

        // 2. Le indicamos al mock que cuando alguien llame a getAll(), devuelva nuestra lista ficticia
        vi.mocked(repositorioPrestamosMock.getAll).mockResolvedValueOnce(listaMock);

        // ACT (Actuar): 
        // Ejecutamos el caso de uso sin pasarle parámetros (porque trae todo)
        const resultado = await casoDeUso.execute();

        // ASSERT (Validar): 
        // 1. Comprobamos que el caso de uso efectivamente le haya pedido los datos al repositorio exactamente 1 vez
        expect(repositorioPrestamosMock.getAll).toHaveBeenCalledOnce();
        // 2. Comprobamos que la longitud del arreglo devuelto coincida con lo que preparamos
        expect(resultado).toHaveLength(1);
        // 3. Verificamos que el contenido del primer elemento sea el correcto
        expect(resultado[0].item_name).toBe('Pesa 5kg');
    });
});