import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { FastifyInstance } from 'fastify';

// Truco para evitar que los constructores de otros repositorios crasheen por la variable de entorno.
// (Ojo: a veces los imports se evalúan antes, por lo que ejecutarlo en Docker es la solución definitiva).
process.env.DATABASE_URL = 'postgres://dummy:dummy@localhost:5432/dummy';

import { buildApp } from '../app.js';
import { CreateEquipmentLoanRequest, UpdateEquipmentLoanRequest } from '@alentapp/shared';

// --- SECCIÓN DE PREPARACIÓN GLOBAL (MOCKS DE INFRAESTRUCTURA) ---

// 1. Mockeamos el Repositorio de Préstamos para no tocar la BD real
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

// 2. Mockeamos el Repositorio de Socios (Necesario para que el UseCase de creación valide si el socio existe)
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

    // Levantamos la aplicación de Fastify completa ANTES de correr los tests
    beforeAll(async () => {
        app = buildApp();
        await app.ready();
    });

    // Cerramos el servidor al terminar para no dejar puertos colgados
    afterAll(async () => {
        await app.close();
    });

    // 1. Test de GET global (Listado)
    it('1. GET /api/v1/equipment-loans debe retornar 200 y el listado', async () => {
        // ARRANGE & ACT: Preparamos la petición HTTP y la inyectamos directo en Fastify
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/equipment-loans'
        });

        // ASSERT: Verificamos el código HTTP y que el body coincida con nuestro Mock
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body[0].id).toBe('loan-1');
        expect(body[0].item_name).toBe('Pelota');
    });

    // 2. Test de POST Exitoso (Creación)
    it('2. POST /api/v1/equipment-loans debe retornar 201 al crear exitosamente', async () => {
        // ARRANGE: Armamos el body de la petición HTTP (Socio válido)
        const payload: CreateEquipmentLoanRequest = {
            member_id: 'socio-valido',
            item_name: 'Raqueta',
        };

        // ACT: Disparamos el POST al endpoint
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload
        });

        // ASSERT: Validamos código 201 (Created) y los datos de respuesta
        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.item_name).toBe('Raqueta');
        expect(body.status).toBe('Loaned');
    });

    // 3. Test de POST Fallido (Validación de negocio: Socio Moroso)
    it('3. POST /api/v1/equipment-loans debe retornar 400 si el socio es Moroso', async () => {
        // ARRANGE: Armamos el body referenciando a un socio moroso
        const payload: CreateEquipmentLoanRequest = {
            member_id: 'socio-invalido',
            item_name: 'Raqueta',
        };

        // ACT: Disparamos el POST
        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/equipment-loans',
            payload
        });

        // ASSERT: Validamos que el Controller haya atrapado el error del UseCase y devuelto un 400
        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El socio no está en estado Activo');
    });

    // 4. Test de PATCH Exitoso (Actualización parcial)
    it('4. PATCH /api/v1/equipment-loans/:id debe retornar 200 al actualizar estado', async () => {
        // ARRANGE: Queremos devolver el préstamo
        const payload: UpdateEquipmentLoanRequest = { status: 'Returned' };

        // ACT: Disparamos el PATCH apuntando a un ID válido
        const response = await app.inject({
            method: 'PATCH',
            url: '/api/v1/equipment-loans/loan-1',
            payload
        });

        // ASSERT: Validamos código 200 (OK)
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.status).toBe('Returned');
    });

    // 5. Test de PATCH Fallido (Transición de máquina de estados inválida)
    it('5. PATCH /api/v1/equipment-loans/:id debe retornar 422 si el préstamo ya es terminal', async () => {
        // ARRANGE: Queremos pasar a 'Loaned' algo que ya devolvimos
        const payload: UpdateEquipmentLoanRequest = { status: 'Loaned' };

        // ACT: Le pegamos al ID que nuestro Mock configuró como 'Returned'
        const response = await app.inject({
            method: 'PATCH',
            url: '/api/v1/equipment-loans/loan-returned',
            payload
        });

        // ASSERT: El Controller mapea el INVALID_TRANSITION a un 422
        expect(response.statusCode).toBe(422);
        const body = JSON.parse(response.payload);
        expect(body.error).toContain('Transición de estado inválida');
    });

    // 6. Test de DELETE Exitoso (Soft Delete)
    it('6. DELETE /api/v1/equipment-loans/:id debe retornar 200 y la fecha de borrado', async () => {
        // ARRANGE & ACT: Inyectamos el método DELETE al endpoint
        const response = await app.inject({
            method: 'DELETE',
            url: '/api/v1/equipment-loans/loan-1'
        });

        // ASSERT: Verificamos que devuelva 200 y que el campo deleted_at venga poblado
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.deleted_at).toBeDefined();
    });
});