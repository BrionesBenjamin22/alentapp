import { SportRepository } from "../domain/SportRepository.js";
import { SportValidator } from "../domain/services/SportValidator.js";
import { CreateSportRequest, SportDTO } from "../../../shared/index.js";

export class NewSportUseCase {
    constructor(
        private sportRepository: SportRepository,
        private sportValidator: SportValidator
    ) {}

    async execute(request: CreateSportRequest): Promise<SportDTO> {
        // Validaciones
        this.sportValidator.validateNameIsNotEmpty(request.name);
        this.sportValidator.validateDescriptionIsNotEmpty(request.description);
        this.sportValidator.validateMaxCapacityIsPositive(request.maxCapacity);
        if (request.additionalPrice !== undefined) {
            this.sportValidator.validateAdditionalPriceIsNonNegative(request.additionalPrice);
        }
        await this.sportValidator.validateNameIsUnique(request.name);

        // Creación del deporte
        const newSport = await this.sportRepository.create(request);
        return newSport;
    }
}