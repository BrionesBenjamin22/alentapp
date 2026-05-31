import { test, expect } from '@playwright/test';

test.describe('Sports E2E (UI Integration)', () => {
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    // Estado en memoria simulando la Base de Datos para estos tests
    const mockDb = [
      {
        id: '1',
        name: 'Fútbol',
        description: 'Deporte de equipo con pelota',
        maxCapacity: 30,
        additionalPrice: 0,
        isFederated: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Interceptamos todas las llamadas de red hacia nuestro backend real
    // De este modo, nuestros tests E2E del frontend son resilientes y no dependen 
    // de que la base de datos de PostgreSQL esté levantada.
    await page.route(/\/api\/v1\/sports/, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockDb })
        });
      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newSport = {
          id: `uuid-${mockDb.length + 1}`,
          additionalPrice: payload.additionalPrice ?? 0,
          isFederated: payload.isFederated ?? false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...payload
        };
        // Insertamos en nuestra BD falsa para que el próximo GET lo traiga
        mockDb.push(newSport);

        // Simulamos la creación exitosa devolviendo lo creado
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newSport })
        });
      } else if (method === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });
      } else if (method === 'PUT') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const payload = route.request().postDataJSON();
        const index = mockDb.findIndex(s => String(s.id) === String(id));
        
        console.log('PUT payload', payload, 'found index', index);
        
        if (index > -1) {
          mockDb[index] = { 
            ...mockDb[index], 
            ...payload,
            updated_at: new Date().toISOString()
          };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockDb[index] })
          });
        } else {
          await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
        }
      } else if (method === 'DELETE') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const index = mockDb.findIndex(s => String(s.id) === String(id));
        console.log('DELETE id', id, 'found index', index);
        if (index > -1) {
          mockDb.splice(index, 1);
        }

        await route.fulfill({ status: 204 });
      } else {
        await route.continue();
      }
    });

    // Navegamos directamente a la vista de deportes
    await page.goto('/sports');
  });

  test('debe mostrar la lista de deportes cargada desde el network interceptado', async ({ page }) => {
    // Verificamos que nuestro dato simulado esté pintado en la tabla HTML real
    await expect(page.getByText('Fútbol')).toBeVisible();
    await expect(page.getByText('Deporte de equipo con pelota')).toBeVisible();
  });

  test('debe abrir el modal de creación y enviar el formulario de red', async ({ page }) => {
    // Buscar y clickear en "Agregar Deporte"
    await page.getByRole('button', { name: /Agregar Deporte/i }).click();

    // Verificamos que el modal se abrió
    await expect(page.getByText('Crear Nuevo Deporte')).toBeVisible();

    // Llenar el formulario simulando tipeo real de usuario
    await page.getByPlaceholder('Ej. Fútbol').fill('Tenis E2E');
    await page.getByPlaceholder('Ej. Deporte de equipo con pelota').fill('Deporte de raqueta individual');
    await page.getByPlaceholder('Ej. 20').fill('4');
    await page.getByPlaceholder('Ej. 50.00').fill('150.00');

    // Marcar como federado si existe checkbox
    const federatedCheckbox = page.locator('input[type="checkbox"]').first();
    if (await federatedCheckbox.isVisible()) {
      await federatedCheckbox.check();
    }

    // Clic en enviar
    await page.getByRole('button', { name: /Crear Deporte/i }).click();

    // Verificamos que el modal se cerró con éxito
    await expect(page.getByRole('button', { name: /Crear Deporte/i })).toBeHidden();

    // Verificamos que el componente hizo refresh (GET) y muestra el nuevo deporte en la tabla
    await expect(page.getByText('Tenis E2E')).toBeVisible();
    await expect(page.getByText('Deporte de raqueta individual')).toBeVisible();
  });

  test('debe abrir el modal de edición, actualizar datos y mostrar el cambio', async ({ page }) => {
    // Buscar y clickear en el botón de edición del único deporte existente
    await page.getByRole('button', { name: /Editar deporte/i }).click();

    // Verificamos que el modal se abrió con el título correcto
    await expect(page.getByText('Editar Deporte')).toBeVisible();

    // Modificar la descripción
    await page.getByPlaceholder('Ej. Deporte de equipo con pelota').fill('Deporte de equipo principal del club');

    // Modificar el cupo máximo
    await page.getByPlaceholder('Ej. 20').fill('40');

    // Clic en guardar
    await page.getByRole('button', { name: /Guardar Cambios/i }).click();

    // Esperar que se cierre
    await expect(page.getByRole('button', { name: /Guardar Cambios/i })).toBeHidden();

    // Verificar en la tabla
    await expect(page.getByText('Deporte de equipo principal del club')).toBeVisible();
    await expect(page.getByText('40')).toBeVisible();
  });

  test('debe poder eliminar un deporte tras aceptar la alerta de confirmación', async ({ page }) => {
    // Escuchar el evento del dialog "confirm" del navegador y aceptarlo automáticamente
    page.on('dialog', dialog => dialog.accept());

    // Asegurarnos que el deporte está en la tabla antes de borrar
    await expect(page.getByText('Fútbol')).toBeVisible();

    // Clic en borrar
    await page.getByRole('button', { name: /Eliminar deporte/i }).click();

    // Verificar que la tabla se actualice y muestre el empty state
    await expect(page.getByText('No se encontraron deportes.')).toBeVisible();
    await expect(page.getByText('Fútbol')).toBeHidden();
  });
});