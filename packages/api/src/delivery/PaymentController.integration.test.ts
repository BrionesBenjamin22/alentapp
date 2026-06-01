import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { CreatePaymentRequest, PaymentDTO, UpdatePaymentRequest } from '@alentapp/shared';

vi.hoisted(() => {
    process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
});

const basePayment: PaymentDTO = {
    id: 'payment-1',
    amount: 1500,
    month: 5,
    year: 2026,
    status: 'Pending',
    due_date: '2026-05-10',
    payment_date: null,
    member_id: 'member-1',
    created_at: '2026-05-02T00:00:00.000Z',
    updated_at: '2026-05-02T00:00:00.000Z',
};

vi.mock('../infrastructure/PostgresMemberRepository.js', () => {
    return {
        PostgresMemberRepository: class {
            async findById(id: string) {
                return id === 'member-1'
                    ? {
                        id: 'member-1',
                        dni: '12345678',
                        name: 'Socio Existente',
                        email: 'socio@test.com',
                        birthdate: '1990-01-01',
                        category: 'Pleno',
                        status: 'Activo',
                        created_at: '2026-04-20T00:00:00.000Z',
                    }
                    : null;
            }

            async findByDni() {
                return null;
            }

            async findAll() {
                return [];
            }

            async create(data: any) {
                return { id: 'member-2', ...data, status: 'Activo' };
            }

            async update(id: string, data: any) {
                return { id, ...data };
            }

            async delete() {
                return;
            }
        },
    };
});

vi.mock('../infrastructure/PostgresPaymentRepository.js', () => {
    return {
        PostgresPaymentRepository: class {
            async findAll() {
                return [basePayment];
            }

            async findById(id: string) {
                if (id === 'payment-missing') {
                    return null;
                }

                if (id === 'payment-canceled') {
                    return { ...basePayment, id, status: 'Canceled' };
                }

                return { ...basePayment, id };
            }

            async create(data: CreatePaymentRequest) {
                return {
                    ...basePayment,
                    id: 'payment-created',
                    ...data,
                    status: data.status ?? 'Pending',
                    payment_date: data.payment_date ?? null,
                };
            }

            async update(id: string, data: UpdatePaymentRequest) {
                return {
                    ...basePayment,
                    id,
                    ...data,
                    updated_at: '2026-05-03T00:00:00.000Z',
                };
            }

            async cancel(id: string) {
                return {
                    ...basePayment,
                    id,
                    status: 'Canceled',
                    updated_at: '2026-05-03T00:00:00.000Z',
                };
            }
        },
    };
});

describe('Payment API Integration Tests', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        const { buildApp } = await import('../app.js');
        app = buildApp();
        await app.ready();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET /api/v1/payments debe retornar el listado de pagos', async () => {
        const response = await app.inject({
            method: 'GET',
            url: '/api/v1/payments',
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data).toHaveLength(1);
        expect(body.data[0].id).toBe('payment-1');
    });

    it('POST /api/v1/payments debe crear un pago pendiente', async () => {
        const payload: CreatePaymentRequest = {
            amount: 1500,
            month: 5,
            year: 2026,
            due_date: '2026-05-10',
            member_id: 'member-1',
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/payments',
            payload,
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.data.id).toBe('payment-created');
        expect(body.data.status).toBe('Pending');
        expect(body.data.payment_date).toBeNull();
    });

    it('POST /api/v1/payments debe retornar 404 si el socio no existe', async () => {
        const payload: CreatePaymentRequest = {
            amount: 1500,
            month: 5,
            year: 2026,
            due_date: '2026-05-10',
            member_id: 'member-missing',
        };

        const response = await app.inject({
            method: 'POST',
            url: '/api/v1/payments',
            payload,
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El socio asociado al pago no existe');
    });

    it('PUT /api/v1/payments/:id debe actualizar un pago existente', async () => {
        const payload: UpdatePaymentRequest = {
            amount: 2000,
            month: 6,
        };

        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/payments/payment-1',
            payload,
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.payload);
        expect(body.data.id).toBe('payment-1');
        expect(body.data.amount).toBe(2000);
        expect(body.data.month).toBe(6);
    });

    it('PUT /api/v1/payments/:id debe retornar 404 si el pago no existe', async () => {
        const response = await app.inject({
            method: 'PUT',
            url: '/api/v1/payments/payment-missing',
            payload: { amount: 2000 },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El pago no existe');
    });

    it('PATCH /api/v1/payments/:id/cancel debe rechazar un pago ya cancelado', async () => {
        const response = await app.inject({
            method: 'PATCH',
            url: '/api/v1/payments/payment-canceled/cancel',
        });

        expect(response.statusCode).toBe(409);
        const body = JSON.parse(response.payload);
        expect(body.error).toBe('El pago ya se encuentra cancelado');
    });
});
