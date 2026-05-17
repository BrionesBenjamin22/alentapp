import { DisciplineDTO } from '@alentapp/shared';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';

export class GetDisciplinesUseCase {
  constructor(private readonly disciplineRepo: DisciplineRepository) {}

  async execute(): Promise<DisciplineDTO[]> {
    return this.disciplineRepo.findAll();
  }
}
