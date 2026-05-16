import { SportRepository } from "../SportRepository.js";

export class SportValidator {
    constructor(private sportRepository: SportRepository) {}

    async validateNameIsUnique(name: string): Promise<void> {
        const existingSport = await this.sportRepository.findByName(name);
        if (existingSport) {
            throw new Error("Ya existe un deporte con ese nombre");
        }
    }

    validateNameIsNotEmpty(name: string): void {
        if (!name || name.trim() === "") {
            throw new Error("El nombre del deporte es obligatorio");
        }
    }

    validateDescriptionIsNotEmpty(description: string): void {
        if (!description || description.trim() === "") {
            throw new Error("La descripción del deporte es obligatoria");
        }
    }

    validateMaxCapacityIsPositive(maxCapacity: number): void {
        if (!Number.isInteger(maxCapacity) || maxCapacity <= 0) {
            throw new Error("El cupo máximo debe ser mayor a cero");
        }
    }

    validateAdditionalPriceIsNonNegative(price: number): void {
        if (typeof price !== 'number' || price < 0) {
            throw new Error("El precio adicional no puede ser negativo");
        }
    }

}