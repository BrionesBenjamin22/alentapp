import { CreateDisciplineRequest, DisciplineDTO, UpdateDisciplineRequest } from '@alentapp/shared';

export interface DisciplineRepository {
  create(discipline: CreateDisciplineRequest): Promise<DisciplineDTO>;
  findById(id: string): Promise<DisciplineDTO | null>;
  findAll(): Promise<DisciplineDTO[]>;
  update(id: string, data: UpdateDisciplineRequest): Promise<DisciplineDTO>;
  delete(id: string): Promise<void>;
}
