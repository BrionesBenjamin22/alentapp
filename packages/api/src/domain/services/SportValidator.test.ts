import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SportValidator } from './SportValidator.js';
import { SportRepository } from '../SportRepository.js';

describe('SportValidator', () => {
    const mockSportRepo = {
        findByName: vi.fn(),
    } as unknown as SportRepository;

    const validator = new SportValidator(mockSportRepo);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('1. Debe validar que el nombre no esté vacío', () => {
        expect(() => validator.validateNameIsNotEmpty('')).toThrow(
            'El nombre del deporte es obligatorio'
        );
        expect(() => validator.validateNameIsNotEmpty('   ')).toThrow(
            'El nombre del deporte es obligatorio'
        );
    });

    it('2. Debe validar que la descripción no esté vacía', () => {
        expect(() => validator.validateDescriptionIsNotEmpty('')).toThrow(
            'La descripción del deporte es obligatoria'
        );
    });

    it('3. Debe validar que el cupo máximo sea positivo', () => {
        expect(() => validator.validateMaxCapacityIsPositive(0)).toThrow(
            'El cupo máximo debe ser mayor a cero'
        );
        expect(() => validator.validateMaxCapacityIsPositive(-5)).toThrow(
            'El cupo máximo debe ser mayor a cero'
        );
    });

    it('4. Debe validar que el precio no sea negativo', () => {
        expect(() => validator.validateAdditionalPriceIsNonNegative(-10)).toThrow(
            'El precio adicional no puede ser negativo'
        );
    });

    it('5. Debe validar que el nombre sea único', async () => {
        vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce(null);
        
        // No debe lanzar error si no existe
        await expect(validator.validateNameIsUnique('Fútbol')).resolves.toBeUndefined();
    });

    it('6. Debe rechazar nombre duplicado', async () => {
        vi.mocked(mockSportRepo.findByName).mockResolvedValueOnce({
            id: 'uuid-1',
            name: 'Fútbol',
            description: 'Deporte de equipo',
            maxCapacity: 30,
            additionalPrice: 0,
            isFederated: false,
            created_at: '2026-05-31T00:00:00.000Z',
            updated_at: '2026-05-31T00:00:00.000Z',
        });

        await expect(validator.validateNameIsUnique('Fútbol')).rejects.toThrow(
            'Ya existe un deporte con ese nombre'
        );
    });
});