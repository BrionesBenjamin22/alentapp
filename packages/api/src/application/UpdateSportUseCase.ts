import { SportRepository } from '../domain/SportRepository.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { SportDTO, UpdateSportRequest } from '@alentapp/shared';

export class UpdateSportUseCase {
    constructor(
        private readonly sportRepo: SportRepository,
        private readonly sportValidator: SportValidator
    ) {}

    async execute(id: string, data: UpdateSportRequest): Promise<SportDTO> {
        // Validar existencia del deporte
        const existingSport = await this.sportRepo.findById(id);
        if (!existingSport) {
            throw new Error('El deporte no existe');
        }

        // Rechazar intento de modificar campos no permitidos
        if (Object.keys(data).some(key => !['description', 'maxCapacity'].includes(key))) {
            throw new Error('Solo se permite modificar descripción y cupo máximo');
        }

        // Validar descripción si se envía
        if (data.description !== undefined) {
            this.sportValidator.validateDescriptionIsNotEmpty(data.description);
        }

        // Validar maxCapacity si se envía
        if (data.maxCapacity !== undefined) {
            this.sportValidator.validateMaxCapacityIsPositive(data.maxCapacity);
        }

        return this.sportRepo.update(id, data);
    }
}