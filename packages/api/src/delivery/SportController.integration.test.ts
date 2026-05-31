import 'dotenv/config';
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import { SportController } from './SportController.js';
import { NewSportUseCase } from '../application/NewSportUseCase.js';
import { GetSportsUseCase } from '../application/GetSportsUseCase.js';
import { GetSportUseCase } from '../application/GetSportUseCase.js';
import { UpdateSportUseCase } from '../application/UpdateSportUseCase.js';
import { DeleteSportUseCase } from '../application/DeleteSportUseCase.js';
import { SportValidator } from '../domain/services/SportValidator.js';
import { CreateSportRequest, UpdateSportRequest } from '@alentapp/shared';

// Mock SOLO de Sport
vi.mock('../infrastructure/PostgresSportRepository.js', () => {
    return {
        PostgresSportRepository: class {
            async findAll() { 
                return [{
                    id: '1',
                    name: 'Fútbol',
                    description: 'Deporte de equipo',
                    maxCapacity: 30,
                    additionalPrice: 0,
                    isFederated: false,
                    created_at: '2026-05-31T00:00:00.000Z',
                    updated_at: '2026-05-31T00:00:00.000Z',
                }];
            }
            async findById(id: string) {
                return id === '1' ? {
                    id: '1',
                    name: 'Fútbol',
                    description: 'Deporte de equipo',
                    maxCapacity: 30,
                    additionalPrice: 0,
                    isFederated: false,
                    created_at: '2026-05-31T00:00:00.000Z',
                    updated_at: '2026-05-31T00:00:00.000Z',
                } : null;
            }
            async findByName(name: string) {
                return name === 'Fútbol' ? {
                    id: '1',
                    name: 'Fútbol',
                    description: 'Deporte de equipo',
                    maxCapacity: 30,
                    additionalPrice: 0,
                    isFederated: false,
                    created_at: '2026-05-31T00:00:00.000Z',
                    updated_at: '2026-05-31T00:00:00.000Z',
                } : null;
            }
            async create(data: any) {
                return {
                    id: '2',
                    ...data,
                    created_at: '2026-05-31T00:00:00.000Z',
                    updated_at: '2026-05-31T00:00:00.000Z',
                };
            }
            async update(id: string, data: any) {
                return {
                    id,
                    name: 'Fútbol',
                    description: data.description || 'Deporte de equipo',
                    maxCapacity: data.maxCapacity || 30,
                    additionalPrice: 0,
                    isFederated: false,
                    created_at: '2026-05-31T00:00:00.000Z',
                    updated_at: '2026-05-31T10:00:00.000Z',
                };
            }
            async delete(id: string) { return; }
        }
    };
});

describe('Sport API Integration Tests', () => {
    let app: FastifyInstance;
    let sportController: SportController;

    beforeAll(async () => {
        // Crear Fastify sin buildApp()
        app = Fastify();
        await app.register(fastifyCors);

        // Importar repositorio mockeado
        const { PostgresSportRepository } = await import('../infrastructure/PostgresSportRepository.js');
        const sportRepo = new PostgresSportRepository();
        
        // Crear instancias de use cases solo para Sport
        const newSportUseCase = new NewSportUseCase(sportRepo, new SportValidator(sportRepo));
        const getSportsUseCase = new GetSportsUseCase(sportRepo);
        const getSportUseCase = new GetSportUseCase(sportRepo);
        const updateSportUseCase = new UpdateSportUseCase(sportRepo, new SportValidator(sportRepo));
        const deleteSportUseCase = new DeleteSportUseCase(sportRepo);

        // Crear controller
        sportController = new SportController(
            newSportUseCase,
            getSportsUseCase,
            getSportUseCase,
            updateSportUseCase,
            deleteSportUseCase
        );

        app.post('/api/v1/sports', (req, reply) => sportController.create(req, reply));
        app.put<{ Params: { id: string } }>('/api/v1/sports/:id', (req, reply) => sportController.update(req, reply));
        app.delete<{ Params: { id: string } }>('/api/v1/sports/:id', (req, reply) => sportController.delete(req, reply));

        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('POST /api/v1/sports', () => {
        it('1. Debe crear un deporte con código 201', async () => {
            const payload: CreateSportRequest = {
                name: 'Tenis',
                description: 'Deporte de raqueta',
                maxCapacity: 20,
                additionalPrice: 50,
                isFederated: true,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload,
            });

            expect(response.statusCode).toBe(201);
            const body = JSON.parse(response.payload);
            expect(body.id || body.data?.id).toBeDefined();
            expect(body.name || body.data?.name).toBe('Tenis');
        });

        it('2. Debe rechazar nombre duplicado con 409', async () => {
            const payload: CreateSportRequest = {
                name: 'Fútbol',
                description: 'Deporte de equipo',
                maxCapacity: 30,
                additionalPrice: 0,
                isFederated: false,
            };

            const response = await app.inject({
                method: 'POST',
                url: '/api/v1/sports',
                payload,
            });

            expect(response.statusCode).toBe(409);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('Ya existe un deporte');
        });
    });

    describe('PUT /api/v1/sports/:id', () => {
        it('3. Debe actualizar un deporte con código 200', async () => {
            const payload: UpdateSportRequest = {
                description: 'Descripción actualizada',
                maxCapacity: 40,
            };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/sports/1',
                payload,
            });

            expect(response.statusCode).toBe(200);
            const body = JSON.parse(response.payload);
            expect(body.data?.description || body.description).toBe('Descripción actualizada');
        });

        it('4. Debe retornar 404 si el deporte no existe', async () => {
            const payload: UpdateSportRequest = {
                description: 'Nueva descripción',
            };

            const response = await app.inject({
                method: 'PUT',
                url: '/api/v1/sports/inexistente',
                payload,
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('no existe');
        });
    });

    describe('DELETE /api/v1/sports/:id', () => {
        it('5. Debe eliminar un deporte con código 204', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/1',
            });

            expect(response.statusCode).toBe(204);
        });

        it('6. Debe retornar 404 si intenta eliminar un deporte inexistente', async () => {
            const response = await app.inject({
                method: 'DELETE',
                url: '/api/v1/sports/inexistente',
            });

            expect(response.statusCode).toBe(404);
            const body = JSON.parse(response.payload);
            expect(body.error).toContain('no existe');
        });
    });
});