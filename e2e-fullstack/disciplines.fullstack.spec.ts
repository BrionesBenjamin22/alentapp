import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Disciplinas.
 * NO hay mocks de red. Playwright interactúa con:
 * - Frontend React
 * - API Fastify real
 * - Base de datos PostgreSQL de test
 *
 * Estos tests cubren los tres flujos principales del CRUD:
 * - alta
 * - modificación
 * - baja
 */

test.describe('Disciplines Full-Stack E2E', () => {
  test('debe crear una disciplina real y mostrarla en la tabla', async ({ page }) => {
    await page.goto('/members');

    await page.locator('button:has-text("Agregar Miembro")').click();
    await expect(page.getByText('Agregar Nuevo Miembro')).toBeVisible();

    await page.getByPlaceholder('Ej. Juan Pérez').fill('Socio Disciplina E2E');
    await page.getByPlaceholder('Ej. 12345678').fill('99112233');
    await page.getByPlaceholder('ejemplo@correo.com').fill('disciplina.e2e@test.com');
    await page.getByLabel(/Fecha de Nacimiento/i).fill('1998-04-20');

    await page.getByRole('button', { name: 'Crear Miembro' }).click();
    await expect(page.getByText('Socio Disciplina E2E')).toBeVisible({ timeout: 10000 });

    await page.goto('/disciplines');

    await page.locator('button:has-text("Agregar Disciplina")').click();
    await expect(page.getByText('Agregar Nueva Disciplina')).toBeVisible();

    await page.locator('select').selectOption({ label: 'Socio Disciplina E2E - DNI 99112233' });
    await page.getByPlaceholder('Ej. Conducta antideportiva').fill('Sanción E2E alta');
    await page.getByLabel(/Fecha de inicio/i).fill('2026-05-10T10:00');
    await page.getByLabel(/Fecha de fin/i).fill('2026-05-15T10:00');

    await page.getByText('Suspensión total').click();

    await page.getByRole('button', { name: 'Crear Disciplina' }).click();

    await expect(page.getByRole('button', { name: 'Crear Disciplina' })).toBeHidden();
    await expect(page.getByText('Sanción E2E alta')).toBeVisible({ timeout: 10000 });
   
  });

  test('debe modificar una disciplina real y mostrar el cambio en la tabla', async ({ page }) => {
    await page.goto('/disciplines');

    await expect(page.getByText('Sanción E2E alta')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /Editar disciplina/i }).first().click();
    await expect(page.getByText('Editar Disciplina')).toBeVisible();

    await page.getByPlaceholder('Ej. Conducta antideportiva').fill('Sanción E2E modificada');
    await page.getByLabel(/Fecha de fin/i).fill('2026-05-20T10:00');

    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();
    await expect(page.getByText('Sanción E2E modificada')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Sanción E2E alta', { exact: true })).toBeHidden();
  });

  test('debe eliminar una disciplina real y quitarla del listado', async ({ page }) => {
    await page.goto('/disciplines');

    await expect(page.getByText('Sanción E2E modificada')).toBeVisible({ timeout: 10000 });

    page.on('dialog', (dialog) => dialog.accept());

    await page.getByRole('button', { name: /Eliminar disciplina/i }).first().click();

    await expect(page.getByText('Sanción E2E modificada')).toBeHidden({ timeout: 10000 });
  });
});