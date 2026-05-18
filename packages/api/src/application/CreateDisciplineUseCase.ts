import { CreateDisciplineRequest, DisciplineDTO } from '@alentapp/shared';
import { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { MemberRepository } from '../domain/MemberRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';

export class CreateDisciplineUseCase {
  constructor(
    private readonly disciplineRepo: DisciplineRepository,
    private readonly memberRepo: MemberRepository,
    private readonly disciplineValidator: DisciplineValidator,
  ) {}

  async execute(data: CreateDisciplineRequest): Promise<DisciplineDTO> {
    const member = await this.memberRepo.findById(data.memberId);
    if (!member) {
      throw new Error('El miembro no existe');
    }

    this.disciplineValidator.validateReason(data.reason);
    this.disciplineValidator.validateDateRange(data.startDate, data.endDate);

    return this.disciplineRepo.create({
      ...data,
      reason: data.reason.trim(),
    });
  }
}
