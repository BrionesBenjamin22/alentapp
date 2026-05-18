---
id: 0011
estado: Aprobado
autor: Mateo Arturo Geffroy
fecha: 2026-05-02
titulo: Actualizar Préstamo de Equipamiento
---

# TDD-0011: Actualizar Préstamo de Equipamiento

## Contexto de Negocio (PRD)

### Objetivo

Permitir que el administrativo actualice el estado de un préstamo existente, principalmente para registrar la devolución (`Loaned → Returned`) o declarar daño (`Loaned → Damaged`). Solo permite cambios en campos específicos, con una máquina de estados que impide transiciones inválidas. La actualización es parcial: solo se modifican campos explícitamente enviados.

### User Persona

*   **Nombre**: Administración del Club / Recepcionista
*   **Necesidad**: Cuando un socio devuelve un equipo, marcar como "Returned" con un clic. Si llega dañado, registrar como "Damaged". No quiere que un préstamo ya cerrado se reabre.

### Criterios de Aceptación

*   El sistema debe validar que el préstamo existe y está activo (`deleted_at IS NULL`).
*   Solo se permiten transiciones válidas: `Loaned → Returned`, `Loaned → Damaged`.
*   Estados `Returned` y `Damaged` son **terminales**: no pueden cambiar.
*   La actualización es **parcial**: campos no enviados no se modifican.
*   Si solo se envía `due_date` sin `status`, actualiza solo la fecha.
*   Si la transición es inválida, retorna error 422.
*   La respuesta incluye el objeto completo actualizado.

## Contexto Técnico

- **Operación:** UPDATE (Modificación)
- **Entidad:** EquipmentLoan
- **Relacionados:** TDD-0010 (Crear), TDD-0012 (Eliminar)
- **Precedencia:** Depende de TDD-0010

## Diseño Técnico (RFC)

### Modelo de Datos

Máquina de estados de `LoanStatus`:

```
┌─────────────────────────────────────────────────────┐
│              MÁQUINA DE ESTADOS                      │
└─────────────────────────────────────────────────────┘

Estado Actual: LOANED
├─ ✅ Transición → RETURNED (Terminal)
└─ ✅ Transición → DAMAGED  (Terminal)

Estado Actual: RETURNED (Terminal)
└─ ❌ No permite cambios

Estado Actual: DAMAGED (Terminal)
└─ ❌ No permite cambios
```

| Estado Actual | → Returned | → Damaged | → Loaned |
| ------------- | ---------- | --------- | -------- |
| `Loaned`      | ✅         | ✅        | ❌       |
| `Returned`    | ❌         | ❌        | ❌       |
| `Damaged`     | ❌         | ❌        | ❌       |

Estados `Returned` y `Damaged` son **terminales** (no se pueden modificar).

Campos actualizables en operación PATCH:
- `status`: solo transiciones válidas.
- `due_date`: solo si es válido (posterior a `loan_date`).

Campos inmutables:
- `id`, `member_id`, `loan_date`, `deleted_at`, `item_name`.

```ts
UpdateEquipmentLoanRequest {
    status?: 'Loaned' | 'Returned' | 'Damaged';
    due_date?: string;   // ISO 8601, opcional
}

EquipmentLoanResponse {
    id: string;
    item_name: string;
    status: 'Loaned' | 'Returned' | 'Damaged';
    loan_date: string;
    due_date: string | null;
    member_id: string;
    deleted_at: null;
}
```

### Contrato de API (@alentapp/shared)

#### Actualizar Préstamo

*   **Endpoint**: `PATCH /api/v1/equipment-loans/:id`
*   **Path Parameters**: `id` (UUID)
*   **Request Body** (todos opcionales):

```ts
{
    status?: 'Loaned' | 'Returned' | 'Damaged';
    due_date?: string;   // ISO 8601 datetime
}
```

*   **Response**: `200 OK`

```ts
{
    id: string;
    item_name: string;
    status: 'Loaned' | 'Returned' | 'Damaged';
    loan_date: string;
    due_date: string | null;
    member_id: string;
    deleted_at: null;
}
```

### Componentes de Arquitectura Hexagonal

*   **Domain**:
    *   Máquina de estados `validateStatusTransition(currentStatus, newStatus)`.
    *   Validador `validateDueDate(dueDate, loanDate)`.

*   **Application**:
    *   `UpdateEquipmentLoanUseCase`: busca préstamo, valida existencia, valida transición, ejecuta actualización parcial.
    *   Puerto `EquipmentLoanRepository`: método `update(id, data)`.

*   **Infrastructure**:
    *   `PostgresEquipmentLoanRepository.update`: actualización parcial con Prisma.
    *   `EquipmentLoanController.update`: PATCH handler con mapeo de errores.

## Casos de Borde y Errores

| Escenario                           | Resultado Esperado                                       | Código HTTP              |
| ----------------------------------- | -------------------------------------------------------- | ------------------------ |
| Préstamo inexistente                | "El préstamo no existe"                                  | 404 Not Found            |
| Préstamo ya eliminado lógicamente   | "El préstamo no existe"                                  | 404 Not Found            |
| Transición `Returned → Loaned`      | "No se puede cambiar el estado desde Returned"           | 422 Unprocessable Entity |
| Transición `Damaged → Loaned`       | "No se puede cambiar el estado desde Damaged"            | 422 Unprocessable Entity |
| Transición `Loaned → Loaned`        | Retorna sin cambios (idempotente)                        | 200 OK                   |
| Due date formato inválido           | "Formato de fecha de devolución inválido"                | 400 Bad Request          |
| Due date anterior a loan_date       | "La fecha de devolución debe ser posterior al préstamo"  | 422 Unprocessable Entity |
| Body vacío `{}`                     | Retorna sin cambios                                      | 200 OK                   |
| Solo actualiza `due_date`           | Solo cambia `due_date`, mantiene `status`                | 200 OK                   |
| Actualización exitosa `Loaned → Returned` | Retorna con `status: 'Returned'`             | 200 OK                   |
| Error en base de datos              | "Error interno, reintente más tarde"                     | 500 Internal Server Error|

## Plan de Implementación

1. Agregar `UpdateEquipmentLoanRequest` a `@alentapp/shared`.
2. Crear validador de máquina de estados: `validateStatusTransition(from, to)`.
3. Implementar `UpdateEquipmentLoanUseCase` con flujo completo.
4. Implementar `PostgresEquipmentLoanRepository.update` con actualización parcial.
5. Agregar método PATCH al `EquipmentLoanController`.
6. Registrar ruta `PATCH /api/v1/equipment-loans/:id` en `app.ts`.
7. Agregar método `update` al servicio frontend.
8. Conectar botones de acción ("Marcar devuelto", "Marcar dañado") en vista.
9. Mostrar validaciones visuales: transiciones permitidas, due_date válida.
10. Deshabilitar campos no modificables: `item_name`, `loan_date`, `member_id`.
11. Mostrar visualmente estados terminales (Returned, Damaged) deshabilitados.
12. Tests unitarios: transiciones válidas, transiciones inválidas, body vacío, due_date inválida.
13. Tests de integración: `PATCH /api/v1/equipment-loans/:id`.