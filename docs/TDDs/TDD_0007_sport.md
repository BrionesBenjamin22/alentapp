---
id: 7
estado: Propuesto
autor: German Altamirano
fecha: 2026-05-03
titulo: Gestión del Catálogo de Deportes
---

# TDD-0007: Catálogo de Deportes (Sport)

## Contexto de Negocio (PRD)

### Objetivo

Definir y mantener el catálogo de deportes que ofrece el club, especificando cupos máximos, precios adicionales y atributos configurables. Esta entidad actúa como "maestro" de datos para la inscripción de socios a actividades.

### User Personas

- **Administrador de Deportes**: Desea crear nuevos deportes, configurar cupos y precios sin poder cambiar el nombre (evitar confusión).
- **Tesorero**: Necesita ver el precio adicional de cada deporte para cobros especiales.
- **Sistema**: Debe validar que no se reduce el cupo por debajo de los inscritos.

### Criterios de Aceptación

- El sistema debe permitir crear un deporte con nombre, descripción, cupo máximo y precio adicional.
- El nombre de un deporte es inmutable una vez creado (no puede editarse).
- El cupo máximo debe ser > 0 y no puede reducirse por debajo de la cantidad de inscritos.
- El sistema debe permitir actualizar descripción y cupo (si la validación lo permite).
- El sistema debe permitir listar todos los deportes con sus cupos disponibles.
- Un deporte puede marcarse como "Federado" (booleano).

---

## Diseño Técnico (RFC)

### Modelo de Dominio

```ts
interface Sport {
    id: string;                 // UUID
    nombre: string;             // Inmutable
    descripcion: string;        // Editable
    cupoMaximo: number;         // > 0, editable con restricciones
    precioAdicional: number;    // En pesos, puede ser 0
    esFederado: boolean;        // Indica si está federado
    creadoEl: DateTime;
    actualizadoEl: DateTime;
}
```

---

### Contrato de API (`@alentapp/shared`)

#### Tipos Compartidos (DTOs)

```ts
// Create Sport
interface CreateSportRequest {
    nombre: string;             // Ej: "Tenis", "Fútbol"
    descripcion: string;
    cupoMaximo: number;         // Ej: 20, 30
    precioAdicional: number;    // Ej: 0, 500.50
    esFederado: boolean;        // true | false
}

interface CreateSportResponse {
    id: string;
    nombre: string;
    descripcion: string;
    cupoMaximo: number;
    precioAdicional: number;
    esFederado: boolean;
    disponibles: number;        // cupoMaximo - inscritos
    creadoEl: DateTime;
}

// Update Sport (Solo descripción y cupo con validación)
interface UpdateSportRequest {
    descripcion?: string;       // Opcional
    cupoMaximo?: number;        // Opcional, con validación
    precioAdicional?: number;   // Opcional
    esFederado?: boolean;       // Opcional
}

interface UpdateSportResponse {
    id: string;
    nombre: string;             // No cambia
    descripcion: string;
    cupoMaximo: number;
    precioAdicional: number;
    esFederado: boolean;
    disponibles: number;
    actualizadoEl: DateTime;
}

// List Sports
interface ListSportsResponse {
    sports: {
        id: string;
        nombre: string;
        descripcion: string;
        cupoMaximo: number;
        precioAdicional: number;
        esFederado: boolean;
        inscritos: number;       // Contador de inscritos
        disponibles: number;     // cupoMaximo - inscritos
    }[];
}

// Get Sport by ID
interface GetSportResponse {
    id: string;
    nombre: string;
    descripcion: string;
    cupoMaximo: number;
    precioAdicional: number;
    esFederado: boolean;
    inscritos: number;
    disponibles: number;
    creadoEl: DateTime;
    actualizadoEl: DateTime;
}
```

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/sports` | Crear nuevo deporte |
| `GET` | `/api/v1/sports` | Listar todos los deportes |
| `GET` | `/api/v1/sports/:id` | Obtener detalles de un deporte |
| `PATCH` | `/api/v1/sports/:id` | Actualizar deporte (sin cambiar nombre) |
| `DELETE` | `/api/v1/sports/:id` | Eliminar deporte (solo si no hay inscritos) |

---

### Esquema de Persistencia (Prisma)

```prisma
model Sport {
    id                  String      @id @default(uuid())
    nombre              String      @unique         // Inmutable
    descripcion         String
    cupoMaximo          Int                         // > 0
    precioAdicional     Float       @default(0)
    esFederado          Boolean     @default(false)
    createdAt           DateTime    @default(now())
    updatedAt           DateTime    @updatedAt

    // Relación con Enrollments (inscripciones)
    enrollments         Enrollment[]

    @@map("sports")
}

// Agregar a la tabla Enrollment (cuando se implemente):
model Enrollment {
    id                  String      @id @default(uuid())
    miembroId           String      @db.Uuid
    sportId             String      @db.Uuid
    miembro             Member      @relation(fields: [miembroId], references: [id], onDelete: Cascade)
    sport               Sport       @relation(fields: [sportId], references: [id], onDelete: Cascade)
    fechaInscripcion    DateTime    @default(now())

    @@unique([miembroId, sportId])  // Un socio no puede inscribirse dos veces al mismo deporte
    @@map("enrollments")
}
```

---

## Arquitectura y Flujo

### Definición del Puerto (Repository Interface)

**Dominio** (`src/domain/SportRepository.ts`):

```ts
interface SportRepository {
    // Crear un deporte
    create(sport: Sport): Promise<Sport>;

    // Obtener por ID
    findById(id: string): Promise<Sport | null>;

    // Obtener por nombre
    findByName(nombre: string): Promise<Sport | null>;

    // Listar todos
    findAll(): Promise<Sport[]>;

    // Actualizar (sin cambiar nombre)
    update(id: string, data: Partial<Sport>): Promise<Sport>;

    // Eliminar
    delete(id: string): Promise<void>;

    // Contar inscritos en un deporte
    countEnrolled(sportId: string): Promise<number>;
}
```

**Servicio de Dominio** (`src/domain/services/SportValidator.ts`):

```ts
interface SportValidator {
    // Validar que el cupo sea válido
    isValidCapacity(cupoMaximo: number): boolean;

    // Validar que no se reduce cupo por debajo de inscritos
    canReduceCapacity(
        sportId: string,
        newCapacity: number,
        currentEnrolled: number
    ): boolean;

    // Validar que el nombre sea válido
    isValidName(nombre: string): boolean;
}
```

---

### Lógica del Caso de Uso

#### `CreateSportUseCase` (`src/application/CreateSportUseCase.ts`)

1. Validar que el nombre no sea vacío y sea único.
2. Validar que `cupoMaximo` sea mayor a 0.
3. Validar que `precioAdicional` sea >= 0.
4. Validar que `descripcion` no sea vacía.
5. Crear instancia de Sport.
6. Persistir a través del repositorio.
7. Retornar Sport creado con `disponibles = cupoMaximo`.

#### `UpdateSportUseCase` (`src/application/UpdateSportUseCase.ts`)

1. Obtener el deporte por ID.
2. Validar que exista.
3. **Validar integridad**: No permitir cambiar el nombre.
4. Si se intenta cambiar `cupoMaximo`:
   - Obtener cantidad actual de inscritos.
   - Validar que el nuevo cupo **NO** sea menor que los inscritos.
   - Si es menor, lanzar error.
5. Actualizar solo los campos permitidos (descripción, cupo, precio, esFederado).
6. Persistir y retornar.

#### `DeleteSportUseCase` (`src/application/DeleteSportUseCase.ts`)

1. Obtener el deporte por ID.
2. Validar que exista.
3. Contar inscritos.
4. Si hay inscritos, lanzar error (`409 Conflict`).
5. Eliminar del repositorio.

#### `GetSportWithDetailsUseCase` (`src/application/GetSportUseCase.ts`)

1. Obtener el deporte por ID.
2. Contar inscritos.
3. Calcular `disponibles = cupoMaximo - inscritos`.
4. Retornar Sport con metadata.

---

## Casos de Borde y Manejo de Errores

| Escenario de Error                   | Validación / Regla de Negocio                             | Código HTTP       |
| ------------------------------------ | --------------------------------------------------------- | ----------------- |
| Nombre duplicado                     | No pueden existir dos deportes con el mismo nombre.       | `409 Conflict`    |
| Cupo máximo <= 0                     | El `cupoMaximo` debe ser > 0.                             | `400 Bad Request` |
| Nombre vacío o inválido              | El nombre debe tener al menos 2 caracteres.               | `400 Bad Request` |
| Precio adicional negativo            | El `precioAdicional` no puede ser < 0.                    | `400 Bad Request` |
| Reducir cupo por debajo de inscritos | Se intenta bajar `cupoMaximo` a 15 pero hay 20 inscritos. | `409 Conflict`    |
| Intentar cambiar nombre              | Se intenta actualizar el nombre de un deporte existente.  | `400 Bad Request` |
| Deporte no existe                    | Se intenta actualizar o eliminar un ID inexistente.       | `404 Not Found`   |
| Eliminar con inscritos               | Se intenta borrar un deporte que tiene socios inscriptos. | `409 Conflict`    |
| Descripción vacía                    | La descripción no puede estar vacía.                      | `400 Bad Request` |

---
### Plan de Implementación

1. **Definir tipos en @alentapp/shared**
   - Crear/actualizar `packages/shared/index.ts` con DTOs (CreateSportRequest, UpdateSportRequest, ListSportsResponse, etc.)
   - Exportar tipos e interfaces

2. **Implementar entidad en Domain**
   - Crear `packages/api/src/domain/Sport.ts` con la interfaz principal
   - Crear `packages/api/src/domain/SportRepository.ts` (Puerto - interface de operaciones)

3. **Crear Servicio de Validación**
   - Implementar `packages/api/src/domain/services/SportValidator.ts`
   - Validar: nombre único, cupo > 0, descripción no vacía, precio >= 0
   - Validar cambio de cupo contra cantidad de inscritos

4. **Implementar Casos de Uso**
   - `CreateSportUseCase.ts` - crear nuevo deporte
   - `UpdateSportUseCase.ts` - actualizar (con validación de integridad del nombre)
   - `DeleteSportUseCase.ts` - eliminar solo si no hay inscritos
   - `ListSportsUseCase.ts` - listar con metadata de disponibilidad
   - `GetSportUseCase.ts` - obtener detalles con contador de inscritos
   - Todos en `packages/api/src/application/`

5. **Crear esquema en Prisma**
   - Agregar modelo `Sport` en `packages/api/prisma/schema.prisma`
   - Crear/actualizar modelo `Enrollment` (relación muchos-a-muchos: Member-Sport)
   - Crear migración: `npx prisma migrate dev --name init_sport`

6. **Implementar Adaptador de Infraestructura**
   - Crear `packages/api/src/infrastructure/PostgresSportRepository.ts`
   - Implementar la interface SportRepository usando Prisma
   - Incluir método `countEnrolled()` para validaciones

7. **Crear Controlador (Delivery)**
   - Implementar `packages/api/src/delivery/SportController.ts`
   - Rutas: POST (crear), GET (listar/detalle), PATCH (actualizar), DELETE
   - Integrar con Fastify en `app.ts`
   - Manejo de errores para validaciones específicas

8. **Escribir Tests**
   - Unit tests para cada caso de uso
   - Integration tests para el controlador
   - E2E tests en `e2e-fullstack/sports.fullstack.spec.ts`
   - **Tests críticos**: 
     - Cambio de cupo por debajo de inscritos (debe fallar)
     - Intentar cambiar nombre (debe fallar)
     - Eliminar con inscritos (debe fallar)

9. **Crear UI en Frontend**
   - Vista `packages/web/src/views/Sports.tsx`
   - Componentes: SectionCard para cada deporte, formulario de creación
   - Servicio `packages/web/src/services/sports.ts`
   - Mostrar cupos disponibles en tiempo real

10. **Validación Final**
    - Ejecutar suite completa de tests
    - Verificar que el nombre es efectivamente inmutable
    - Revisar cobertura de casos de borde
    - Validar performance de conteo de inscritos (agregar índice si es necesario)