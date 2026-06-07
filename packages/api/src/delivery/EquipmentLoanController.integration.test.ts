import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';

vi.hoisted(() => {
    process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
});

import { buildApp } from '../app.js';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

vi.mock('../infrastructure/PostgresEquipmentLoanRepository.js', () => {
    return {
        PostgresEquipmentLoanRepository: class {
            async getAll() { return [{ id: 'loan-1', item_name: 'Pelota', status: 'Loaned' }]; }
            async getById(id: string) {
                if (id === 'loan-1') return { id: 'loan-1', item_name: 'Pelota', status: 'Loaned', loan_date: '2026-05-18T10:00:00.000Z' };
                if (id === 'loan-returned') return { id: 'loan-returned', status: 'Returned' };
                return null;
            }
            async create(data: any) { return { id: 'loan-new', ...data, status: 'Loaned' }; }
            async update(id: string, data: any) { return { id, ...data }; }
            async delete(id: string) { return { id, status: 'Loaned', deleted_at: new Date().toISOString() }; }
        }
    };
});

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                if (id === 'socio-valido') return { id: 'socio-valido', status: 'Activo', category: 'Pleno' };
                if (id === 'socio-invalido') return { id: 'socio-invalido', status: 'Moroso', category: 'Pleno' };
                return null;
            }
            async findAll() { return []; }
            async findByDni() { return null; }
            async create() { return {}; }
            async update() { return {}; }
            async delete() { return; }
        }
    };
});

describe('EquipmentLoan API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('1. GET /api/v1/equipment-loans debe retornar 200 y el listado', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/equipment-loans'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body[0].id).toBe('loan-1');
        expect(body[0].item_name).toBe('Pelota');
    });

    it('2. POST /api/v1/equipment-loans debe retornar 201 al crear exitosamente', async () => {
        const payload: CreateEquipmentLoanRequest = {
            member_id: 'socio-valido',
            item_name: 'Raqueta',
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.item_name).toBe('Raqueta');
        expect(body.status).toBe('Loaned');
    });

    it('3. POST /api/v1/equipment-loans debe retornar 400 si el socio es Moroso', async () => {
        const payload: CreateEquipmentLoanRequest = {
            member_id: 'socio-invalido',
            item_name: 'Raqueta',
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El socio no está en estado Activo');
    });

    it('4. PATCH /api/v1/equipment-loans/:id debe retornar 200 al actualizar estado', async () => {
        const payload: UpdateEquipmentLoanRequest = { status: 'Returned' };

        const response = await app.inject({
            method: 'PATCH',
            url: '/api/v1/equipment-loans/loan-1',
            payload
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('Returned');
    });

    it('5. PATCH /api/v1/equipment-loans/:id debe retornar 422 si el préstamo ya es terminal', async () => {
        const payload: UpdateEquipmentLoanRequest = { status: 'Loaned' };

        const response = await app.inject({
            method: 'PATCH',
            url: '/api/v1/equipment-loans/loan-returned',
            payload
        });

        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.payload);
        expect(body.error).toContain('Transición de estado inválida');
    });

    it('6. DELETE /api/v1/equipment-loans/:id debe retornar 200 y la fecha de borrado', async () => {
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/equipment-loans/loan-1'
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.deleted_at).toBeDefined();
    });
});