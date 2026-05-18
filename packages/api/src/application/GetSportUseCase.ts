import { SportRepository } from '../domain/SportRepository.js';
import { SportDTO } from '@alentapp/shared';

export class GetSportUseCase {
    constructor(private readonly sportRepo: SportRepository) {}

    async execute(id: string): Promise<SportDTO> {
        const sport = await this.sportRepo.findById(id);
        
        if (!sport) {
            throw new Error('El deporte no existe');
        }
        
        return sport;
    }
}