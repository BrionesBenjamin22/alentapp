---
id: 0009
estado: Aprobado
autor: German Altamirano
fecha: 2026-05-05
titulo: Eliminación de Deportes
---

# TDD-0009: Eliminación de Deportes

## Contexto de Negocio (PRD)

### Objetivo

Permitir a los administradores eliminar un deporte del catálogo cuando fue cargado por error o dejó de formar parte de la oferta del club.

Para mantener la consistencia de las inscripciones, el sistema no debe permitir eliminar deportes que tengan socios inscriptos.

### User Persona

*   **Nombre**: Administrador de Deportes
*   **Necesidad**: Eliminar deportes cargados por error o que ya no se ofrecen, siempre que no tengan inscripciones asociadas.

### Criterios de Aceptación

*   El sistema debe permitir eliminar un deporte existente.
*   El sistema debe validar que el deporte exista antes de eliminarlo.
*   El sistema debe validar que el deporte no tenga socios inscriptos.
*   Si el deporte tiene inscriptos, la eliminación debe rechazarse.
*   El sistema debe pedir confirmación explícita antes de eliminar el deporte.
*   Si la eliminación es exitosa, debe retornar una respuesta sin contenido.
*   Si la eliminación es exitosa, el listado de deportes debe actualizarse.

## Diseño Técnico (RFC)

### Modelo de Datos

La baja operará sobre la entidad `Sport` existente:

*   `id`: UUID. Identificador único del deporte.
*   `name`: String. Nombre del deporte.
*   `description`: String. Descripción.
*   `max_capacity`: Int. Cupo máximo.
*   Relación con inscripciones: debe validarse antes de eliminar.

Reglas de baja:

*   Solo se puede eliminar un deporte si no tiene inscripciones asociadas.
*   Si existen inscriptos, la operación debe rechazarse.
*   La eliminación puede ser física siempre que no existan dependencias activas.

### Contrato de API (@alentapp/shared)

*   **Endpoint**: `DELETE /api/v1/sports/:id`
*   **Request Body**: `None`

*   **Response esperada**: `204 No Content`

```ts
// No retorna body en caso de eliminación exitosa.
```

## Componentes de Arquitectura Hexagonal

1. **Domain**:
    - Entidad Sport.
    - Regla de negocio: no se puede eliminar un deporte con inscriptos.
    - Regla de negocio: solo se elimina un deporte existente.
2. **Application**:
    - Puerto SportRepository.
    - Caso de uso DeleteSportUseCase.
    - Validación de existencia mediante findById.
    - Validación de inscriptos mediante countEnrolled(sportId).
3. **Infrastructure**:
    - Adaptador PostgresSportRepository.
    - Método delete(id).
    - Método countEnrolled(sportId).
    - Controlador SportController.
    - Ruta DELETE /api/v1/sports/:id.
    - Confirmación visual en frontend.


## Casos de Borde y Errores

| Escenario              | Resultado Esperado                                               | Código HTTP               |
| ---------------------- | ---------------------------------------------------------------- | ------------------------- |
| Deporte inexistente    | Mensaje: "El deporte no existe"                                  | 404 Not Found             |
| Deporte con inscriptos | Mensaje: "No se puede eliminar un deporte con socios inscriptos" | 409 Conflict              |
| Eliminación exitosa    | Respuesta vacía                                                  | 204 No Content            |
| Error de conexión a DB | Mensaje: "Error interno, reintente más tarde"                    | 500 Internal Server Error |

## Plan de Implementación

1. Ampliar SportRepository con el método delete(id).
2. Asegurar que exista el método countEnrolled(sportId).
3. Implementar delete(id) en PostgresSportRepository.
4. Crear DeleteSportUseCase.
5. Validar existencia del deporte mediante findById.
6. Contar inscriptos asociados al deporte.
7. Rechazar la eliminación si existen inscriptos.
8. Crear el endpoint DELETE /api/v1/sports/:id.
9. Agregar confirmación visual en frontend.
10. Actualizar el listado de deportes luego de una eliminación exitosa.
11. Agregar tests de eliminación exitosa, deporte inexistente y deporte con inscriptos.