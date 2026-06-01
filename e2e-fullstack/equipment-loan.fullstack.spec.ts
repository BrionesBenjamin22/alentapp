import { test, expect } from '@playwright/test';

/**
 * Suite E2E de Préstamos de Equipamiento.
 * Valida el flujo completo integrando Frontend, Backend y Base de Datos real.
 */
test.describe('Equipment Loans Full-Stack E2E', () => {

  // --- PREPARACIÓN DEL ENTORNO ---
  // Utilizamos beforeAll para configurar la base de datos de test.
  // Creamos un socio real vía UI porque, al ser un test E2E, necesitamos
  // que la integridad referencial de la BD se respete.
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await page.goto('/members');
    await page.locator('button:has-text("Agregar Miembro")').click();
    await page.getByPlaceholder('Ej. Juan Pérez').fill('Socio Base Préstamos');
    await page.getByPlaceholder('Ej. 12345678').fill('11223344');
    await page.getByPlaceholder('ejemplo@correo.com').fill('base@prestamos.com');
    await page.getByLabel(/Fecha de Nacimiento/i).fill('1990-01-01');
    await page.getByRole('button', { name: 'Crear Miembro' }).click();
    await expect(page.getByText('Socio Base Préstamos')).toBeVisible({ timeout: 10000 });
    await page.close();
  });

  // 1. Test de creación de préstamo
  test('debe registrar un prestamo real y mostrarlo en la tabla', async ({ page }) => {
    // ARRANGE: Navegamos a la vista y abrimos el modal
    await page.goto('/equipment-loans');
    await page.locator('button:has-text("Registrar Préstamo")').click();
    await expect(page.getByText('Registrar Nuevo Préstamo')).toBeVisible();

    // ACT: Seleccionamos el socio creado en beforeAll y completamos el formulario
    const selectSocio = page.locator('select').first();
    await selectSocio.selectOption({ index: 1 }); 
    await page.getByPlaceholder('Ej. Pelota de Básquet').fill('Pelota E2E Fullstack');
    await page.getByRole('button', { name: 'Crear Préstamo' }).click();

    // ASSERT: Validamos que el modal desaparezca y el registro figure como "Prestado"
    await expect(page.getByRole('button', { name: 'Crear Préstamo' })).toBeHidden();
    await expect(page.getByText('Pelota E2E Fullstack')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Prestado', { exact: true })).toBeVisible();
  });

  // 2. Test de borrado lógico (Soft Delete)
  test('debe eliminar logicamente el prestamo si esta en estado Loaned', async ({ page }) => {
    // ARRANGE: Primero generamos un registro para borrarlo
    await page.goto('/equipment-loans');
    await page.locator('button:has-text("Registrar Préstamo")').click();
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByPlaceholder('Ej. Pelota de Básquet').fill('Pelota a Borrar');
    await page.getByRole('button', { name: 'Crear Préstamo' }).click();
    await expect(page.getByText('Pelota a Borrar')).toBeVisible({ timeout: 10000 });

    // ACT: Interceptamos el diálogo de confirmación del navegador y hacemos clic en eliminar
    page.on('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Eliminar préstamo/i }).first().click();
    
    // ASSERT: Verificamos que el registro ya no sea visible en la tabla
    await expect(page.getByText('Pelota a Borrar')).toBeHidden({ timeout: 10000 });
  });

  // 3. Test de actualización de estado
  test('debe actualizar un prestamo a estado Devuelto', async ({ page }) => {
    // ARRANGE: Creamos un préstamo base para actualizar
    await page.goto('/equipment-loans');
    await page.locator('button:has-text("Registrar Préstamo")').click();
    await page.locator('select').first().selectOption({ index: 1 }); 
    await page.getByPlaceholder('Ej. Pelota de Básquet').fill('Red E2E Update');
    await page.getByRole('button', { name: 'Crear Préstamo' }).click();
    await expect(page.getByText('Red E2E Update')).toBeVisible({ timeout: 10000 });

    // ACT: Entramos al modal de edición y cambiamos el estado
    await page.getByRole('button', { name: /Editar préstamo/i }).first().click();
    await expect(page.getByText('Actualizar Préstamo')).toBeVisible();

    const selectEstado = page.locator('select').last();
    await selectEstado.selectOption({ value: 'Returned' });
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();
    
    // ASSERT: Validamos que los cambios persistan en la UI
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();
    await expect(page.getByText('Devuelto', { exact: true })).toBeVisible({ timeout: 10000 });
  });
});