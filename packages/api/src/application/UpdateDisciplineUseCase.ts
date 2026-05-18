import { DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';

export class UpdateDisciplineUseCase {
  constructor(
    private readonly disciplineRepo: DisciplineRepository,
    private readonly disciplineValidator: DisciplineValidator,
  ) {}

  async execute(id: string, data: UpdateDisciplineRequest & { memberId?: string }): Promise<DisciplineDTO> {
    if (data.memberId) {
      throw new Error('No se puede modificar el socio asociado a la disciplina');
    }

    const existingDiscipline = await this.disciplineRepo.findById(id);
    if (!existingDiscipline) {
      throw new Error('La disciplina no existe');
    }

    const finalReason = data.reason ?? existingDiscipline.reason;
    const finalStartDate = data.startDate ?? existingDiscipline.startDate;
    const finalEndDate = data.endDate ?? existingDiscipline.endDate;

    this.disciplineValidator.validateReason(finalReason);
    this.disciplineValidator.validateDateRange(finalStartDate, finalEndDate);

    return this.disciplineRepo.update(id, {
      ...data,
      reason: data.reason ? data.reason.trim() : undefined,
    });
  }
}
