import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateEquipmentLoanUseCase } from './NewEquipmentLoanUseCase.js';
import { EquipmentLoanRepository } from '../domain/EquipmentLoanRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { CreateEquipmentLoanRequest, MemberDTO } from '@alentapp/shared';

describe('CreateEquipmentLoanUseCase', () => {
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

    const casoDeUso = new CreateEquipmentLoanUseCase(repositorioPrestamosMock, repositorioSociosMock);

    const solicitudMock: CreateEquipmentLoanRequest = {
        member_id: 'socio-123',
        item_name: 'Pelota de Basquet',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debe crear un prestamo exitosamente si el socio es Activo y no es Cadete', async () => {
        const socioValidoMock: MemberDTO = {
            id: 'socio-123', name: 'Mateo Geffroy', dni: '12345678', email: 'mateo@test.com',
            birthdate: '2002-06-01', category: 'Pleno', status: 'Activo', created_at: '2026-01-01'
        };

        vi.mocked(repositorioSociosMock.findById).mockResolvedValueOnce(socioValidoMock);
        vi.mocked(repositorioPrestamosMock.create).mockResolvedValueOnce({
            id: 'prestamo-1', ...solicitudMock, status: 'Loaned', loan_date: '2026-05-18T10:00:00Z', due_date: null, deleted_at: null
        });

        const resultado = await casoDeUso.execute(solicitudMock);

        expect(repositorioSociosMock.findById).toHaveBeenCalledWith('socio-123');
        expect(repositorioPrestamosMock.create).toHaveBeenCalledWith(solicitudMock);
        expect(resultado.id).toBe('prestamo-1');
        expect(resultado.status).toBe('Loaned');
    });

    it('debe lanzar error 400 si el socio no existe en la base de datos', async () => {
        vi.mocked(repositorioSociosMock.findById).mockResolvedValueOnce(null);

        await expect(casoDeUso.execute(solicitudMock)).rejects.toThrow('El socio no existe');
        expect(repositorioPrestamosMock.create).not.toHaveBeenCalled();
    });

    it('debe lanzar error 400 si el socio tiene estado Moroso o Suspendido', async () => {
        const socioMorosoMock = { id: 'socio-123', status: 'Moroso', category: 'Pleno' } as MemberDTO;
        vi.mocked(repositorioSociosMock.findById).mockResolvedValueOnce(socioMorosoMock);

        await expect(casoDeUso.execute(solicitudMock)).rejects.toThrow('El socio no está en estado Activo');
    });

    it('debe lanzar error 400 si el socio tiene categoria Cadete', async () => {
        const socioCadeteMock = { id: 'socio-123', status: 'Activo', category: 'Cadete' } as MemberDTO;
        vi.mocked(repositorioSociosMock.findById).mockResolvedValueOnce(socioCadeteMock);

        await expect(casoDeUso.execute(solicitudMock)).rejects.toThrow('Los socios Cadet no pueden solicitar préstamos');
    });
});