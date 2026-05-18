import { SportRepository } from "../domain/SportRepository.js";

export class DeleteSportUseCase {
    constructor(private readonly sportRepo: SportRepository) {}

    async execute(id: string): Promise<void> {
    // 1. Validar existencia
    const existingSport = await this.sportRepo.findById(id);
    if (!existingSport) {
        throw new Error('El deporte no existe');
    }

    await this.sportRepo.delete(id);
    }
}