import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateSportUseCase } from './UpdateSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { UpdateSportRequest } from '@alentapp/shared';

describe('UpdateSportUseCase', () => {
    const mockSportRepo = {
        findById: vi.fn(),
        update: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validateDescriptionIsNotEmpty: vi.fn(),
        validateMaxCapacityIsPositive: vi.fn(),
    } as unknown as SportValidator;

    const useCase = new UpdateSportUseCase(mockSportRepo, mockSportValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Debe actualizar descripción exitosamente', async () => {
        const sportId = 'uuid-sport-1';
        const updateRequest: UpdateSportRequest = {
            description: 'Nueva descripción',
        };

        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce({
            id: sportId,
            name: 'Fútbol',
            description: 'Descripción antigua',
            maxCapacity: 30,
            additionalPrice: 0,
            isFederated: false,
            created_at: '2026-05-31T00:00:00.000Z',
            updated_at: '2026-05-31T00:00:00.000Z',
        });

        vi.mocked(mockSportRepo.update).mockResolvedValueOnce({
            id: sportId,
            name: 'Fútbol',
            description: 'Nueva descripción',
            maxCapacity: 30,
            additionalPrice: 0,
            isFederated: false,
            created_at: '2026-05-31T00:00:00.000Z',
            updated_at: '2026-05-31T10:00:00.000Z',
        });

        const result = await useCase.execute(sportId, updateRequest);

        expect(mockSportValidator.validateDescriptionIsNotEmpty).toHaveBeenCalledWith('Nueva descripción');
        expect(mockSportRepo.update).toHaveBeenCalledWith(sportId, updateRequest);
        expect(result.description).toBe('Nueva descripción');
    });

    it('2. Debe actualizar cupo máximo exitosamente', async () => {
        const sportId = 'uuid-sport-1';
        const updateRequest: UpdateSportRequest = {
            maxCapacity: 50,
        };

        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce({
            id: sportId,
            name: 'Fútbol',
            description: 'Deporte de equipo',
            maxCapacity: 30,
            additionalPrice: 0,
            isFederated: false,
            created_at: '2026-05-31T00:00:00.000Z',
            updated_at: '2026-05-31T00:00:00.000Z',
        });

        vi.mocked(mockSportRepo.update).mockResolvedValueOnce({
            id: sportId,
            name: 'Fútbol',
            description: 'Deporte de equipo',
            maxCapacity: 50,
            additionalPrice: 0,
            isFederated: false,
            created_at: '2026-05-31T00:00:00.000Z',
            updated_at: '2026-05-31T10:00:00.000Z',
        });

        const result = await useCase.execute(sportId, updateRequest);

        expect(mockSportValidator.validateMaxCapacityIsPositive).toHaveBeenCalledWith(50);
        expect(mockSportRepo.update).toHaveBeenCalledWith(sportId, updateRequest);
        expect(result.maxCapacity).toBe(50);
    });

    it('3. Debe rechazar si el deporte no existe', async () => {
        const sportId = 'uuid-inexistente';
        const updateRequest: UpdateSportRequest = {
            description: 'Nueva descripción',
        };

        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute(sportId, updateRequest)).rejects.toThrow(
            'El deporte no existe'
        );
    });

    it('4. Debe rechazar intento de cambiar nombre', async () => {
        const sportId = 'uuid-sport-1';
        const updateRequest: any = {
            name: 'Nuevo nombre',
            description: 'Nueva descripción',
        };

        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce({
            id: sportId,
            name: 'Fútbol',
            description: 'Deporte de equipo',
            maxCapacity: 30,
            additionalPrice: 0,
            isFederated: false,
            created_at: '2026-05-31T00:00:00.000Z',
            updated_at: '2026-05-31T00:00:00.000Z',
        });

        await expect(useCase.execute(sportId, updateRequest)).rejects.toThrow(
            'Solo se permite modificar descripción y cupo máximo'
        );
    });
});