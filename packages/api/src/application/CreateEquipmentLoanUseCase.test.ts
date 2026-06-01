import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEquipmentLoanUseCase } from './CreateEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { CreateEquipmentLoanRequest, MemberDTO } from '@alentapp/shared';

describe('CreateEquipmentLoanUseCase', () => {
    // --- SECCIÓN DE PREPARACIÓN (MOCKS) ---
    // Falsificamos los repositorios usando vi.fn() para no tocar la base de datos real.
    const repositorioPrestamosMock = {
        create: vi.fn(),
        getAll: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn()
    } as unknown as EquipmentLoanRepository;

    const repositorioSociosMock = {
        findById: vi.fn(),
    } as unknown as MemberRepository;

    // Inyectamos los mocks en el Caso de Uso a testear
    const casoDeUso = new CreateEquipmentLoanUseCase(repositorioPrestamosMock, repositorioSociosMock);

    // Objeto de solicitud falso que se reutilizará en los tests
    const solicitudMock: CreateEquipmentLoanRequest = {
        member_id: 'socio-123',
        item_name: 'Pelota de Basquet',
    };

    // Limpiamos el historial de los mocks antes de cada test para que no se contaminen entre sí
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // 1. Test de creación de préstamo exitoso
    it('debe crear un prestamo exitosamente si el socio es Activo y no es Cadete', async () => {
        // ARRANGE (Preparar): Definimos los datos falsos que los mocks devolverán
        const socioValidoMock: MemberDTO = {
            id: 'socio-123', name: 'Mateo Geffroy', dni: '12345678', email: 'mateo@test.com',
            birthdate: '2002-06-01', category: 'Pleno', status: 'Activo', created_at: '2026-01-01'
        };

        // Le decimos al mock del repositorio de socios que cuando llame a findById devuelva a nuestro socio válido
        vi.mocked(repositorioSociosMock.findById).mockResolvedValueOnce(socioValidoMock);
        // Simulamos la respuesta exitosa de creación del préstamo
        vi.mocked(repositorioPrestamosMock.create).mockResolvedValueOnce({
            id: 'prestamo-1', ...solicitudMock, status: 'Loaned', loan_date: '2026-05-18T10:00:00Z', due_date: null, deleted_at: null
        });

        // ACT (Actuar): Ejecutamos la función principal del Caso de Uso
        const resultado = await casoDeUso.execute(solicitudMock);

        // ASSERT (Validar): Verificamos que las funciones mockeadas hayan sido llamadas con los parámetros correctos
        expect(repositorioSociosMock.findById).toHaveBeenCalledWith('socio-123');
        expect(repositorioPrestamosMock.create).toHaveBeenCalledWith(solicitudMock);
        // Comprobamos que el resultado retornado es el que esperamos (Status inicial en Loaned)
        expect(resultado.id).toBe('prestamo-1');
        expect(resultado.status).toBe('Loaned');
    });

    // 2. Test de validación de socio inexistente
    it('debe lanzar error 400 si el socio no existe en la base de datos', async () => {
        // ARRANGE: Simulamos que findById no encuentra nada (retorna null)
        vi.mocked(repositorioSociosMock.findById).mockResolvedValueOnce(null);

        // ACT & ASSERT: Esperamos que la ejecución falle (.rejects) y lance el error correspondiente (.toThrow)
        await expect(casoDeUso.execute(solicitudMock)).rejects.toThrow('El socio no existe');
        // Validamos que el código haya cortado la ejecución y NO se haya intentado guardar en la BD
        expect(repositorioPrestamosMock.create).not.toHaveBeenCalled();
    });

    // 3. Test de validación de estado del socio (Moroso)
    it('debe lanzar error 400 si el socio tiene estado Moroso o Suspendido', async () => {
        // ARRANGE: Creamos un socio con estado 'Moroso'
        const socioMorosoMock = { id: 'socio-123', status: 'Moroso', category: 'Pleno' } as MemberDTO;
        vi.mocked(repositorioSociosMock.findById).mockResolvedValueOnce(socioMorosoMock);

        // ACT & ASSERT: Verificamos que el sistema frene la ejecución por regla de negocio
        await expect(casoDeUso.execute(solicitudMock)).rejects.toThrow('El socio no está en estado Activo');
    });

    // 4. Test de validación de categoría del socio (Cadete)
    it('debe lanzar error 400 si el socio tiene categoria Cadete', async () => {
        // ARRANGE: Creamos un socio con categoría 'Cadete'
        const socioCadeteMock = { id: 'socio-123', status: 'Activo', category: 'Cadete' } as MemberDTO;
        vi.mocked(repositorioSociosMock.findById).mockResolvedValueOnce(socioCadeteMock);

        // ACT & ASSERT: Verificamos que el sistema frene la ejecución por regla de negocio
        await expect(casoDeUso.execute(solicitudMock)).rejects.toThrow('Los socios Cadet no pueden solicitar préstamos');
    });
});