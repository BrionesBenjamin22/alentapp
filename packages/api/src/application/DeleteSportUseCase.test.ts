import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeleteSportUseCase } from './DeleteSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';

describe('DeleteSportUseCase', () => {
    const mockSportRepo = {
        findById: vi.fn(),
        delete: vi.fn(),
    } as unknown as SportRepository;

    const useCase = new DeleteSportUseCase(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Debe eliminar un deporte exitosamente', async () => {
        const sportId = 'uuid-sport-1';

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

        vi.mocked(mockSportRepo.delete).mockResolvedValueOnce(undefined);

        await useCase.execute(sportId);

        expect(mockSportRepo.findById).toHaveBeenCalledWith(sportId);
        expect(mockSportRepo.delete).toHaveBeenCalledWith(sportId);
    });

    it('2. Debe rechazar si el deporte no existe', async () => {
        const sportId = 'uuid-inexistente';

        vi.mocked(mockSportRepo.findById).mockResolvedValueOnce(null);

        await expect(useCase.execute(sportId)).rejects.toThrow(
            'El deporte no existe'
        );
    });
});