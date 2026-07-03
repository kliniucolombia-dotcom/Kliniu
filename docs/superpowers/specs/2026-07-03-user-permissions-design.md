# Sistema de usuarios y permisos por módulo

Fecha: 2026-07-03 (v2 — ajustes de arquitectura)

## Objetivo

Un rol `SUPERADMIN` gestiona usuarios (crear/editar/estado/asignar rol) y les asigna permisos granulares (ver/crear/editar/eliminar) por módulo del panel. El backend es la única fuente de verdad; el sidebar solo refleja lo que el backend ya decidió.

## Alcance

Aplica a todos los roles (`CUSTOMER`, `ADMIN`, `SELLER`, `PACKING`) excepto `SUPERADMIN`, que tiene acceso absoluto y nunca consulta la tabla de permisos.

## Modelo de datos

```prisma
enum UserRole {
  CUSTOMER
  ADMIN
  SELLER
  PACKING
  SUPERADMIN
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum PanelModule {
  MODULE_DASHBOARD
  MODULE_PEDIDOS
  MODULE_PRODUCTOS
  MODULE_METRICAS
  MODULE_CAMPANAS
  MODULE_COSTOS
  MODULE_CALCULADORA_PRECIO
  MODULE_COTIZACIONES
  MODULE_PRODUCCION
  MODULE_ODOO
  MODULE_USUARIOS
}

model UserPermission {
  id        String      @id @default(cuid())
  userId    String
  module    PanelModule
  canView   Boolean     @default(false)
  canCreate Boolean     @default(false)
  canEdit   Boolean     @default(false)
  canDelete Boolean     @default(false)
  updatedBy String?
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, module])
}
```

Convención: todos los valores de `PanelModule` llevan prefijo `MODULE_` + nombre en español SCREAMING_SNAKE_CASE, sin excepción (evita mezclar `ODOO` pelado con el resto). `ODOO` cubre las 6 subrutas de `/panel/odoo/*`; `PRODUCCION` cubre `/panel/produccion` y `/panel/produccion/ordenes`.

`updatedBy` guarda el `userId` del `SUPERADMIN` que hizo el último cambio sobre ese registro (opcional, `null` si nunca se tocó manualmente vía API distinta a la de permisos).

`User` gana el campo `status UserStatus @default(ACTIVE)`. `authenticateUser` rechaza login si `status !== ACTIVE`. `SUSPENDED` se distingue de `INACTIVE` solo a nivel de dato/UI (ej. motivo administrativo vs. baja voluntaria) — ambos bloquean login igual.

Sin seed masivo. La migración crea la tabla `UserPermission` y agrega `status` (default `ACTIVE`, no rompe usuarios existentes).

## Permisos por defecto por rol

`UserPermission` **no** es la fuente de "acceso o no" — es una tabla de **overrides**. La fuente de verdad por defecto es una matriz estática en código, por rol:

```ts
// lib/permission-defaults.ts
const DEFAULTS: Record<UserRole, Record<PanelModule, Permission>> = {
  SUPERADMIN: /* no se usa, bypass total */,
  ADMIN: {
    // todos los módulos: view+create+edit+delete
  },
  SELLER: {
    MODULE_PEDIDOS:            { view: true, create: true, edit: true, delete: false },
    MODULE_PRODUCTOS:          { view: true, create: true, edit: true, delete: false },
    MODULE_CAMPANAS:           { view: true, create: true, edit: true, delete: false },
    MODULE_COTIZACIONES:       { view: true, create: true, edit: true, delete: false },
    MODULE_CALCULADORA_PRECIO: { view: true, create: true, edit: true, delete: false },
    MODULE_DASHBOARD:          { view: true, create: false, edit: false, delete: false },
    MODULE_METRICAS:           { view: true, create: false, edit: false, delete: false },
    MODULE_COSTOS:             { view: true, create: false, edit: false, delete: false },
    MODULE_PRODUCCION:         { view: false, create: false, edit: false, delete: false },
    MODULE_ODOO:               { view: false, create: false, edit: false, delete: false },
    MODULE_USUARIOS:           { view: false, create: false, edit: false, delete: false },
  },
  PACKING: {
    MODULE_PEDIDOS:    { view: true, create: false, edit: true, delete: false },
    MODULE_PRODUCCION: { view: true, create: false, edit: true, delete: false },
    // resto: sin acceso
  },
  CUSTOMER: {
    // todos los módulos: sin acceso (el panel interno no es para clientes)
  },
};
```

`requirePermission` resuelve así: `override (UserPermission) > default del rol > false`. Es decir, si existe un registro `UserPermission` para `userId+module`, ese registro manda completo (los 4 flags); si no existe, se usa `DEFAULTS[role][module]`.

## Helpers de rol (`lib/roles.ts`)

```ts
export function isSuperAdmin(user: { role: UserRole }) {
  return user.role === "SUPERADMIN";
}

export function isAdmin(user: { role: UserRole }) {
  return user.role === "ADMIN" || isSuperAdmin(user);
}

export function isStaff(user: { role: UserRole }) {
  return user.role === "ADMIN" || user.role === "SELLER" || user.role === "PACKING" || isSuperAdmin(user);
}
```

Usados donde se necesite un chequeo de rol directo (ej. página `/panel/usuarios` usa `isSuperAdmin`), en vez de repetir comparaciones `role === "..."` sueltas por el código.

## Regla de permisos (`lib/permissions.ts`)

Helper único, usado por toda la API del panel:

```ts
export async function requirePermission(
  module: PanelModule,
  action: "view" | "create" | "edit" | "delete"
) {
  const session = await getSessionFromCookies();
  if (!session) throw new Error("UNAUTHORIZED");

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") throw new Error("UNAUTHORIZED");

  if (isSuperAdmin(user)) return user;

  const override = await prisma.userPermission.findUnique({
    where: { userId_module: { userId: user.id, module } },
  });

  const perm = override ?? DEFAULTS[user.role][module];

  const field = `can${action[0].toUpperCase()}${action.slice(1)}` as
    | "canView" | "canCreate" | "canEdit" | "canDelete";
  if (!perm[field]) throw new Error("FORBIDDEN");

  return user;
}
```

Reglas:
- `SUPERADMIN` nunca toca la tabla `UserPermission` ni `DEFAULTS`.
- `UserPermission` es override explícito, no fallback. La ausencia de registro usa el default del rol, no "acceso total".
- No se duplica esta lógica en ningún route handler; todos importan `requirePermission`.

Mapeo acción-verbo HTTP en cada API route de `/api/panel/*`:
- `GET` → `view`
- `POST` → `create`
- `PUT`/`PATCH` → `edit`
- `DELETE` → `delete`

`requireAdminUser` / `requireAdminOrSeller` (`lib/admin.ts`) quedan reemplazados por llamadas a `requirePermission` en cada route que hoy los usa, salvo la ruta de gestión de usuarios (`/panel/usuarios` y su API), que exige `isSuperAdmin(user)` directo — no pasa por `UserPermission`/`DEFAULTS`.

## Frontend

`app/panel/layout.tsx` obtiene los permisos efectivos del usuario en sesión (override o default, server-side) y filtra `NAV` antes de renderizar: un módulo sin `canView` no aparece en el sidebar. Esto es solo cosmético — si alguien accede a la URL directo o llama la API sin `canView`, el backend responde `FORBIDDEN`/403 igual.

Página bloqueada por falta de `canView` → redirect a `/panel` (o página 403 simple).

## Página `/panel/usuarios` (exclusiva SUPERADMIN)

Chequeo de acceso: `isSuperAdmin(user)`.

Funciones:
- Listar usuarios (nombre, email, rol, `status`).
- Crear usuario: nombre, email, password, rol (`ADMIN`/`SELLER`/`PACKING`/`CUSTOMER`/`SUPERADMIN`). Reutiliza `createUser` de `lib/users.ts` (bcryptjs hash).
- Editar usuario: datos básicos + rol.
- Cambiar `status` (`ACTIVE`/`INACTIVE`/`SUSPENDED`).
- Asignar permisos: matriz de 11 módulos × 4 checkboxes, precargada con el valor efectivo actual (override si existe, si no el default del rol, visualmente distinguible). Al guardar, hace upsert en `UserPermission` solo para los módulos que el SUPERADMIN modificó respecto al default (o upsert completo de los 11, a definir en plan — cualquiera de las dos formas es válida porque `requirePermission` ya resuelve override > default). Cada upsert setea `updatedBy` al `userId` del `SUPERADMIN` autenticado.

## API nueva

- `app/api/panel/users/route.ts` — `GET` (listar), `POST` (crear). Requiere `isSuperAdmin`.
- `app/api/panel/users/[id]/route.ts` — `PUT` (editar datos/rol/status). Requiere `isSuperAdmin`.
- `app/api/panel/users/[id]/permissions/route.ts` — `GET` (permisos efectivos de los 11 módulos: override o default, marcando cuál es cuál), `PUT` (upsert overrides, setea `updatedBy`). Requiere `isSuperAdmin`.

## Fuera de alcance

- Auditoría/historial completo de cambios (solo se guarda el último `updatedBy`, no un log).
- Permisos a nivel de campo o de registro individual (ej. "solo puede editar sus propios pedidos") — el alcance es por módulo completo.
- UI de "impersonar usuario".
- Edición de la matriz `DEFAULTS` desde UI (vive en código, cambia solo con deploy).
