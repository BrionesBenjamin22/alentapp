import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DisciplineDTO } from '@alentapp/shared';

import { CreateDisciplineUseCase } from './CreateDisciplineUseCase.js';
import type { DisciplineRepository } from '../domain/DisciplineRepository.js';
import type { MemberRepository } from '../domain/MemberRepository.js';
import { DisciplineValidator } from '../domain/services/DisciplineValidator.js';

describe('CreateDisciplineUseCase', () => {
  let disciplineRepository: DisciplineRepository;
  let memberRepository: MemberRepository;
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

  const validMember = {
    id: 'member-1',
    dni: '12345678',
    name: 'Socio Test',
    email: 'socio@test.com',
    birthdate: '2000-01-01',
    category: 'Pleno',
    status: 'Activo',
    created_at: '2026-05-01T10:00:00.000Z',
  };

  beforeEach(() => {
    disciplineRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    memberRepository = {
      create: vi.fn(),
      findAll: vi.fn(),
      findById: vi.fn(),
      findByDni: vi.fn(),
      findByEmail: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as MemberRepository;

    validator = new DisciplineValidator();
  });

  it('debe crear una disciplina correctamente cuando los datos son válidos', async () => {
    vi.mocked(memberRepository.findById).mockResolvedValue(validMember as any);
    vi.mocked(disciplineRepository.create).mockResolvedValue(validDiscipline);

    const useCase = new CreateDisciplineUseCase(
      disciplineRepository,
      memberRepository,
      validator,
    );

    const result = await useCase.execute({
      memberId: 'member-1',
      reason: 'Conducta antideportiva',
      startDate: '2026-05-10T10:00:00.000Z',
      endDate: '2026-05-15T10:00:00.000Z',
      isTotalSuspension: true,
    });

    expect(result).toEqual(validDiscipline);
    expect(memberRepository.findById).toHaveBeenCalledWith('member-1');
    expect(disciplineRepository.create).toHaveBeenCalledWith({
      memberId: 'member-1',
      reason: 'Conducta antideportiva',
      startDate: '2026-05-10T10:00:00.000Z',
      endDate: '2026-05-15T10:00:00.000Z',
      isTotalSuspension: true,
    });
  });

  it('debe fallar si el socio no existe', async () => {
    vi.mocked(memberRepository.findById).mockResolvedValue(null);

    const useCase = new CreateDisciplineUseCase(
      disciplineRepository,
      memberRepository,
      validator,
    );

    await expect(
      useCase.execute({
        memberId: 'member-inexistente',
        reason: 'Conducta antideportiva',
        startDate: '2026-05-10T10:00:00.000Z',
        endDate: '2026-05-15T10:00:00.000Z',
        isTotalSuspension: true,
      }),
    ).rejects.toThrow('El miembro no existe');

    expect(disciplineRepository.create).not.toHaveBeenCalled();
  });

  it('debe fallar si el motivo está vacío', async () => {
    vi.mocked(memberRepository.findById).mockResolvedValue(validMember as any);

    const useCase = new CreateDisciplineUseCase(
      disciplineRepository,
      memberRepository,
      validator,
    );

    await expect(
      useCase.execute({
        memberId: 'member-1',
        reason: '   ',
        startDate: '2026-05-10T10:00:00.000Z',
        endDate: '2026-05-15T10:00:00.000Z',
        isTotalSuspension: true,
      }),
    ).rejects.toThrow('El motivo de la sanción es obligatorio');

    expect(disciplineRepository.create).not.toHaveBeenCalled();
  });

  it('debe fallar si la fecha de fin no es posterior a la fecha de inicio', async () => {
    vi.mocked(memberRepository.findById).mockResolvedValue(validMember as any);

    const useCase = new CreateDisciplineUseCase(
      disciplineRepository,
      memberRepository,
      validator,
    );

    await expect(
      useCase.execute({
        memberId: 'member-1',
        reason: 'Conducta antideportiva',
        startDate: '2026-05-15T10:00:00.000Z',
        endDate: '2026-05-10T10:00:00.000Z',
        isTotalSuspension: true,
      }),
    ).rejects.toThrow('La fecha de fin debe ser posterior a la de inicio');

    expect(disciplineRepository.create).not.toHaveBeenCalled();
  });
});