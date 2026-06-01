import { test, expect } from '@playwright/test';

const FULLSTACK_BASE_URL = 'http://localhost:5174';

test.describe('Payments Full-Stack E2E', () => {
  test('debe registrar, editar y cancelar un pago real asociado a un socio real', async ({ page }) => {
    await page.goto(`${FULLSTACK_BASE_URL}/members`);

    await page.locator('button:has-text("Agregar Miembro")').click();
    await expect(page.getByText('Agregar Nuevo Miembro')).toBeVisible();

    await page.getByPlaceholder(/Juan/).fill('Socio Pago Fullstack');
    await page.getByPlaceholder('Ej. 12345678').fill('77889911');
    await page.getByPlaceholder('ejemplo@correo.com').fill('pago-fullstack@e2e.com');
    await page.getByLabel(/Fecha de Nacimiento/i).fill('1990-01-01');
    await page.getByRole('button', { name: 'Crear Miembro' }).click();

    await expect(page.getByRole('button', { name: 'Crear Miembro' })).toBeHidden();
    await expect(page.getByText('Socio Pago Fullstack')).toBeVisible({ timeout: 10000 });

    await page.goto(`${FULLSTACK_BASE_URL}/payments`);
    await expect(page.getByText('Administracion de Pagos')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Registrar Pago/i }).click();
    await expect(page.getByText('Registrar Nuevo Pago')).toBeVisible();

    await page.getByText('Seleccione un socio').click();
    await page.getByText('Socio Pago Fullstack - DNI 77889911').click();
    await page.getByPlaceholder('Ej. 15000').fill('3200');
    await page.getByLabel('Mes').fill('7');
    await page.getByLabel('Anio').fill('2026');
    await page.getByLabel('Fecha de vencimiento').fill('2026-07-10');
    await page.getByRole('button', { name: 'Crear Pago' }).click();

    await expect(page.getByRole('button', { name: 'Crear Pago' })).toBeHidden();
    await expect(page.getByText('Pago registrado correctamente.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Socio Pago Fullstack - DNI 77889911')).toBeVisible();
    await expect(page.getByText('7/2026')).toBeVisible();
    await expect(page.getByText('$3.200')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();

    await page.getByRole('button', { name: /Editar pago/i }).click();
    await expect(page.getByText('Editar Pago')).toBeVisible();
    await page.getByPlaceholder('Ej. 15000').fill('3600');
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();
    await expect(page.getByText('Pago actualizado correctamente.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('$3.600')).toBeVisible();

    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Cancelar pago/i }).click();

    await expect(page.getByText('Pago cancelado correctamente.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Canceled')).toBeVisible();
  });
});
