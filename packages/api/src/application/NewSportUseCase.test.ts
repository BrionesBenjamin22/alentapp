import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NewSportUseCase } from './NewSportUseCase.js';
import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { CreateSportRequest } from '@alentapp/shared';

describe('NewSportUseCase', () => {
    const mockSportRepo = {
        create: vi.fn(),
        findByName: vi.fn(),
    } as unknown as SportRepository;

    const mockSportValidator = {
        validateNameIsNotEmpty: vi.fn(),
        validateDescriptionIsNotEmpty: vi.fn(),
        validateMaxCapacityIsPositive: vi.fn(),
        validateAdditionalPriceIsNonNegative: vi.fn(),
        validateNameIsUnique: vi.fn(),
    } as unknown as SportValidator;

    const useCase = new NewSportUseCase(mockSportRepo, mockSportValidator);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Debe crear un deporte exitosamente', async () => {
        const createRequest: CreateSportRequest = {
            name: 'Fútbol',
            description: 'Deporte de equipo',
            maxCapacity: 30,
            additionalPrice: 0,
            isFederated: true,
        };

        vi.mocked(mockSportValidator.validateNameIsUnique).mockResolvedValueOnce(undefined);
        vi.mocked(mockSportRepo.create).mockResolvedValueOnce({
            id: 'uuid-sport-1',
            name: createRequest.name,
            description: createRequest.description,
            maxCapacity: createRequest.maxCapacity,
            additionalPrice: createRequest.additionalPrice ?? 0,
            isFederated: createRequest.isFederated ?? false,
            created_at: '2026-05-31T00:00:00.000Z',
            updated_at: '2026-05-31T00:00:00.000Z',
        });

        const result = await useCase.execute(createRequest);

        expect(mockSportValidator.validateNameIsNotEmpty).toHaveBeenCalledWith('Fútbol');
        expect(mockSportValidator.validateDescriptionIsNotEmpty).toHaveBeenCalledWith('Deporte de equipo');
        expect(mockSportValidator.validateMaxCapacityIsPositive).toHaveBeenCalledWith(30);
        expect(mockSportValidator.validateAdditionalPriceIsNonNegative).toHaveBeenCalledWith(0);
        expect(mockSportValidator.validateNameIsUnique).toHaveBeenCalledWith('Fútbol');
        expect(mockSportRepo.create).toHaveBeenCalledWith(createRequest);
        expect(result.id).toBe('uuid-sport-1');
        expect(result.name).toBe('Fútbol');
    });

    it('2. Debe rechazar nombre vacío', async () => {
        const createRequest: CreateSportRequest = {
            name: '',
            description: 'Deporte de equipo',
            maxCapacity: 30,
            additionalPrice: 0,
            isFederated: false,
        };

        vi.mocked(mockSportValidator.validateNameIsNotEmpty).mockImplementationOnce(() => {
            throw new Error('El nombre del deporte es obligatorio');
        });

        await expect(useCase.execute(createRequest)).rejects.toThrow(
            'El nombre del deporte es obligatorio'
        );
    });

    it('3. Debe rechazar nombre duplicado', async () => {
        const createRequest: CreateSportRequest = {
            name: 'Fútbol',
            description: 'Deporte de equipo',
            maxCapacity: 30,
            additionalPrice: 0,
            isFederated: false,
        };

        vi.mocked(mockSportValidator.validateNameIsUnique).mockRejectedValueOnce(
            new Error('Ya existe un deporte con ese nombre')
        );

        await expect(useCase.execute(createRequest)).rejects.toThrow(
            'Ya existe un deporte con ese nombre'
        );
    });

    it('4. Debe rechazar cupo máximo menor o igual a cero', async () => {
        const createRequest: CreateSportRequest = {
            name: 'Fútbol',
            description: 'Deporte de equipo',
            maxCapacity: 0,
            additionalPrice: 0,
            isFederated: false,
        };

        vi.mocked(mockSportValidator.validateMaxCapacityIsPositive).mockImplementationOnce(() => {
            throw new Error('El cupo máximo debe ser mayor a cero');
        });

        await expect(useCase.execute(createRequest)).rejects.toThrow(
            'El cupo máximo debe ser mayor a cero'
        );
    });

    it('5. Debe rechazar precio adicional negativo', async () => {
        const createRequest: CreateSportRequest = {
            name: 'Fútbol',
            description: 'Deporte de equipo',
            maxCapacity: 30,
            additionalPrice: -10,
            isFederated: false,
        };

        vi.mocked(mockSportValidator.validateAdditionalPriceIsNonNegative).mockImplementationOnce(() => {
            throw new Error('El precio adicional no puede ser negativo');
        });

        await expect(useCase.execute(createRequest)).rejects.toThrow(
            'El precio adicional no puede ser negativo'
        );
    });
});
