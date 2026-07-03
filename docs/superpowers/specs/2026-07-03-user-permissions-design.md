# Sistema de usuarios y permisos por módulo

Fecha: 2026-07-03

## Objetivo

Un rol `SUPERADMIN` gestiona usuarios (crear/editar/activar-desactivar/asignar rol) y les asigna permisos granulares (ver/crear/editar/eliminar) por módulo del panel. El backend es la única fuente de verdad; el sidebar solo refleja lo que el backend ya decidió.

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

enum PanelModule {
  DASHBOARD
  PEDIDOS
  PRODUCTOS
  METRICAS
  CAMPANAS
  COSTOS
  CALCULADORA_PRECIO
  COTIZACIONES
  PRODUCCION
  ODOO
  USUARIOS
}

model UserPermission {
  id        String      @id @default(cuid())
  userId    String
  module    PanelModule
  canView   Boolean     @default(false)
  canCreate Boolean     @default(false)
  canEdit   Boolean     @default(false)
  canDelete Boolean     @default(false)
  createdAt DateTime    @default(now())
  updatedAt DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, module])
}
```

`PanelModule` agrupa por módulo funcional real, no por ítem de sidebar: `PRODUCCION` cubre `/panel/produccion` y `/panel/produccion/ordenes`; `ODOO` cubre las 6 subrutas de `/panel/odoo/*`.

`User` gana el campo `active Boolean @default(true)` para soportar activar/desactivar cuentas. Un usuario `active: false` no puede iniciar sesión (chequeo en `authenticateUser`).

Sin seed masivo. La migración solo crea la tabla `UserPermission` vacía y el campo `active` (default `true`, no rompe usuarios existentes).

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
  if (!user || !user.active) throw new Error("UNAUTHORIZED");

  if (user.role === "SUPERADMIN") return user;

  const perm = await prisma.userPermission.findUnique({
    where: { userId_module: { userId: user.id, module } },
  });

  // Sin registro = comportamiento actual (acceso permitido), igual que hoy.
  if (!perm) return user;

  const field = `can${action[0].toUpperCase()}${action.slice(1)}` as
    | "canView" | "canCreate" | "canEdit" | "canDelete";
  if (!perm[field]) throw new Error("FORBIDDEN");

  return user;
}
```

Reglas:
- `SUPERADMIN` nunca toca la tabla `UserPermission`.
- Sin registro para `userId+module` → se permite (comportamiento actual, no restrictivo).
- Con registro → el flag correspondiente a la acción manda.
- No se duplica esta lógica en ningún route handler; todos importan `requirePermission`.

Mapeo acción-verbo HTTP en cada API route de `/api/panel/*`:
- `GET` → `view`
- `POST` → `create`
- `PUT`/`PATCH` → `edit`
- `DELETE` → `delete`

`requireAdminUser` / `requireAdminOrSeller` (`lib/admin.ts`) quedan reemplazados por llamadas a `requirePermission` en cada route que hoy los usa, salvo la ruta de gestión de usuarios (`/panel/usuarios` y su API), que exige `role === "SUPERADMIN"` directo — no pasa por `UserPermission`.

## Frontend

`app/panel/layout.tsx` obtiene los permisos del usuario en sesión (server-side) y filtra `NAV` antes de renderizar: un módulo sin `canView` no aparece en el sidebar. Esto es solo cosmético — si alguien accede a la URL directo o llama la API sin `canView`, el backend responde `FORBIDDEN`/403 igual.

Página bloqueada por falta de `canView` → redirect a `/panel` (o página 403 simple).

## Página `/panel/usuarios` (exclusiva SUPERADMIN)

Chequeo de acceso: `role === "SUPERADMIN"` (no usa `requirePermission`).

Funciones:
- Listar usuarios (nombre, email, rol, estado activo/inactivo).
- Crear usuario: nombre, email, password, rol (`ADMIN`/`SELLER`/`PACKING`/`CUSTOMER`/`SUPERADMIN`). Reutiliza `createUser` de `lib/users.ts` (bcryptjs hash).
- Editar usuario: datos básicos + rol.
- Activar/desactivar: toggle sobre `active`.
- Asignar permisos: matriz de 11 módulos × 4 checkboxes (`canView/canCreate/canEdit/canDelete`), upsert en `UserPermission` por módulo. Módulo `USUARIOS` incluido en la matriz por si un SUPERADMIN quiere delegarlo parcialmente a otro rol en el futuro (no se usa hoy porque el check de esa página es por rol, no por `requirePermission` — queda documentado como límite conocido, no como bug).

## API nueva

- `app/api/panel/users/route.ts` — `GET` (listar), `POST` (crear). SUPERADMIN only.
- `app/api/panel/users/[id]/route.ts` — `PUT` (editar datos/rol/active). SUPERADMIN only.
- `app/api/panel/users/[id]/permissions/route.ts` — `GET` (permisos actuales, default explícito para los 11 módulos aunque no haya registro), `PUT` (upsert matriz completa). SUPERADMIN only.

## Fuera de alcance

- Auditoría/historial de cambios de permisos.
- Permisos a nivel de campo o de registro individual (ej. "solo puede editar sus propios pedidos") — el alcance es por módulo completo.
- UI de "impersonar usuario".
