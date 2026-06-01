import Fastify from 'fastify';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DisciplineController } from './DisciplineController.js';

describe('DisciplineController - Integration Tests', () => {
  let app: ReturnType<typeof Fastify>;

  const discipline = {
    id: 'discipline-1',
    memberId: 'member-1',
    reason: 'Conducta antideportiva',
    startDate: '2026-05-10T10:00:00.000Z',
    endDate: '2026-05-15T10:00:00.000Z',
    isTotalSuspension: true,
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  };

  const createUseCase = { execute: vi.fn() };
  const getUseCase = { execute: vi.fn() };
  const updateUseCase = { execute: vi.fn() };
  const deleteUseCase = { execute: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();

    app = Fastify();

    const controller = new DisciplineController(
      createUseCase as any,
      getUseCase as any,
      updateUseCase as any,
      deleteUseCase as any,
    );

    app.get('/api/v1/disciplines', controller.getAll.bind(controller));
    app.post('/api/v1/disciplines', controller.create.bind(controller));
    app.put('/api/v1/disciplines/:id', controller.update.bind(controller));
    app.delete('/api/v1/disciplines/:id', controller.delete.bind(controller));
  });

  it('POST /api/v1/disciplines debe devolver 201 si la disciplina es válida', async () => {
    createUseCase.execute.mockResolvedValue(discipline);

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/disciplines',
      payload: {
        memberId: 'member-1',
        reason: 'Conducta antideportiva',
        startDate: '2026-05-10T10:00:00.000Z',
        endDate: '2026-05-15T10:00:00.000Z',
        isTotalSuspension: true,
      },
    });

    expect(response.statusCode).toBe(201);

    const body = JSON.parse(response.payload);
    expect(body.data).toEqual(discipline);
    expect(createUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('POST /api/v1/disciplines debe devolver 400 si las fechas son inválidas', async () => {
    createUseCase.execute.mockRejectedValue(
      new Error('La fecha de fin debe ser posterior a la de inicio'),
    );

    const response = await app.inject({
      method: 'POST',
      url: '/api/v1/disciplines',
      payload: {
        memberId: 'member-1',
        reason: 'Conducta antideportiva',
        startDate: '2026-05-15T10:00:00.000Z',
        endDate: '2026-05-10T10:00:00.000Z',
        isTotalSuspension: true,
      },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.payload);
    expect(body.error).toBe('La fecha de fin debe ser posterior a la de inicio');
  });

  it('PUT /api/v1/disciplines/:id debe devolver 200 si la modificación es válida', async () => {
    const updatedDiscipline = {
      ...discipline,
      reason: 'Motivo actualizado',
      isTotalSuspension: false,
    };

    updateUseCase.execute.mockResolvedValue(updatedDiscipline);

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/disciplines/discipline-1',
      payload: {
        reason: 'Motivo actualizado',
        isTotalSuspension: false,
      },
    });

    expect(response.statusCode).toBe(200);

    const body = JSON.parse(response.payload);
    expect(body.data).toEqual(updatedDiscipline);
    expect(updateUseCase.execute).toHaveBeenCalledWith('discipline-1', {
      reason: 'Motivo actualizado',
      isTotalSuspension: false,
    });
  });

  it('PUT /api/v1/disciplines/:id debe devolver 400 si intenta modificar memberId', async () => {
    updateUseCase.execute.mockRejectedValue(
      new Error('No se puede modificar el socio asociado a la disciplina'),
    );

    const response = await app.inject({
      method: 'PUT',
      url: '/api/v1/disciplines/discipline-1',
      payload: {
        memberId: 'otro-member',
      },
    });

    expect(response.statusCode).toBe(400);

    const body = JSON.parse(response.payload);
    expect(body.error).toBe('No se puede modificar el socio asociado a la disciplina');
  });

  it('DELETE /api/v1/disciplines/:id debe devolver 204 si la disciplina existe', async () => {
    deleteUseCase.execute.mockResolvedValue(undefined);

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/disciplines/discipline-1',
    });

    expect(response.statusCode).toBe(204);
    expect(response.payload).toBe('');
    expect(deleteUseCase.execute).toHaveBeenCalledWith('discipline-1');
  });

  it('DELETE /api/v1/disciplines/:id debe devolver 404 si la disciplina no existe', async () => {
    deleteUseCase.execute.mockRejectedValue(new Error('La disciplina no existe'));

    const response = await app.inject({
      method: 'DELETE',
      url: '/api/v1/disciplines/discipline-inexistente',
    });

    expect(response.statusCode).toBe(404);

    const body = JSON.parse(response.payload);
    expect(body.error).toBe('La disciplina no existe');
  });
});