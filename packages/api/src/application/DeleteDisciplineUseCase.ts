import { DisciplineRepository } from '../domain/DisciplineRepository.js';

export class DeleteDisciplineUseCase {
  constructor(private readonly disciplineRepo: DisciplineRepository) {}

  async execute(id: string): Promise<void> {
    const existingDiscipline = await this.disciplineRepo.findById(id);
    if (!existingDiscipline) {
      throw new Error('La disciplina no existe');
    }

    await this.disciplineRepo.delete(id);
  }
}
