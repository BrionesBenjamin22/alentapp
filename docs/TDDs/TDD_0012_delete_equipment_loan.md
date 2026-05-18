---
id: 0012
estado: Aprobado
autor: Mateo Arturo Geffroy
fecha: 2026-05-02
titulo: Eliminar Préstamo de Equipamiento (Soft Delete)
---

# TDD-0012: Eliminar Préstamo de Equipamiento (Soft Delete)

## Contexto de Negocio (PRD)

### Objetivo

Permitir que los administrativos del club marquen un préstamo como eliminado lógicamente cuando fue registrado por error, sin perder la información histórica. Mediante soft delete con el campo `deleted_at`, se preserva la auditoría completa del sistema.

### User Persona

*   **Nombre**: Administrativo del Club / Recepcionista
*   **Necesidad**: Si comete un error al registrar un préstamo (socio equivocado, ítem equivocado) y el préstamo aún está en estado `Loaned`, necesita poder darlo de baja del sistema sin eliminar físicamente el registro, manteniendo el historial para auditoría.

### Criterios de Aceptación

*   El sistema debe validar que el préstamo existe y está activo (`deleted_at IS NULL`) antes de intentar eliminarlo.
*   El sistema solo debe permitir eliminar lógicamente préstamos en estado `Loaned`. Los préstamos en estado `Returned` o `Damaged` no pueden eliminarse.
*   La eliminación lógica actualiza el campo `deleted_at` con el timestamp del servidor.
*   El préstamo eliminado lógicamente no aparecerá en listados normales, pero el registro se preserva en la base de datos.
*   La operación requiere confirmación explícita del usuario (dialog de confirmación en frontend).
*   La respuesta debe retornar el préstamo con `deleted_at` poblado para confirmar la operación.

## Diseño Técnico (RFC)

### Modelo de Datos

La entidad `EquipmentLoan` posee el campo `deleted_at` para soft delete:

*   `id`: UUID. Identificador único (inmutable).
*   `item_name`: String. Nombre del equipamiento (preservado tras eliminación).
*   `status`: String o Enum. Estado del préstamo (preservado tras eliminación).
*   `loan_date`: DateTime. Fecha de préstamo (preservada tras eliminación).
*   `due_date`: DateTime nullable. Fecha de devolución (preservada tras eliminación).
*   `member_id`: UUID. Clave foránea (preservada tras eliminación).
*   `deleted_at`: DateTime nullable. Marca el préstamo como lógicamente eliminado.

Reglas de negocio asociadas:

*   Un préstamo solo puede ser eliminado lógicamente si está en estado `Loaned`.
*   No se realiza `hard delete` bajo ninguna circunstancia.
*   El campo `deleted_at` se establece con `now()` al eliminar.
*   Un registro con `deleted_at != null` es invisible en consultas normales (filtro `WHERE deleted_at IS NULL`).
*   La operación es irreversible desde la lógica de negocio (sin "restaurar").

Ejemplo conceptual después de eliminación:

```ts
EquipmentLoan {
    id: string;
    item_name: string;        // Preservado
    status: 'Loaned';         // Debe ser Loaned para permitir delete
    loan_date: string;        // Preservado
    due_date: string | null;  // Preservado
    member_id: string;        // Preservado
    deleted_at: string;       // Poblado con timestamp
}
```

### Contrato de API (@alentapp/shared)

Se reutilizan los tipos existentes `EquipmentLoanResponse` que ya incluye el campo `deleted_at`.

#### Eliminar Préstamo de Equipamiento (Soft Delete)

*   **Endpoint**: `DELETE /api/v1/equipment-loans/:id`
*   **Path Parameters**:

```ts
{
    id: string;  // UUID del préstamo a eliminar lógicamente
}
```

*   **Request Body**: `None`

*   **Response esperada**: `200 OK`

```ts
{
    id: string;
    item_name: string;
    status: 'Loaned';
    loan_date: string;
    due_date: string | null;
    member_id: string;
    deleted_at: string;  // Timestamp de eliminación lógica
}
```

### Componentes de Arquitectura Hexagonal

*   **Domain**:
    *   Entidad `EquipmentLoan`.
    *   Enumeración `EquipmentLoanStatus`.
    *   Validadores de dominio:
        *   `validateEquipmentLoanExists(loan)`: Valida que el préstamo no sea `null` y esté activo (`deleted_at IS NULL`).
        *   `validateEquipmentLoanCanBeDeleted(loan)`: Valida que el estado sea `'Loaned'`.

*   **Application**:
    *   Puerto `EquipmentLoanRepository`.
    *   Caso de uso `DeleteEquipmentLoanUseCase`.
    *   Validación de existencia y estado del préstamo antes de eliminar.

*   **Infrastructure**:
    *   Adaptador de salida `PostgresEquipmentLoanRepository` (método `softDelete`).
    *   Implementación con Prisma (operación `update`, no `delete`).
    *   Controlador HTTP `EquipmentLoanController` (método DELETE).
    *   Mapeo de errores de dominio a códigos HTTP.

## Casos de Borde y Errores

| Escenario                                        | Resultado Esperado                                                    | Código HTTP       |
| ------------------------------------------------ | --------------------------------------------------------------------- | ----------------- |
| Préstamo inexistente                            | Mensaje: "El préstamo no existe"                                     | 404 Not Found     |
| ID de préstamo inválido (UUID)                  | Mensaje: "El ID del préstamo no es válido"                           | 400 Bad Request   |
| Préstamo ya eliminado lógicamente               | Mensaje: "El préstamo no existe"                                     | 404 Not Found     |
| Préstamo en estado `Returned`                   | Mensaje: "No se puede eliminar un préstamo en estado Returned"       | 422 Unprocessable Entity |
| Préstamo en estado `Damaged`                    | Mensaje: "No se puede eliminar un préstamo en estado Damaged"        | 422 Unprocessable Entity |
| Eliminación lógica exitosa                      | Retorna el préstamo con `deleted_at` poblado                         | 200 OK            |
| Error de conexión a DB                          | Mensaje: "Error interno, reintente más tarde"                        | 500 Internal Server Error |

## Plan de Implementación

1. Confirmar que el campo `deleted_at` (nullable timestamp) existe en el esquema de Prisma del modelo `EquipmentLoan`.
2. Confirmar que los métodos `findAll` y `findById` filtran registros activos (`WHERE deleted_at IS NULL`).
3. Crear validadores de dominio:
    *   `validateEquipmentLoanExists(loan): void`.
    *   `validateEquipmentLoanCanBeDeleted(loan): void` (verifica que status sea 'Loaned').
4. Crear o actualizar el puerto `EquipmentLoanRepository` con método `softDelete(id): Promise<EquipmentLoan>`.
5. Implementar el método `softDelete` en el adaptador `PostgresEquipmentLoanRepository`:
    *   Ejecutar operación `UPDATE SET deleted_at = now()` con `WHERE id = :id AND deleted_at IS NULL`.
    *   Retornar el DTO completo con `deleted_at` poblado.
6. Implementar el caso de uso `DeleteEquipmentLoanUseCase`:
    *   Recibe el ID del préstamo.
    *   Obtiene el préstamo usando `findById` (que ya filtra activos).
    *   Valida que el préstamo existe.
    *   Valida que el estado sea `'Loaned'`.
    *   Invoca el método `softDelete` del repositorio.
    *   Retorna la respuesta mapeada a `EquipmentLoanResponse`.
7. Crear el método DELETE en el `EquipmentLoanController`.
8. Registrar la ruta `DELETE /api/v1/equipment-loans/:id` en la configuración principal.
9. Implementar servicio de frontend para consumir el endpoint.
10. En la vista de listado, agregar botón de eliminación con `window.confirm`:
    *   Mostrar mensaje de confirmación: "¿Estás seguro de que deseas eliminar este préstamo?"
    *   Solo enviar la petición si el usuario confirma.
11. Eliminar el préstamo de la vista local al recibir respuesta exitosa.
12. Probar los casos de borde definidos en este documento.
13. Verificar que los préstamos eliminados no aparezcan en listados posteriores.
14. Verificar que no se permita eliminar préstamos en estado `Returned` o `Damaged`.
15. Realizar tests con diferentes estados de préstamo.