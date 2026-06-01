import { test, expect } from '@playwright/test';

test.describe('Payments E2E (UI Integration)', () => {
  test.beforeEach(async ({ page }) => {
    const mockMembers = [
      {
        id: 'member-1',
        dni: '22333444',
        name: 'Socio Pago Playwright',
        email: 'pago@playwright.dev',
        birthdate: '1990-01-01',
        category: 'Pleno',
        status: 'Activo',
        created_at: new Date().toISOString(),
      },
    ];

    const mockPayments = [
      {
        id: 'payment-1',
        amount: 1500,
        month: 5,
        year: 2026,
        status: 'Pending',
        due_date: '2026-05-10',
        payment_date: null,
        member_id: 'member-1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    await page.route(/\/api\/v1\/socios/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockMembers }),
        });
        return;
      }

      await route.continue();
    });

    await page.route(/\/api\/v1\/payments/, async (route) => {
      const method = route.request().method();
      const url = new URL(route.request().url());

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockPayments }),
        });
        return;
      }

      if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newPayment = {
          id: `payment-${mockPayments.length + 1}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...payload,
          status: payload.status || 'Pending',
          payment_date: payload.payment_date || null,
        };
        mockPayments.push(newPayment);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newPayment }),
        });
        return;
      }

      if (method === 'PUT') {
        const id = url.pathname.split('/').pop();
        const payload = route.request().postDataJSON();
        const index = mockPayments.findIndex((payment) => payment.id === id);

        if (index === -1) {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'El pago no existe' }),
          });
          return;
        }

        mockPayments[index] = {
          ...mockPayments[index],
          ...payload,
          updated_at: new Date().toISOString(),
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockPayments[index] }),
        });
        return;
      }

      if (method === 'PATCH' && url.pathname.endsWith('/cancel')) {
        const id = url.pathname.split('/').at(-2);
        const index = mockPayments.findIndex((payment) => payment.id === id);

        if (index === -1) {
          await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'El pago no existe' }),
          });
          return;
        }

        mockPayments[index] = {
          ...mockPayments[index],
          status: 'Canceled',
          updated_at: new Date().toISOString(),
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockPayments[index] }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/payments');
  });

  test('debe mostrar la lista de pagos cargada desde el network interceptado', async ({ page }) => {
    await expect(page.getByText('Socio Pago Playwright - DNI 22333444')).toBeVisible();
    await expect(page.getByText('5/2026')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
  });

  test('debe registrar un pago y mostrarlo en la tabla', async ({ page }) => {
    await page.getByRole('button', { name: /Registrar Pago/i }).click();
    await expect(page.getByText('Registrar Nuevo Pago')).toBeVisible();

    await page.getByText('Seleccione un socio').click();
    await page.getByText('Socio Pago Playwright - DNI 22333444').click();
    await page.getByPlaceholder('Ej. 15000').fill('2500');
    await page.getByLabel('Mes').fill('6');
    await page.getByLabel('Anio').fill('2026');
    await page.getByLabel('Fecha de vencimiento').fill('2026-06-10');

    await page.getByRole('button', { name: 'Crear Pago' }).click();

    await expect(page.getByRole('button', { name: 'Crear Pago' })).toBeHidden();
    await expect(page.getByText('Pago registrado correctamente.')).toBeVisible();
    await expect(page.getByText('6/2026')).toBeVisible();
    await expect(page.getByText('$2.500')).toBeVisible();
  });

  test('debe editar un pago existente y refrescar la tabla', async ({ page }) => {
    await page.getByRole('button', { name: /Editar pago/i }).click();
    await expect(page.getByText('Editar Pago')).toBeVisible();

    await page.getByPlaceholder('Ej. 15000').fill('1800');
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();
    await expect(page.getByText('Pago actualizado correctamente.')).toBeVisible();
    await expect(page.getByText('$1.800')).toBeVisible();
  });

  test('debe cancelar un pago tras aceptar la confirmacion', async ({ page }) => {
    page.on('dialog', (dialog) => dialog.accept());

    await expect(page.getByText('Pending')).toBeVisible();
    await page.getByRole('button', { name: /Cancelar pago/i }).click();

    await expect(page.getByText('Pago cancelado correctamente.')).toBeVisible();
    await expect(page.getByText('Canceled')).toBeVisible();
  });
});
