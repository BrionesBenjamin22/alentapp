import { test, expect } from '@playwright/test';

test.describe('Equipment Loans E2E (UI Integration - Aislado)', () => {
  
  test.beforeEach(async ({ page }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    
    // 1. Estado en memoria simulando la BD de Préstamos
    const mockLoansDb = [
      {
        id: '1',
        item_name: 'Pelota de Básquet Inicial',
        status: 'Loaned',
        loan_date: new Date().toISOString(),
        due_date: null as string | null, // <-- Agregamos el casteo
        member_id: 'socio-1',
        deleted_at: null as string | null // <-- Agregamos el casteo
      }
    ];

    // 2. Interceptamos la llamada a miembros/socios para poblar el <select> del formulario
    // Usamos regex para atrapar tanto /members como /socios según cómo lo hayas nombrado
    await page.route(/\/api\/v1\/(members|socios)/, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            data: [{ id: 'socio-1', name: 'Socio Simulado', category: 'Pleno', status: 'Activo' }] 
          })
        });
      } else {
        await route.continue();
      }
    });

    // 3. Interceptamos el CRUD completo de Préstamos
    await page.route(/\/api\/v1\/equipment-loans/, async (route) => {
      const method = route.request().method();

      if (method === 'GET') {
        // En el GET solo devolvemos los que NO están eliminados lógicamente
        const activeLoans = mockLoansDb.filter(loan => loan.deleted_at === null);
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: activeLoans }) // Algunos fetchers esperan { data: [...] }
        });

      } else if (method === 'POST') {
        const payload = route.request().postDataJSON();
        const newLoan = {
          id: `uuid-${mockLoansDb.length + 1}`,
          status: 'Loaned', // Estado inicial por defecto según regla de negocio
          loan_date: new Date().toISOString(),
          deleted_at: null,
          ...payload
        };
        mockLoansDb.push(newLoan);

        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ data: newLoan })
        });

      } else if (method === 'OPTIONS') {
        await route.fulfill({
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          }
        });

      } else if (method === 'PATCH' || method === 'PUT') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const payload = route.request().postDataJSON();
        const index = mockLoansDb.findIndex(l => String(l.id) === String(id));
        
        if (index > -1) {
          mockLoansDb[index] = { ...mockLoansDb[index], ...payload };
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: mockLoansDb[index] })
          });
        } else {
          await route.fulfill({ status: 404, body: JSON.stringify({ error: 'Not found' }) });
        }

      } else if (method === 'DELETE') {
        const urlObj = new URL(route.request().url());
        const id = urlObj.pathname.split('/').pop();
        const index = mockLoansDb.findIndex(l => String(l.id) === String(id));
        
        if (index > -1) {
          // Soft Delete: No hacemos splice, simulamos el comportamiento real del backend
          mockLoansDb[index].deleted_at = new Date().toISOString(); 
        }
        await route.fulfill({ status: 200, body: JSON.stringify({ data: mockLoansDb[index] }) });

      } else {
        await route.continue();
      }
    });

    // Navegamos directamente a la vista de préstamos una vez que las redes están interceptadas
    await page.goto('/equipment-loans');
  });

  // --- TESTS ---

  test('debe mostrar la lista de prestamos cargada desde el network interceptado', async ({ page }) => {
    // Verificamos que el estado inicial en memoria se renderice
    await expect(page.getByText('Pelota de Básquet Inicial')).toBeVisible();
    await expect(page.getByText('Prestado', { exact: true })).toBeVisible();
  });

  test('debe abrir el modal de creación y enviar el formulario de red', async ({ page }) => {
    await page.locator('button:has-text("Registrar Préstamo")').click();
    await expect(page.getByText('Registrar Nuevo Préstamo')).toBeVisible();

    // Seleccionamos al "Socio Simulado" que inyectamos en la ruta de miembros
    await page.locator('select').first().selectOption({ index: 1 });
    await page.getByPlaceholder('Ej. Pelota de Básquet').fill('Raqueta de Tenis (Mock)');
    
    await page.getByRole('button', { name: 'Crear Préstamo' }).click();

    // Validamos cierre de modal y aparición del nuevo ítem mockeado
    await expect(page.getByRole('button', { name: 'Crear Préstamo' })).toBeHidden();
    await expect(page.getByText('Raqueta de Tenis (Mock)')).toBeVisible();
    await expect(page.getByText('Prestado', { exact: true })).toBeVisible();
  });

  test('debe abrir el modal de edición, actualizar datos a Devuelto y mostrar el cambio', async ({ page }) => {
    await page.getByRole('button', { name: /Editar préstamo/i }).first().click();
    await expect(page.getByText('Actualizar Préstamo')).toBeVisible();

    // Cambiamos el select al estado Returned
    await page.locator('select').last().selectOption({ value: 'Returned' });
    await page.getByRole('button', { name: 'Guardar Cambios' }).click();

    // Esperar cierre y validar la actualización del Badge en la UI
    await expect(page.getByRole('button', { name: 'Guardar Cambios' })).toBeHidden();
    await expect(page.getByText('Devuelto', { exact: true })).toBeVisible();
  });

  test('debe poder eliminar logicamente un prestamo tras aceptar confirmación', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept());

    await expect(page.getByText('Pelota de Básquet Inicial')).toBeVisible();

    await page.getByRole('button', { name: /Eliminar préstamo/i }).first().click();

    // Al hacer clic, el mock de DELETE actualiza deleted_at, el componente React hace un re-fetch (GET),
    // y como el mock de GET filtra los eliminados, el ítem debe desaparecer de la vista.
    await expect(page.getByText('Pelota de Básquet Inicial')).toBeHidden();
  });
});