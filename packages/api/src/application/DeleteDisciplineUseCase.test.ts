import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DisciplineDTO } from '@alentapp/shared';

import { UpdateDisciplineUseCase } from './UpdateDisciplineUseCase.js';
import type { DisciplineRepository } from '../domain/DisciplineRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';

describe('UpdateDisciplineUseCase', () => {
  let disciplineRepository: DisciplineRepository;
  let validator: DisciplineValidator;

  const validDiscipline: DisciplineDTO = {
    id: 'discipline-1',
    memberId: 'member-1',
    reason: 'Conducta antideportiva',
    startDate: '2026-05-10T10:00:00.000Z',
    endDate: '2026-05-15T10:00:00.000Z',
    isTotalSuspension: true,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  };

  beforeEach(() => {
    disciplineRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    validator = new DisciplineValidator();
  });

  it('debe actualizar una disciplina correctamente', async () => {
    vi.mocked(disciplineRepository.findById).mockResolvedValue(validDiscipline);

    const updatedDiscipline: DisciplineDTO = {
      ...validDiscipline,
      reason: 'Motivo actualizado',
      isTotalSuspension: false,
    };

    vi.mocked(disciplineRepository.update).mockResolvedValue(updatedDiscipline);

    const useCase = new UpdateDisciplineUseCase(disciplineRepository, validator);

    const result = await useCase.execute('discipline-1', {
      reason: 'Motivo actualizado',
      isTotalSuspension: false,
    });

    expect(result).toEqual(updatedDiscipline);
    expect(disciplineRepository.findById).toHaveBeenCalledWith('discipline-1');
    expect(disciplineRepository.update).toHaveBeenCalledWith('discipline-1', {
      reason: 'Motivo actualizado',
      isTotalSuspension: false,
    });
  });

  it('debe fallar si la disciplina no existe', async () => {
    vi.mocked(disciplineRepository.findById).mockResolvedValue(null);

    const useCase = new UpdateDisciplineUseCase(disciplineRepository, validator);

    await expect(
      useCase.execute('discipline-inexistente', {
        reason: 'Motivo actualizado',
      }),
    ).rejects.toThrow('La disciplina no existe');

    expect(disciplineRepository.update).not.toHaveBeenCalled();
  });

  it('debe fallar si intenta modificar memberId', async () => {
    const useCase = new UpdateDisciplineUseCase(disciplineRepository, validator);

    await expect(
      useCase.execute('discipline-1', {
        memberId: 'otro-member',
        reason: 'Motivo actualizado',
      }),
    ).rejects.toThrow('No se puede modificar el socio asociado a la disciplina');

    expect(disciplineRepository.findById).not.toHaveBeenCalled();
    expect(disciplineRepository.update).not.toHaveBeenCalled();
  });

  it('debe fallar si las fechas resultantes son inválidas', async () => {
    vi.mocked(disciplineRepository.findById).mockResolvedValue(validDiscipline);

    const useCase = new UpdateDisciplineUseCase(disciplineRepository, validator);

    await expect(
      useCase.execute('discipline-1', {
        startDate: '2026-05-20T10:00:00.000Z',
        endDate: '2026-05-15T10:00:00.000Z',
      }),
    ).rejects.toThrow('La fecha de fin debe ser posterior a la de inicio');

    expect(disciplineRepository.update).not.toHaveBeenCalled();
  });
});