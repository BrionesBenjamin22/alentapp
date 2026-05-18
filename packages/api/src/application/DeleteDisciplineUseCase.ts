import type { DisciplineRepository } from '../domain/DisciplineRepository.js';

export class DeleteDisciplineUseCase {
  constructor(private readonly disciplineRepository: DisciplineRepository) {}

  async execute(id: string): Promise<void> {
    const existingDiscipline = await this.disciplineRepository.findById(id);

    if (!existingDiscipline) {
      throw new Error('La disciplina no existe');
    }

    await this.disciplineRepository.delete(id);
  }
}