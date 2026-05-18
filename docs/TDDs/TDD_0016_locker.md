---
id:   0016         
estado:  Propuesto 
autor: German Altamirano    
fecha:  2026-05-03      
titulo:  Gestión de Casilleros del Club 
---

# TDD-0016: Control de Casilleros (Locker)

## Contexto de Negocio (PRD)

### Objetivo

Gestionar el inventario de casilleros disponibles en el vestuario del club. Permitir que socios alquilen casilleros de forma segura, evitando que dos personas tengan asignado el mismo casillero y controlando su disponibilidad en tiempo real.

### User Personas

- **Administrativo del Vestuario**: Necesita consultar qué casilleros están disponibles, asignar casilleros a socios que ingresan, y registrar liberaciones cuando un socio se va.
- **Socio**: Desea poder saber si hay casilleros libres y obtener uno rápidamente sin conflictos de concurrencia.

### Criterios de Aceptación

- El sistema debe permitir dar de alta un casillero con número único, ubicación y estado inicial `Disponible`.
- Un casillero en estado `Mantenimiento` no puede ser asignado a un socio.
- Dos socios no pueden tener el mismo casillero asignado en el mismo momento (**Race Condition**).
- Al asignar un casillero, su estado pasa a `Ocupado` y se registra la fecha de fin de contrato.
- Al liberar un casillero, su estado vuelve a `Disponible` (si no está en mantenimiento).
- El sistema debe permitir listar casilleros disponibles y ocupados.

---

## Diseño Técnico (RFC)

### Modelo de Dominio

```ts
interface Locker {
    id: string;                    // UUID
    numero: number;                // Número único del casillero
    ubicacion: 'Masculino' | 'Femenino' | 'Niños';
    estado: 'Disponible' | 'Ocupado' | 'Mantenimiento';
    fechaFinContrato?: DateTime;   // Cuándo termina el alquiler
    miembroId?: string;            // Referencia al Member que lo ocupa (FK)
    creadoEl: DateTime;
    actualizadoEl: DateTime;
}
```

---

### Contrato de API (`@alentapp/shared`)

#### Tipos Compartidos (DTOs)

```ts
// Create Locker
interface CreateLockerRequest {
    numero: number;
    ubicacion: 'Masculino' | 'Femenino' | 'Niños';
}
interface CreateLockerResponse {
    id: string;
    numero: number;
    ubicacion: string;
    estado: 'Disponible';
    creadoEl: DateTime;
}

// Assign Locker
interface AssignLockerRequest {
    miembroId: string;
    fechaFinContrato: DateTime;
}
interface AssignLockerResponse {
    id: string;
    numero: number;
    estado: 'Ocupado';
    miembroId: string;
    fechaFinContrato: DateTime;
}

// Release Locker
interface ReleaseLockerRequest {
    // Sin body, solo se usa el ID
}
interface ReleaseLockerResponse {
    id: string;
    estado: 'Disponible';
    miembroId: null;
    fechaFinContrato: null;
}

// List Lockers
interface ListLockersResponse {
    lockers: {
        id: string;
        numero: number;
        ubicacion: string;
        estado: 'Disponible' | 'Ocupado' | 'Mantenimiento';
        miembroId?: string;
        fechaFinContrato?: DateTime;
    }[];
}
```

#### Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/v1/lockers` | Crear nuevo casillero |
| `GET` | `/api/v1/lockers` | Listar todos los casilleros |
| `GET` | `/api/v1/lockers/:id` | Obtener detalles de un casillero |
| `PATCH` | `/api/v1/lockers/:id/assign` | Asignar casillero a socio |
| `PATCH` | `/api/v1/lockers/:id/release` | Liberar casillero |
| `PATCH` | `/api/v1/lockers/:id/maintenance` | Cambiar estado a mantenimiento |

---

### Esquema de Persistencia (Prisma)

```prisma
enum LockerStatus {
    Disponible
    Ocupado
    Mantenimiento
}

enum LockerLocation {
    Masculino
    Femenino
    Niños
}

model Locker {
    id                  String          @id @default(uuid())
    numero              Int             @unique
    ubicacion           LockerLocation
    estado              LockerStatus    @default(Disponible)
    fechaFinContrato    DateTime?
    miembroId           String?         @db.Uuid
    miembro             Member?         @relation(fields: [miembroId], references: [id], onDelete: SetNull)
    createdAt           DateTime        @default(now())
    updatedAt           DateTime        @updatedAt

    @@map("lockers")
}

// En la tabla Member, agregar relación inversa:
model Member {
    // ... campos existentes ...
    lockers             Locker[]
}
```

---

### Arquitectura y Flujo

#### Definición del Puerto (Repository Interface)

**Dominio** (`src/domain/LockerRepository.ts`):

```ts
interface LockerRepository {
    // Crear un casillero
    create(locker: Locker): Promise<Locker>;

    // Obtener por ID
    findById(id: string): Promise<Locker | null>;

    // Obtener por número
    findByNumber(numero: number): Promise<Locker | null>;

    // Listar todos
    findAll(): Promise<Locker[]>;

    // Listar disponibles
    findAvailable(): Promise<Locker[]>;

    // Asignar a socio (Actualizar estado y miembroId)
    assign(id: string, miembroId: string, fechaFinContrato: DateTime): Promise<Locker>;

    // Liberar casillero
    release(id: string): Promise<Locker>;

    // Cambiar a mantenimiento
    setMaintenance(id: string): Promise<Locker>;
}
```

---

### Lógica del Caso de Uso

#### `CreateLockerUseCase` (`src/application/CreateLockerUseCase.ts`)

1. Validar que el número no sea negativo y sea único.
2. Validar que la ubicación sea válida.
3. Crear la instancia de `Locker` con estado `Disponible`.
4. Persistir a través del repositorio.
5. Retornar el casillero creado.

#### `AssignLockerUseCase` (`src/application/AssignLockerUseCase.ts`)

1. Obtener el casillero por ID.
2. Validar que exista.
3. Validar que **NO** esté en estado `Mantenimiento`.
4. Validar que el socio (`miembroId`) exista en la base de datos.
5. Validar concurrencia: si el estado es `Ocupado`, lanzar error (**Race Condition**).
6. Cambiar estado a `Ocupado`, asignar `miembroId` y `fechaFinContrato`.
7. Persistir y retornar.

#### `ReleaseLockerUseCase` (`src/application/ReleaseLockerUseCase.ts`)

1. Obtener el casillero por ID.
2. Validar que exista y esté `Ocupado`.
3. Liberar: `estado → Disponible`, `miembroId → null`, `fechaFinContrato → null`.
4. Persistir y retornar.

---

### Casos de Borde y Manejo de Errores

| Escenario de Error | Validación / Regla de Negocio | Código HTTP |
|--------------------|-------------------------------|-------------|
| Número de casillero duplicado | No pueden existir dos lockers con el mismo `numero`. | `409 Conflict` |
| Casillero no existe | Se intenta asignar o liberar un ID que no existe en BD. | `404 Not Found` |
| Casillero en Mantenimiento | Se intenta asignar un casillero con estado `Mantenimiento`. | `400 Bad Request` |
| Socio no existe | Se intenta asignar a un `miembroId` inexistente. | `404 Not Found` |
| Race Condition | Se intenta asignar un casillero que ya está ocupado (concurrencia). | `409 Conflict` |
| Casillero ya ocupado | Se intenta ocupar nuevamente sin liberar primero. | `400 Bad Request` |
| Liberar casillero disponible | Se intenta liberar un casillero que no está ocupado. | `400 Bad Request` |
| Ubicación inválida | La ubicación no es una de las válidas (`Masculino`/`Femenino`/`Niños`). | `400 Bad Request` |
| Fecha fin contrato inválida | La fecha es anterior a hoy. | `400 Bad Request` |

---

### Plan de Implementación

1. **Definir tipos en @alentapp/shared**
   - Crear archivo `packages/shared/index.ts` con todos los DTOs (CreateLockerRequest, AssignLockerResponse, etc.)
   - Exportar tipos e interfaces compartidas

2. **Implementar entidad en Domain**
   - Crear `packages/api/src/domain/Locker.ts` con la interfaz principal
   - Crear `packages/api/src/domain/LockerRepository.ts` (Puerto - interface que define operaciones)

3. **Crear Servicio de Validación**
   - Implementar `packages/api/src/domain/services/LockerValidator.ts`
   - Incluir validaciones de número único, ubicación válida, etc.

4. **Implementar Casos de Uso**
   - `CreateLockerUseCase.ts` - crear nuevo casillero
   - `AssignLockerUseCase.ts` - asignar a un socio (con validación de concurrencia)
   - `ReleaseLockerUseCase.ts` - liberar casillero
   - `SetMaintenanceUseCase.ts` - cambiar a mantenimiento
   - `ListLockersUseCase.ts` - listar disponibles
   - Todos en `packages/api/src/application/`

5. **Crear esquema en Prisma**
   - Agregar modelos `Locker` y actualizar `Member` en `packages/api/prisma/schema.prisma`
   - Crear migración: `npx prisma migrate dev --name init_locker`

6. **Implementar Adaptador de Infraestructura**
   - Crear `packages/api/src/infrastructure/PostgresLockerRepository.ts`
   - Implementar la interface LockerRepository usando Prisma
   - **Usar transacciones para evitar race conditions**

7. **Crear Controlador (Delivery)**
   - Implementar `packages/api/src/delivery/LockerController.ts`
   - Rutas: POST, GET, PATCH (assign, release, maintenance)
   - Integrar con Fastify en `app.ts`

8. **Escribir Tests**
   - Unit tests para cada caso de uso (`*.test.ts`)
   - Integration tests para el controlador (`*.integration.test.ts`)
   - E2E tests en `e2e-fullstack/lockers.fullstack.spec.ts`
   - Incluir test de concurrencia simulando dos asignaciones simultáneas

9. **Crear UI en Frontend**
   - Vista `packages/web/src/views/Lockers.tsx`
   - Componentes de listado y asignación
   - Servicio `packages/web/src/services/lockers.ts`

10. **Validación Final**
    - Ejecutar todos los tests
    - Revisar cobertura de código
    - Documentar en `docs/CONTRIBUTING.md` si es necesario