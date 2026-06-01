import { test, expect } from '@playwright/test';

/**
 * Tests E2E Full-Stack para la vista de Deportes.
 * NO hay ningún mock de red. Playwright interactúa con:
 *   - El Frontend React en http://localhost:5173
 *   - La API Fastify real en http://localhost:3001
 *   - La base de datos PostgreSQL de test (alentapp_test_db)
 *
 * El global-setup se encarga de limpiar la DB antes de correr la suite,
 * por lo que cada test empieza desde un estado conocido y limpio.
 */

test.describe('Sports Full-Stack E2E', () => {

  test('debe mostrar el estado vacío cuando no hay deportes en la DB', async ({ page }) => {
    await page.goto('/sports');
    await expect(page.getByText('No se encontraron deportes.')).toBeVisible({ timeout: 10000 });
  });

  test('debe crear un deporte real y mostrarlo en la tabla', async ({ page }) => {
    await page.goto('/sports');

    // Abrir modal de creación
    await page.getByRole('button', { name: 'Agregar Deporte' }).click();
    await expect(page.getByText('Crear Nuevo Deporte')).toBeVisible();

    // Llenar formulario con datos reales
    await page.getByPlaceholder('Ej. Fútbol').fill('Fútbol E2E Test');
    await page.getByPlaceholder('Ej. Deporte de equipo con pelota').fill('Deporte de equipo con pelota y portería');
    await page.getByPlaceholder('Ej. 20').fill('30');
    await page.getByPlaceholder('Ej. 50.00').fill('100.50');

    // Checkbox de federado
    await page.locator('input[type="checkbox"]').check();

    // Guardar
    await page.getByRole('button', { name: 'Crear Deporte' }).click();

    // Esperar que el modal se cierre y el deporte aparezca en la tabla real
    await expect(page.getByRole('button', { name: 'Crear Deporte' })).toBeHidden();
    await expect(page.getByText('Fútbol E2E Test')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Deporte de equipo con pelota y portería')).toBeVisible();
    await expect(page.getByText('30')).toBeVisible();
    await expect(page.getByText('100.50')).toBeVisible();
  });

  test('debe editar el deporte creado y ver el cambio en la tabla', async ({ page }) => {
    await page.goto('/sports');

    // Esperar que el deporte del test anterior esté en la tabla
    await expect(page.getByText('Fútbol E2E Test')).toBeVisible({ timeout: 10000 });

    // Clic en Editar
    await page.getByRole('button', { name: /Editar deporte/i }).first().click();
    await expect(page.getByText('Editar Deporte')).toBeVisible();

    // Cambiar la descripción (el nombre no se puede editar)
    await page.getByPlaceholder('Ej. Deporte de equipo con pelota').fill('Deporte editado en E2E');
    await page.getByPlaceholder('Ej. 20').fill('25');

    // Guardar
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();

    // Verificar cambio en la tabla
    await expect(page.getByText('Deporte editado en E2E')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('25')).toBeVisible();
  });

  test('debe intentar crear un deporte duplicado y mostrar error', async ({ page }) => {
    await page.goto('/sports');

    // El deporte debería seguir ahí tras el test anterior
    await expect(page.getByText('Fútbol E2E Test')).toBeVisible({ timeout: 10000 });

    // Abrir modal de creación
    await page.getByRole('button', { name: 'Agregar Deporte' }).click();
    await expect(page.getByText('Crear Nuevo Deporte')).toBeVisible();

    // Intentar crear con el mismo nombre (debe fallar con 409)
    await page.getByPlaceholder('Ej. Fútbol').fill('Fútbol E2E Test');
    await page.getByPlaceholder('Ej. Deporte de equipo con pelota').fill('Otra descripción');
    await page.getByPlaceholder('Ej. 20').fill('20');

    // Guardar
    await page.getByRole('button', { name: 'Crear Deporte' }).click();

    // Debe mostrar error: "Ya existe un deporte con ese nombre"
    await expect(page.getByText(/Ya existe un deporte con ese nombre/i)).toBeVisible({ timeout: 10000 });
  });

  test('debe eliminar el deporte y mostrar el estado vacío', async ({ page }) => {
    await page.goto('/sports');

    // El deporte debería seguir ahí
    await expect(page.getByText('Fútbol E2E Test')).toBeVisible({ timeout: 10000 });

    // Aceptar el confirm del navegador automáticamente
    page.on('dialog', (dialog) => dialog.accept());

    // Clic en borrar
    await page.getByRole('button', { name: /Eliminar deporte/i }).first().click();

    // La tabla debería quedar vacía
    await expect(page.getByText('No se encontraron deportes.')).toBeVisible({ timeout: 10000 });
  });

});