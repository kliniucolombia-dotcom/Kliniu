# Sistema de usuarios y permisos por módulo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un rol `SUPERADMIN` gestiona usuarios (crear/editar/estado/rol) y les asigna permisos ver/crear/editar/eliminar por módulo del panel. El backend decide (nunca el sidebar), con overrides por usuario sobre defaults por rol.

**Architecture:** Tabla `UserPermission` (override) + matriz `DEFAULT_PERMISSIONS` en código (fallback por rol) + helper único `requirePermission(module, action)` usado por toda `/api/panel/*`, más `requireAdmin()`/`requireSuperAdmin()` para reglas de rol duro (mismo shape de retorno). Sidebar filtra según los mismos permisos efectivos, solo cosmético.

**Tech Stack:** Next.js App Router, Prisma, bcryptjs, jose (JWT). Sin nuevo framework de tests — verificación manual (build + curl + click) por decisión explícita del usuario (repo no tiene jest/vitest).

## Global Constraints

- Sin seed masivo de `UserPermission`: la tabla nace vacía, el fallback es `DEFAULT_PERMISSIONS[role][module]`.
- `SUPERADMIN` nunca consulta `UserPermission` ni `DEFAULT_PERMISSIONS` — bypass total.
- Un solo shape de resultado para los 3 helpers de auth: `{ ok: true; session; user } | { ok: false; status: 401 | 403 }`.
- Todo nombre de `PanelModule` lleva prefijo `MODULE_`.
- `User.status` reemplaza cualquier idea de `active`: `ACTIVE | INACTIVE | SUSPENDED`, ambos no-ACTIVE bloquean login.
- `UserPermission.updatedBy` es opcional, guarda `userId` del SUPERADMIN que hizo el último cambio manual.
- No tocar `app/api/panel/clients/route.ts` (lookup compartido sin página propia, fuera de alcance — ver Task 19 nota).
- Verificación de cada task: `npx tsc --noEmit` (o `npm run build` si aplica) + pasos manuales curl/click descritos en el task. No se agrega vitest/jest.

---

## Matriz de permisos por defecto (referencia para Task 3)

Derivada de los guards de rol que existen HOY en cada ruta (no es una restricción nueva, es la migración 1:1 del comportamiento actual a datos, salvo lo anotado):

| Módulo | ADMIN | SELLER | PACKING | CUSTOMER |
|---|---|---|---|---|
| MODULE_DASHBOARD | FULL | VIEW_ONLY | NONE | NONE |
| MODULE_PEDIDOS | FULL | VIEW_EDIT | VIEW_EDIT | NONE |
| MODULE_PRODUCTOS | FULL | VIEW_EDIT | NONE | NONE |
| MODULE_METRICAS | FULL | VIEW_ONLY | NONE | NONE |
| MODULE_CAMPANAS | FULL | FULL | NONE | NONE |
| MODULE_COSTOS | FULL | VIEW_CREATE_EDIT | NONE | NONE |
| MODULE_CALCULADORA_PRECIO | FULL | FULL | NONE | NONE |
| MODULE_COTIZACIONES | FULL | FULL | NONE | NONE |
| MODULE_PRODUCCION | FULL | FULL | FULL | NONE |
| MODULE_ODOO | FULL | VIEW_ONLY | NONE | NONE |
| MODULE_USUARIOS | **NONE** | NONE | NONE | NONE |

`MODULE_USUARIOS` es NONE incluso para ADMIN — es exclusivo de SUPERADMIN por regla de rol directa (`requireSuperAdmin()`), no por este flag.

Casos donde una regla es "ADMIN estricto" independiente del override (no pasan por `requirePermission`, usan `requireAdmin()` directo):
- `machines` POST/PATCH/DELETE (alta/edición/borrado de máquinas)
- `campaigns/[id]` DELETE (borrar campaña completa)
- `quotation-tax-config` PATCH (config de impuestos)

Estas tres reglas ya eran ADMIN-only hoy y no cambian.

---

### Task 1: Schema Prisma — UserStatus, SUPERADMIN, PanelModule, UserPermission

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: enum `UserRole` con `SUPERADMIN`; enum `UserStatus`; enum `PanelModule` (11 valores `MODULE_*`); modelo `UserPermission`; campo `User.status`.

- [ ] **Step 1: Editar el enum `UserRole` y agregar `UserStatus`**

En `prisma/schema.prisma`, ubicar:

```prisma
enum UserRole {
  CUSTOMER
  ADMIN
  SELLER
  PACKING
}
```

Reemplazar por:

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
```

- [ ] **Step 2: Agregar `status` al modelo `User`**

Ubicar en `model User { ... }`:

```prisma
  role                     UserRole           @default(CUSTOMER)
  createdAt                DateTime           @default(now())
```

Reemplazar por:

```prisma
  role                     UserRole           @default(CUSTOMER)
  status                   UserStatus         @default(ACTIVE)
  createdAt                DateTime           @default(now())
```

- [ ] **Step 3: Agregar relación `permissions` a `User` y crear el modelo `UserPermission`**

Ubicar el final de `model User { ... }`, en el bloque de relaciones (junto a `quotationsAsSeller`, etc.), agregar una línea:

```prisma
  quotationsAsSeller       Quotation[]        @relation("QuotationSeller")
```

Justo debajo agregar:

```prisma
  permissions              UserPermission[]
```

Al final del archivo (después del último `enum` o `model`), agregar:

```prisma
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
  @@index([userId])
}
```

- [ ] **Step 4: Generar y aplicar la migración**

Run: `npx prisma migrate dev --name add_user_status_and_permissions`
Expected: migración creada en `prisma/migrations/`, aplicada sin error, `status` default `ACTIVE` no rompe filas existentes (columna nueva con default, no hay backfill manual necesario).

- [ ] **Step 5: Regenerar el cliente Prisma**

Run: `npx prisma generate`
Expected: sin errores, tipos `UserStatus`, `PanelModule`, `UserPermission` disponibles en `@/generated/prisma/client` (mismo path que usa el resto del repo, ver `app/api/panel/orders/route.ts:3`).

- [ ] **Step 6: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: puede haber errores en archivos que aún referencian el `UserRole` viejo o `PublicUser` sin `status` — se resuelven en tasks siguientes. Si el único error es en `lib/users.ts`/`lib/auth.ts` por el tipo de `role`/falta de `status`, es esperado; anota los archivos con error y continúa.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: agregar UserStatus, SUPERADMIN, PanelModule y UserPermission al schema"
```

---

### Task 2: `lib/roles.ts` — helpers de rol

**Files:**
- Create: `lib/roles.ts`

**Interfaces:**
- Consumes: nada (solo tipos de Prisma).
- Produces: `isSuperAdmin(user)`, `isAdmin(user)`, `isStaff(user)` — usados por Task 5 (`lib/permissions.ts`), Task 6-8 (API usuarios), Task 10 (página usuarios), Task 19 (wiring).

- [ ] **Step 1: Escribir `lib/roles.ts`**

```ts
import type { UserRole } from "@/generated/prisma/client";

type RoleHolder = { role: UserRole };

export function isSuperAdmin(user: RoleHolder): boolean {
  return user.role === "SUPERADMIN";
}

export function isAdmin(user: RoleHolder): boolean {
  return user.role === "ADMIN" || isSuperAdmin(user);
}

export function isStaff(user: RoleHolder): boolean {
  return (
    user.role === "ADMIN" ||
    user.role === "SELLER" ||
    user.role === "PACKING" ||
    isSuperAdmin(user)
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit lib/roles.ts`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/roles.ts
git commit -m "feat: agregar helpers de rol isSuperAdmin/isAdmin/isStaff"
```

---

### Task 3: `lib/permission-defaults.ts` — matriz de defaults por rol

**Files:**
- Create: `lib/permission-defaults.ts`

**Interfaces:**
- Produces: `type Permission`, `DEFAULT_PERMISSIONS: Record<Exclude<UserRole,"SUPERADMIN">, Record<PanelModule, Permission>>` — consumido por Task 5 (`lib/permissions.ts`).

- [ ] **Step 1: Escribir `lib/permission-defaults.ts`**

```ts
import type { PanelModule, UserRole } from "@/generated/prisma/client";

export type Permission = {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const FULL: Permission = { canView: true, canCreate: true, canEdit: true, canDelete: true };
const NONE: Permission = { canView: false, canCreate: false, canEdit: false, canDelete: false };
const VIEW_ONLY: Permission = { canView: true, canCreate: false, canEdit: false, canDelete: false };
const VIEW_EDIT: Permission = { canView: true, canCreate: false, canEdit: true, canDelete: false };
const VIEW_CREATE_EDIT: Permission = { canView: true, canCreate: true, canEdit: true, canDelete: false };

type RoleWithDefaults = Exclude<UserRole, "SUPERADMIN">;

export const DEFAULT_PERMISSIONS: Record<RoleWithDefaults, Record<PanelModule, Permission>> = {
  ADMIN: {
    MODULE_DASHBOARD: FULL,
    MODULE_PEDIDOS: FULL,
    MODULE_PRODUCTOS: FULL,
    MODULE_METRICAS: FULL,
    MODULE_CAMPANAS: FULL,
    MODULE_COSTOS: FULL,
    MODULE_CALCULADORA_PRECIO: FULL,
    MODULE_COTIZACIONES: FULL,
    MODULE_PRODUCCION: FULL,
    MODULE_ODOO: FULL,
    MODULE_USUARIOS: NONE,
  },
  SELLER: {
    MODULE_DASHBOARD: VIEW_ONLY,
    MODULE_PEDIDOS: VIEW_EDIT,
    MODULE_PRODUCTOS: VIEW_EDIT,
    MODULE_METRICAS: VIEW_ONLY,
    MODULE_CAMPANAS: FULL,
    MODULE_COSTOS: VIEW_CREATE_EDIT,
    MODULE_CALCULADORA_PRECIO: FULL,
    MODULE_COTIZACIONES: FULL,
    MODULE_PRODUCCION: FULL,
    MODULE_ODOO: VIEW_ONLY,
    MODULE_USUARIOS: NONE,
  },
  PACKING: {
    MODULE_DASHBOARD: NONE,
    MODULE_PEDIDOS: VIEW_EDIT,
    MODULE_PRODUCTOS: NONE,
    MODULE_METRICAS: NONE,
    MODULE_CAMPANAS: NONE,
    MODULE_COSTOS: NONE,
    MODULE_CALCULADORA_PRECIO: NONE,
    MODULE_COTIZACIONES: NONE,
    MODULE_PRODUCCION: FULL,
    MODULE_ODOO: NONE,
    MODULE_USUARIOS: NONE,
  },
  CUSTOMER: {
    MODULE_DASHBOARD: NONE,
    MODULE_PEDIDOS: NONE,
    MODULE_PRODUCTOS: NONE,
    MODULE_METRICAS: NONE,
    MODULE_CAMPANAS: NONE,
    MODULE_COSTOS: NONE,
    MODULE_CALCULADORA_PRECIO: NONE,
    MODULE_COTIZACIONES: NONE,
    MODULE_PRODUCCION: NONE,
    MODULE_ODOO: NONE,
    MODULE_USUARIOS: NONE,
  },
};

export const ALL_MODULES: PanelModule[] = [
  "MODULE_DASHBOARD",
  "MODULE_PEDIDOS",
  "MODULE_PRODUCTOS",
  "MODULE_METRICAS",
  "MODULE_CAMPANAS",
  "MODULE_COSTOS",
  "MODULE_CALCULADORA_PRECIO",
  "MODULE_COTIZACIONES",
  "MODULE_PRODUCCION",
  "MODULE_ODOO",
  "MODULE_USUARIOS",
];
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a este archivo.

- [ ] **Step 3: Commit**

```bash
git add lib/permission-defaults.ts
git commit -m "feat: agregar matriz de permisos por defecto por rol"
```

---

### Task 4: `lib/users.ts` y `lib/auth.ts` — status, SUPERADMIN, CRUD admin

**Files:**
- Modify: `lib/auth.ts`
- Modify: `lib/users.ts`

**Interfaces:**
- Consumes: `UserStatus`, `UserRole` de `@/generated/prisma/client` (Task 1).
- Produces: `PublicUser` con `status` y rol incluyendo `SUPERADMIN`; `authenticateUser` rechaza status no-ACTIVE; `createUserByAdmin(input)`, `listUsers()`, `updateUserByAdmin(id, input)` — consumidos por Task 6/7.

- [ ] **Step 1: Ampliar `SessionPayload.role` en `lib/auth.ts`**

Ubicar:

```ts
export type SessionPayload = {
  userId: string;
  email: string;
  role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING";
};
```

Reemplazar por:

```ts
export type SessionPayload = {
  userId: string;
  email: string;
  role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
};
```

- [ ] **Step 2: Ampliar `PublicUser` y agregar `status` en `lib/users.ts`**

Ubicar:

```ts
export type PublicUser = {
  id: string;
  fullName: string;
  company: string | null;
  email: string;
  phone: string | null;
  department: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING";
  createdAt: Date;
};
```

Reemplazar por:

```ts
export type PublicUser = {
  id: string;
  fullName: string;
  company: string | null;
  email: string;
  phone: string | null;
  department: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: Date;
};
```

- [ ] **Step 3: `authenticateUser` rechaza status no-ACTIVE**

Ubicar en `authenticateUser`:

```ts
  const passwordMatches = await compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  return {
    id: user.id,
    fullName: user.fullName,
    company: user.company,
    email: user.email,
    phone: user.phone,
    department: user.department,
    city: user.city,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    role: user.role,
  };
}
```

Reemplazar por:

```ts
  const passwordMatches = await compare(password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (user.status !== "ACTIVE") {
    throw new Error("USER_NOT_ACTIVE");
  }

  return {
    id: user.id,
    fullName: user.fullName,
    company: user.company,
    email: user.email,
    phone: user.phone,
    department: user.department,
    city: user.city,
    addressLine1: user.addressLine1,
    addressLine2: user.addressLine2,
    role: user.role,
    status: user.status,
  };
}
```

- [ ] **Step 4: `getUserById` selecciona `status`**

Ubicar (aparece dos veces en el archivo: `getUserById` y `getUserByEmail`; también en `updateUserProfile`'s `select`). Para las 3 ocurrencias del bloque:

```ts
    select: {
      id: true,
      fullName: true,
      company: true,
      email: true,
      phone: true,
      department: true,
      city: true,
      addressLine1: true,
      addressLine2: true,
      role: true,
      createdAt: true,
    },
```

Reemplazar cada una por (usar `replace_all` en el editor ya que las 3 son idénticas):

```ts
    select: {
      id: true,
      fullName: true,
      company: true,
      email: true,
      phone: true,
      department: true,
      city: true,
      addressLine1: true,
      addressLine2: true,
      role: true,
      status: true,
      createdAt: true,
    },
```

- [ ] **Step 5: Agregar `createUserByAdmin`, `listUsers`, `updateUserByAdmin` al final de `lib/users.ts`**

```ts
export type CreateUserByAdminInput = {
  fullName: string;
  email: string;
  password: string;
  role: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
};

export async function createUserByAdmin(input: CreateUserByAdminInput): Promise<PublicUser> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();

  if (!fullName || !email || !input.password) {
    throw new Error("MISSING_FIELDS");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("EMAIL_ALREADY_EXISTS");
  }

  const passwordHash = await hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      fullName,
      email,
      passwordHash,
      role: input.role,
    },
    select: {
      id: true, fullName: true, company: true, email: true, phone: true,
      department: true, city: true, addressLine1: true, addressLine2: true,
      role: true, status: true, createdAt: true,
    },
  });

  return user;
}

export async function listUsers(): Promise<PublicUser[]> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  return await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true, fullName: true, company: true, email: true, phone: true,
      department: true, city: true, addressLine1: true, addressLine2: true,
      role: true, status: true, createdAt: true,
    },
  });
}

export type UpdateUserByAdminInput = {
  fullName?: string;
  email?: string;
  role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  newPassword?: string;
};

export async function updateUserByAdmin(userId: string, input: UpdateUserByAdminInput): Promise<PublicUser> {
  if (!prisma) {
    throw new Error("DATABASE_NOT_CONFIGURED");
  }

  const data: {
    fullName?: string; email?: string;
    role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    passwordHash?: string;
  } = {};

  if (input.fullName?.trim()) data.fullName = input.fullName.trim();
  if (input.role) data.role = input.role;
  if (input.status) data.status = input.status;

  if (input.email?.trim()) {
    const email = input.email.trim().toLowerCase();
    const existingWithEmail = await prisma.user.findFirst({ where: { email, NOT: { id: userId } } });
    if (existingWithEmail) {
      throw new Error("EMAIL_ALREADY_EXISTS");
    }
    data.email = email;
  }

  if (input.newPassword?.trim()) {
    data.passwordHash = await hash(input.newPassword.trim(), 10);
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true, fullName: true, company: true, email: true, phone: true,
      department: true, city: true, addressLine1: true, addressLine2: true,
      role: true, status: true, createdAt: true,
    },
  });

  return user;
}
```

- [ ] **Step 6: Ajustar `app/api/auth/login/route.ts` para `SUPERADMIN`**

Ubicar:

```ts
    if (user.role === "ADMIN" && !adminPin) {
```

Sin cambio en esa línea (SUPERADMIN no pasa por el flujo de PIN de ADMIN). Ubicar:

```ts
    const redirectTo =
      user.role === "ADMIN"   ? "/admin"   :
      user.role === "SELLER"  ? "/panel"   :
      user.role === "PACKING" ? "/empaque" :
      "/mi-cuenta";
```

Reemplazar por:

```ts
    const redirectTo =
      user.role === "ADMIN"      ? "/admin"   :
      user.role === "SUPERADMIN" ? "/panel"   :
      user.role === "SELLER"     ? "/panel"   :
      user.role === "PACKING"    ? "/empaque" :
      "/mi-cuenta";
```

También capturar el nuevo error de login por status inactivo. Ubicar:

```ts
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
```

Reemplazar por:

```ts
    if (error instanceof Error && error.message === "INVALID_CREDENTIALS") {
      return Response.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    if (error instanceof Error && error.message === "USER_NOT_ACTIVE") {
      return Response.json({ error: "Esta cuenta está inactiva o suspendida." }, { status: 403 });
    }
```

- [ ] **Step 7: Ajustar `app/api/auth/admin/login/route.ts` para permitir `SUPERADMIN`**

Ubicar:

```ts
    const user = await authenticateUser(email, password);

    if (user.role !== "ADMIN") {
      return Response.json(
        { error: "Esta cuenta no tiene permisos de administrador." },
        { status: 403 },
      );
    }
```

Reemplazar por:

```ts
    const user = await authenticateUser(email, password);

    if (user.role !== "ADMIN" && user.role !== "SUPERADMIN") {
      return Response.json(
        { error: "Esta cuenta no tiene permisos de administrador." },
        { status: 403 },
      );
    }
```

Y capturar `USER_NOT_ACTIVE` igual que en Step 6. Ubicar:

```ts
    const message =
      error instanceof Error && error.message === "INVALID_CREDENTIALS"
        ? "Correo o contraseña incorrectos."
        : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
          ? "La base de datos no está configurada todavía."
          : "No fue posible iniciar sesión como administrador.";
```

Reemplazar por:

```ts
    const message =
      error instanceof Error && error.message === "INVALID_CREDENTIALS"
        ? "Correo o contraseña incorrectos."
        : error instanceof Error && error.message === "USER_NOT_ACTIVE"
          ? "Esta cuenta está inactiva o suspendida."
          : error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
            ? "La base de datos no está configurada todavía."
            : "No fue posible iniciar sesión como administrador.";
```

- [ ] **Step 8: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores en `lib/users.ts`, `lib/auth.ts`, `app/api/auth/login/route.ts`, `app/api/auth/admin/login/route.ts`.

- [ ] **Step 9: Verificación manual de login**

Run: `npm run dev` (en otra terminal), luego:
```bash
curl -i -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -d '{"email":"<email admin existente>","password":"<password>"}'
```
Expected: `200` con `redirectTo` correcto, cookie `kliniu_session` seteada.

- [ ] **Step 10: Commit**

```bash
git add lib/auth.ts lib/users.ts app/api/auth/login/route.ts app/api/auth/admin/login/route.ts
git commit -m "feat: soportar UserStatus y rol SUPERADMIN en auth y CRUD de usuarios"
```

---

### Task 5: `lib/permissions.ts` — helper único de autorización

**Files:**
- Create: `lib/permissions.ts`

**Interfaces:**
- Consumes: `getSessionFromCookies` (`lib/auth.ts`), `getUserById` (`lib/users.ts`), `isSuperAdmin`/`isAdmin` (`lib/roles.ts`), `DEFAULT_PERMISSIONS` (`lib/permission-defaults.ts`), `prisma` (`lib/prisma.ts`).
- Produces: `requirePermission(module, action)`, `requireAdmin()`, `requireSuperAdmin()`, `getEffectivePermissions(userId, role)` — consumidos por Task 6-9 y Task 19 (wiring).

- [ ] **Step 1: Escribir `lib/permissions.ts`**

```ts
import { getSessionFromCookies, type SessionPayload } from "@/lib/auth";
import { getUserById, type PublicUser } from "@/lib/users";
import { isAdmin, isSuperAdmin } from "@/lib/roles";
import { DEFAULT_PERMISSIONS, ALL_MODULES, type Permission } from "@/lib/permission-defaults";
import { prisma } from "@/lib/prisma";
import type { PanelModule } from "@/generated/prisma/client";

export type PermissionAction = "view" | "create" | "edit" | "delete";

export type AuthResult =
  | { ok: true; session: SessionPayload; user: PublicUser }
  | { ok: false; status: 401 | 403 };

const ACTION_FIELD: Record<PermissionAction, keyof Permission> = {
  view: "canView",
  create: "canCreate",
  edit: "canEdit",
  delete: "canDelete",
};

const FULL_PERMISSION: Permission = { canView: true, canCreate: true, canEdit: true, canDelete: true };

async function resolveActiveUser(): Promise<
  { ok: true; session: SessionPayload; user: PublicUser } | { ok: false; status: 401 }
> {
  const session = await getSessionFromCookies();
  if (!session) return { ok: false, status: 401 };

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") return { ok: false, status: 401 };

  return { ok: true, session, user };
}

export async function getEffectivePermission(
  user: PublicUser,
  module: PanelModule,
): Promise<Permission> {
  if (isSuperAdmin(user)) return FULL_PERMISSION;
  if (!prisma) return DEFAULT_PERMISSIONS[user.role as Exclude<PublicUser["role"], "SUPERADMIN">][module];

  const override = await prisma.userPermission.findUnique({
    where: { userId_module: { userId: user.id, module } },
  });

  if (override) {
    return {
      canView: override.canView,
      canCreate: override.canCreate,
      canEdit: override.canEdit,
      canDelete: override.canDelete,
    };
  }

  return DEFAULT_PERMISSIONS[user.role as Exclude<PublicUser["role"], "SUPERADMIN">][module];
}

export async function getEffectivePermissions(user: PublicUser): Promise<Record<PanelModule, Permission>> {
  const entries = await Promise.all(
    ALL_MODULES.map(async (module) => [module, await getEffectivePermission(user, module)] as const),
  );
  return Object.fromEntries(entries) as Record<PanelModule, Permission>;
}

export async function requirePermission(module: PanelModule, action: PermissionAction): Promise<AuthResult> {
  const resolved = await resolveActiveUser();
  if (!resolved.ok) return resolved;

  const { session, user } = resolved;
  if (isSuperAdmin(user)) return { ok: true, session, user };

  const perm = await getEffectivePermission(user, module);
  if (!perm[ACTION_FIELD[action]]) return { ok: false, status: 403 };

  return { ok: true, session, user };
}

export async function requireAdmin(): Promise<AuthResult> {
  const resolved = await resolveActiveUser();
  if (!resolved.ok) return resolved;

  if (!isAdmin(resolved.user)) return { ok: false, status: 403 };
  return resolved;
}

export async function requireSuperAdmin(): Promise<AuthResult> {
  const resolved = await resolveActiveUser();
  if (!resolved.ok) return resolved;

  if (!isSuperAdmin(resolved.user)) return { ok: false, status: 403 };
  return resolved;
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores en `lib/permissions.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/permissions.ts
git commit -m "feat: agregar requirePermission/requireAdmin/requireSuperAdmin"
```

---

### Task 6: API `app/api/panel/users` — listar y crear usuarios

**Files:**
- Create: `app/api/panel/users/route.ts`

**Interfaces:**
- Consumes: `requireSuperAdmin` (Task 5), `listUsers`/`createUserByAdmin` (Task 4).
- Produces: `GET /api/panel/users`, `POST /api/panel/users` — consumidos por Task 10 (UI).

- [ ] **Step 1: Escribir la ruta**

```ts
import { requireSuperAdmin } from "@/lib/permissions";
import { createUserByAdmin, listUsers } from "@/lib/users";

export async function GET() {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const users = await listUsers();
  return Response.json({ users });
}

export async function POST(request: Request) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = await request.json().catch(() => ({})) as {
    fullName?: string; email?: string; password?: string;
    role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
  };

  if (!body.fullName?.trim() || !body.email?.trim() || !body.password || !body.role) {
    return Response.json({ error: "Nombre, correo, contraseña y rol son requeridos" }, { status: 400 });
  }

  try {
    const user = await createUserByAdmin({
      fullName: body.fullName,
      email: body.email,
      password: body.password,
      role: body.role,
    });
    return Response.json(user);
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_ALREADY_EXISTS") {
      return Response.json({ error: "Ese correo ya está registrado" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

Con sesión de un SUPERADMIN (crear uno manualmente vía `npx prisma studio` o SQL directo actualizando el `role` de tu usuario ADMIN a `SUPERADMIN` para probar):
```bash
curl -i http://localhost:3000/api/panel/users -H "Cookie: kliniu_session=<token>"
```
Expected: `200` con `{ users: [...] }`. Sin cookie válida de SUPERADMIN: `401`/`403`.

- [ ] **Step 4: Commit**

```bash
git add app/api/panel/users/route.ts
git commit -m "feat: agregar API para listar y crear usuarios (SUPERADMIN)"
```

---

### Task 7: API `app/api/panel/users/[id]` — editar usuario

**Files:**
- Create: `app/api/panel/users/[id]/route.ts`

**Interfaces:**
- Consumes: `requireSuperAdmin` (Task 5), `updateUserByAdmin` (Task 4).
- Produces: `PUT /api/panel/users/:id` — consumido por Task 10 (UI).

- [ ] **Step 1: Escribir la ruta**

```ts
import { requireSuperAdmin } from "@/lib/permissions";
import { updateUserByAdmin } from "@/lib/users";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as {
    fullName?: string; email?: string;
    role?: "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    newPassword?: string;
  };

  try {
    const user = await updateUserByAdmin(id, body);
    return Response.json(user);
  } catch (e) {
    if (e instanceof Error && e.message === "EMAIL_ALREADY_EXISTS") {
      return Response.json({ error: "Ese correo ya está registrado" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

```bash
curl -i -X PUT http://localhost:3000/api/panel/users/<id> -H "Cookie: kliniu_session=<token SUPERADMIN>" -H "Content-Type: application/json" -d '{"status":"SUSPENDED"}'
```
Expected: `200`, usuario actualizado con `status: "SUSPENDED"`; login posterior de ese usuario falla con `403 USER_NOT_ACTIVE`.

- [ ] **Step 4: Commit**

```bash
git add "app/api/panel/users/[id]/route.ts"
git commit -m "feat: agregar API para editar usuario (SUPERADMIN)"
```

---

### Task 8: API `app/api/panel/users/[id]/permissions` — permisos efectivos y overrides

**Files:**
- Create: `app/api/panel/users/[id]/permissions/route.ts`

**Interfaces:**
- Consumes: `requireSuperAdmin`, `getEffectivePermission` (Task 5), `prisma`, `ALL_MODULES` (Task 3).
- Produces: `GET /api/panel/users/:id/permissions`, `PUT /api/panel/users/:id/permissions` — consumidos por Task 10 (UI).

- [ ] **Step 1: Escribir la ruta**

```ts
import { requireSuperAdmin, getEffectivePermission } from "@/lib/permissions";
import { getUserById } from "@/lib/users";
import { prisma } from "@/lib/prisma";
import { ALL_MODULES, type Permission } from "@/lib/permission-defaults";
import type { PanelModule } from "@/generated/prisma/client";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const targetUser = await getUserById(id);
  if (!targetUser) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const overrides = await prisma.userPermission.findMany({ where: { userId: id } });
  const overrideByModule = new Map(overrides.map((o) => [o.module, o]));

  const permissions = await Promise.all(
    ALL_MODULES.map(async (module) => ({
      module,
      isOverride: overrideByModule.has(module),
      ...(await getEffectivePermission(targetUser, module)),
    })),
  );

  return Response.json({ permissions });
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const targetUser = await getUserById(id);
  if (!targetUser) return Response.json({ error: "Usuario no encontrado" }, { status: 404 });

  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json().catch(() => ({})) as {
    permissions?: Array<{ module: PanelModule } & Permission>;
  };

  if (!body.permissions?.length) {
    return Response.json({ error: "permissions requerido" }, { status: 400 });
  }

  await Promise.all(
    body.permissions.map((p) =>
      prisma!.userPermission.upsert({
        where: { userId_module: { userId: id, module: p.module } },
        create: {
          userId: id,
          module: p.module,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          updatedBy: access.user.id,
        },
        update: {
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
          updatedBy: access.user.id,
        },
      }),
    ),
  );

  return Response.json({ ok: true });
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

```bash
curl -i http://localhost:3000/api/panel/users/<id>/permissions -H "Cookie: kliniu_session=<token SUPERADMIN>"
```
Expected: `200` con array de 11 módulos y sus flags efectivos (`isOverride: false` para todos si no hay overrides).

```bash
curl -i -X PUT http://localhost:3000/api/panel/users/<id>/permissions -H "Cookie: kliniu_session=<token SUPERADMIN>" -H "Content-Type: application/json" -d '{"permissions":[{"module":"MODULE_PRODUCCION","canView":true,"canCreate":false,"canEdit":false,"canDelete":false}]}'
```
Expected: `200 { ok: true }`. Repetir el GET anterior: `MODULE_PRODUCCION` ahora tiene `isOverride: true` y `canCreate: false`.

- [ ] **Step 4: Commit**

```bash
git add "app/api/panel/users/[id]/permissions/route.ts"
git commit -m "feat: agregar API de permisos efectivos y overrides por usuario"
```

---

### Task 9: API `app/api/panel/permissions` — permisos propios (para el sidebar)

**Files:**
- Create: `app/api/panel/permissions/route.ts`

**Interfaces:**
- Consumes: `getSessionFromCookies`, `getUserById`, `getEffectivePermissions` (Task 5).
- Produces: `GET /api/panel/permissions` (permisos del usuario en sesión) — consumido por Task 11 (sidebar).

- [ ] **Step 1: Escribir la ruta**

```ts
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { getEffectivePermissions } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) return Response.json({ error: "No autorizado" }, { status: 401 });

  const user = await getUserById(session.userId);
  if (!user || user.status !== "ACTIVE") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  const permissions = await getEffectivePermissions(user);
  return Response.json({ role: user.role, permissions });
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

```bash
curl -i http://localhost:3000/api/panel/permissions -H "Cookie: kliniu_session=<token>"
```
Expected: `200` con `{ role, permissions: { MODULE_DASHBOARD: {...}, ... } }` para los 11 módulos.

- [ ] **Step 4: Commit**

```bash
git add app/api/panel/permissions/route.ts
git commit -m "feat: agregar API de permisos efectivos del usuario en sesion"
```

---

### Task 10: Página `/panel/usuarios` — gestión de usuarios (SUPERADMIN)

**Files:**
- Create: `app/panel/usuarios/page.tsx`

**Interfaces:**
- Consumes: `GET/POST /api/panel/users` (Task 6), `PUT /api/panel/users/:id` (Task 7), `GET/PUT /api/panel/users/:id/permissions` (Task 8), `ALL_MODULES` (Task 3, importado solo para labels de UI — no importar de `lib/permission-defaults.ts` en cliente ya que no es `"use client"`-safe con Prisma types; usar array local de labels, ver Step 1).

- [ ] **Step 1: Escribir la página**

```tsx
"use client";
import { useEffect, useState } from "react";

type Role = "CUSTOMER" | "ADMIN" | "SELLER" | "PACKING" | "SUPERADMIN";
type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: Status;
};

type ModulePermission = {
  module: string;
  isOverride: boolean;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

const MODULE_LABELS: Record<string, string> = {
  MODULE_DASHBOARD: "Dashboard",
  MODULE_PEDIDOS: "Pedidos",
  MODULE_PRODUCTOS: "Productos",
  MODULE_METRICAS: "Métricas",
  MODULE_CAMPANAS: "Campañas",
  MODULE_COSTOS: "Costos",
  MODULE_CALCULADORA_PRECIO: "Precio de Venta",
  MODULE_COTIZACIONES: "Cotizaciones",
  MODULE_PRODUCCION: "Producción",
  MODULE_ODOO: "Odoo",
  MODULE_USUARIOS: "Usuarios",
};

const ROLES: Role[] = ["CUSTOMER", "ADMIN", "SELLER", "PACKING", "SUPERADMIN"];
const STATUSES: Status[] = ["ACTIVE", "INACTIVE", "SUSPENDED"];

export default function UsuariosPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "SELLER" as Role });
  const [permUserId, setPermUserId] = useState<string | null>(null);
  const [perms, setPerms] = useState<ModulePermission[]>([]);

  const loadUsers = async () => {
    setLoading(true);
    const res = await fetch("/api/panel/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users);
    } else {
      setError("No autorizado o error al cargar usuarios");
    }
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const createUser = async () => {
    setError("");
    const res = await fetch("/api/panel/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ fullName: "", email: "", password: "", role: "SELLER" });
      setCreating(false);
      loadUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error al crear usuario");
    }
  };

  const updateUser = async (id: string, patch: Partial<Pick<UserRow, "role" | "status">>) => {
    const res = await fetch(`/api/panel/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) loadUsers();
  };

  const openPermissions = async (id: string) => {
    setPermUserId(id);
    const res = await fetch(`/api/panel/users/${id}/permissions`);
    if (res.ok) {
      const data = await res.json();
      setPerms(data.permissions);
    }
  };

  const togglePerm = (module: string, field: keyof Omit<ModulePermission, "module" | "isOverride">) => {
    setPerms((prev) => prev.map((p) => (p.module === module ? { ...p, [field]: !p[field] } : p)));
  };

  const savePermissions = async () => {
    if (!permUserId) return;
    const res = await fetch(`/api/panel/users/${permUserId}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        permissions: perms.map(({ module, canView, canCreate, canEdit, canDelete }) => ({
          module, canView, canCreate, canEdit, canDelete,
        })),
      }),
    });
    if (res.ok) setPermUserId(null);
  };

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Usuarios</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white"
        >
          {creating ? "Cancelar" : "Nuevo usuario"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-4">
          <input placeholder="Nombre completo" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Correo" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Contraseña" type="password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <button onClick={createUser} className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white">
            Crear
          </button>
        </div>
      )}

      <table className="w-full rounded-xl border border-[#E2E8F0] bg-white text-sm">
        <thead>
          <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
            <th className="p-3">Nombre</th>
            <th className="p-3">Correo</th>
            <th className="p-3">Rol</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Permisos</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-[#F1F5F9]">
              <td className="p-3">{u.fullName}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">
                <select value={u.role} onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}
                  className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs">
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </td>
              <td className="p-3">
                <select value={u.status} onChange={(e) => updateUser(u.id, { status: e.target.value as Status })}
                  className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="p-3">
                <button onClick={() => openPermissions(u.id)} className="text-xs font-bold text-[#27B1B8]">
                  Editar permisos
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {permUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-4">
            <h2 className="mb-3 text-sm font-black">Permisos por módulo</h2>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[#64748B]">
                  <th className="p-2">Módulo</th>
                  <th className="p-2">Ver</th>
                  <th className="p-2">Crear</th>
                  <th className="p-2">Editar</th>
                  <th className="p-2">Eliminar</th>
                </tr>
              </thead>
              <tbody>
                {perms.map((p) => (
                  <tr key={p.module} className="border-t border-[#F1F5F9]">
                    <td className="p-2 font-semibold">
                      {MODULE_LABELS[p.module] ?? p.module}
                      {p.isOverride && <span className="ml-1 text-[10px] text-[#27B1B8]">(personalizado)</span>}
                    </td>
                    {(["canView", "canCreate", "canEdit", "canDelete"] as const).map((field) => (
                      <td key={field} className="p-2">
                        <input type="checkbox" checked={p[field]} onChange={() => togglePerm(p.module, field)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setPermUserId(null)} className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-xs font-bold">
                Cancelar
              </button>
              <button onClick={savePermissions} className="rounded-lg bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual en navegador**

Con `npm run dev`, login como SUPERADMIN, ir a `/panel/usuarios`. Expected: tabla de usuarios, botón "Nuevo usuario" crea uno, cambiar rol/estado en un `<select>` persiste (recargar página lo confirma), "Editar permisos" abre el modal con 11 filas, togglear un checkbox y "Guardar" persiste (reabrir el modal lo confirma).

- [ ] **Step 4: Commit**

```bash
git add app/panel/usuarios/page.tsx
git commit -m "feat: agregar pagina de gestion de usuarios y permisos (SUPERADMIN)"
```

---

### Task 11: Sidebar dinámico según permisos efectivos

**Files:**
- Modify: `app/panel/layout.tsx`

**Interfaces:**
- Consumes: `GET /api/panel/permissions` (Task 9).

- [ ] **Step 1: Mapear cada `href` de `NAV` a su `PanelModule` y filtrar por `canView`**

Ubicar:

```tsx
type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  children?: Array<{ href: string; label: string }>;
};

const NAV: NavItem[] = [
  { href: "/panel",           label: "Dashboard", icon: <MdDashboard size={18} /> },
  { href: "/panel/pedidos",   label: "Pedidos",   icon: <MdInventory2 size={18} /> },
  { href: "/panel/productos", label: "Productos", icon: <MdCategory size={18} /> },
  { href: "/panel/metricas",  label: "Métricas",  icon: <MdBarChart size={18} /> },
  { href: "/panel/campanas",  label: "Campañas",  icon: <MdCampaign size={18} /> },
  { href: "/panel/costos",    label: "Costos",    icon: <MdAttachMoney size={18} /> },
  { href: "/panel/calculadora-precio", label: "Precio de Venta", icon: <MdCalculate size={18} /> },
  { href: "/panel/cotizaciones", label: "Cotizaciones", icon: <MdDescription size={18} /> },
  { href: "/panel/produccion", label: "Producción", icon: <MdPrecisionManufacturing size={18} /> },
  { href: "/panel/produccion/ordenes", label: "Órdenes de Producción", icon: <MdAssignment size={18} /> },
  {
    href: "/panel/odoo",
    label: "Odoo",
    icon: <MdSettings size={18} />,
    children: [
      { href: "/panel/odoo", label: "Resumen" },
      { href: "/panel/odoo/aplicaciones", label: "Aplicaciones" },
      { href: "/panel/odoo/asistente", label: "Asistente" },
      { href: "/panel/odoo/reportes", label: "Reportes" },
      { href: "/panel/odoo/productos", label: "Productos" },
      { href: "/panel/odoo/inventario", label: "Inventario" },
    ],
  },
];
```

Reemplazar por:

```tsx
type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  module: string;
  children?: Array<{ href: string; label: string }>;
};

const NAV: NavItem[] = [
  { href: "/panel",           label: "Dashboard", icon: <MdDashboard size={18} />, module: "MODULE_DASHBOARD" },
  { href: "/panel/pedidos",   label: "Pedidos",   icon: <MdInventory2 size={18} />, module: "MODULE_PEDIDOS" },
  { href: "/panel/productos", label: "Productos", icon: <MdCategory size={18} />, module: "MODULE_PRODUCTOS" },
  { href: "/panel/metricas",  label: "Métricas",  icon: <MdBarChart size={18} />, module: "MODULE_METRICAS" },
  { href: "/panel/campanas",  label: "Campañas",  icon: <MdCampaign size={18} />, module: "MODULE_CAMPANAS" },
  { href: "/panel/costos",    label: "Costos",    icon: <MdAttachMoney size={18} />, module: "MODULE_COSTOS" },
  { href: "/panel/calculadora-precio", label: "Precio de Venta", icon: <MdCalculate size={18} />, module: "MODULE_CALCULADORA_PRECIO" },
  { href: "/panel/cotizaciones", label: "Cotizaciones", icon: <MdDescription size={18} />, module: "MODULE_COTIZACIONES" },
  { href: "/panel/produccion", label: "Producción", icon: <MdPrecisionManufacturing size={18} />, module: "MODULE_PRODUCCION" },
  { href: "/panel/produccion/ordenes", label: "Órdenes de Producción", icon: <MdAssignment size={18} />, module: "MODULE_PRODUCCION" },
  {
    href: "/panel/odoo",
    label: "Odoo",
    icon: <MdSettings size={18} />,
    module: "MODULE_ODOO",
    children: [
      { href: "/panel/odoo", label: "Resumen" },
      { href: "/panel/odoo/aplicaciones", label: "Aplicaciones" },
      { href: "/panel/odoo/asistente", label: "Asistente" },
      { href: "/panel/odoo/reportes", label: "Reportes" },
      { href: "/panel/odoo/productos", label: "Productos" },
      { href: "/panel/odoo/inventario", label: "Inventario" },
    ],
  },
  { href: "/panel/usuarios", label: "Usuarios", icon: <MdSettings size={18} />, module: "MODULE_USUARIOS" },
];
```

- [ ] **Step 2: Cargar permisos y filtrar `NAV` antes de renderizar**

Ubicar:

```tsx
  const [user, setUser] = useState<{ fullName?: string; email?: string; role?: string } | null>(null);

  useEffect(() => {
    fetch("/api/account").then((r) => r.json()).then((d) => setUser(d)).catch(() => {});
  }, []);
```

Reemplazar por:

```tsx
  const [user, setUser] = useState<{ fullName?: string; email?: string; role?: string } | null>(null);
  const [visibleModules, setVisibleModules] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetch("/api/account").then((r) => r.json()).then((d) => setUser(d)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/panel/permissions")
      .then((r) => r.json())
      .then((d) => {
        const perms = d.permissions as Record<string, { canView: boolean }> | undefined;
        if (!perms) return;
        setVisibleModules(new Set(Object.entries(perms).filter(([, p]) => p.canView).map(([m]) => m)));
      })
      .catch(() => {});
  }, []);
```

- [ ] **Step 3: Filtrar `NAV` por `visibleModules` antes de mapear**

Ubicar dentro del IIFE de renderizado:

```tsx
          {(() => {
            const matches = (href: string) => pathname === href || (href !== "/panel" && pathname.startsWith(`${href}/`));
            const activeHref = NAV.filter((n) => matches(n.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
            return NAV.map((item) => {
```

Reemplazar por:

```tsx
          {(() => {
            const matches = (href: string) => pathname === href || (href !== "/panel" && pathname.startsWith(`${href}/`));
            const items = visibleModules ? NAV.filter((n) => visibleModules.has(n.module)) : NAV;
            const activeHref = items.filter((n) => matches(n.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
            return items.map((item) => {
```

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Verificación manual en navegador**

Login como SELLER con `MODULE_PRODUCCION` override en `canView: false` (setealo desde `/panel/usuarios` como SUPERADMIN primero). Expected: al recargar `/panel` como ese SELLER, "Producción" y "Órdenes de Producción" desaparecen del sidebar. Revertir el override y confirmar que reaparecen.

- [ ] **Step 6: Commit**

```bash
git add app/panel/layout.tsx
git commit -m "feat: filtrar sidebar del panel segun permisos efectivos"
```

---

### Task 12: Wire `MODULE_PEDIDOS` — `app/api/panel/orders/route.ts`

**Files:**
- Modify: `app/api/panel/orders/route.ts`

- [ ] **Step 1: Reemplazar el guard de `GET`**

Old:
```ts
export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function GET() {
  const access = await requirePermission("MODULE_PEDIDOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

- [ ] **Step 2: Reemplazar el guard de `PATCH`**

Old:
```ts
export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function PATCH(request: Request) {
  const access = await requirePermission("MODULE_PEDIDOS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

- [ ] **Step 3: Actualizar el import**

Old:
```ts
import { getSessionFromCookies } from "@/lib/auth";
```

New:
```ts
import { requirePermission } from "@/lib/permissions";
```

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores en este archivo.

- [ ] **Step 5: Verificación manual**

```bash
curl -i http://localhost:3000/api/panel/orders -H "Cookie: kliniu_session=<token PACKING>"
```
Expected: `200` (PACKING tiene `VIEW_EDIT` por default). Con un usuario `CUSTOMER`: `403`.

- [ ] **Step 6: Commit**

```bash
git add app/api/panel/orders/route.ts
git commit -m "feat: wire MODULE_PEDIDOS con requirePermission"
```

---

### Task 13: Wire `MODULE_PRODUCTOS` — `app/api/panel/products/route.ts`

**Files:**
- Modify: `app/api/panel/products/route.ts`

- [ ] **Step 1: Reemplazar el guard de `GET`**

Old:
```ts
export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function GET(request: Request) {
  const access = await requirePermission("MODULE_PRODUCTOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
```

- [ ] **Step 2: Reemplazar el guard de `PATCH`**

Old:
```ts
export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function PATCH(request: Request) {
  const access = await requirePermission("MODULE_PRODUCTOS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

- [ ] **Step 3: Actualizar el import**

Old:
```ts
import { getSessionFromCookies } from "@/lib/auth";
```

New:
```ts
import { requirePermission } from "@/lib/permissions";
```

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores. (`updateProductPrice(body.productId, ..., session.userId, ...)` en `PATCH` sigue funcionando porque `session` se desestructura de `access`.)

- [ ] **Step 5: Verificación manual**

```bash
curl -i http://localhost:3000/api/panel/products -H "Cookie: kliniu_session=<token SELLER>"
```
Expected: `200`.

- [ ] **Step 6: Commit**

```bash
git add app/api/panel/products/route.ts
git commit -m "feat: wire MODULE_PRODUCTOS con requirePermission"
```

---

### Task 14: Wire `MODULE_CAMPANAS` — familia de campañas (4 archivos)

**Files:**
- Modify: `app/api/panel/campaigns/route.ts`
- Modify: `app/api/panel/campaigns/[id]/route.ts`
- Modify: `app/api/panel/campaigns/[id]/days/route.ts`
- Modify: `app/api/panel/campaign-days/[id]/route.ts`

- [ ] **Step 1: `campaigns/route.ts` — `GET` (view) y `POST` (create)**

Old:
```ts
import { getSessionFromCookies } from "@/lib/auth";
import { getCampaignsForPanel } from "@/lib/panel";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
import { requirePermission } from "@/lib/permissions";
import { getCampaignsForPanel } from "@/lib/panel";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("MODULE_CAMPANAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

Old:
```ts
export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function POST(request: Request) {
  const access = await requirePermission("MODULE_CAMPANAS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

- [ ] **Step 2: `campaigns/[id]/route.ts` — `PATCH` (edit) y `DELETE` (admin estricto)**

Old:
```ts
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
import { requirePermission, requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

Old:
```ts
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "Solo ADMIN puede eliminar" }, { status: 403 });
  }
```

New:
```ts
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireAdmin();
  if (!access.ok) return Response.json({ error: "Solo ADMIN puede eliminar" }, { status: access.status });
```

- [ ] **Step 3: `campaigns/[id]/days/route.ts` — `GET` (view) y `POST` (create)**

Old import + `assertAccess` firma (sin cambio en `assertAccess`, solo el guard de sesión):
```ts
import { getSessionFromCookies } from "@/lib/auth";
```

New:
```ts
import { requirePermission } from "@/lib/permissions";
```

Old:
```ts
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

Old:
```ts
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

- [ ] **Step 4: `campaign-days/[id]/route.ts` — `PATCH` (edit) y `DELETE` (delete)**

Old import:
```ts
import { getSessionFromCookies } from "@/lib/auth";
```

New:
```ts
import { requirePermission } from "@/lib/permissions";
```

Old:
```ts
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

Old:
```ts
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

- [ ] **Step 5: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores en los 4 archivos.

- [ ] **Step 6: Verificación manual**

```bash
curl -i http://localhost:3000/api/panel/campaigns -H "Cookie: kliniu_session=<token SELLER>"
curl -i -X DELETE http://localhost:3000/api/panel/campaigns/<id> -H "Cookie: kliniu_session=<token SELLER>"
```
Expected: primero `200`, segundo `403` (DELETE es admin estricto).

- [ ] **Step 7: Commit**

```bash
git add app/api/panel/campaigns app/api/panel/campaign-days
git commit -m "feat: wire MODULE_CAMPANAS con requirePermission/requireAdmin"
```

---

### Task 15: Wire `MODULE_COSTOS` — `app/api/panel/costos/route.ts`

**Files:**
- Modify: `app/api/panel/costos/route.ts`

- [ ] **Step 1: Reemplazar el guard de `GET`**

Old:
```ts
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("MODULE_COSTOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

- [ ] **Step 2: Reemplazar el guard de `POST`**

Old:
```ts
export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function POST(req: Request) {
  const access = await requirePermission("MODULE_COSTOS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

- [ ] **Step 3: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

```bash
curl -i -X POST http://localhost:3000/api/panel/costos -H "Cookie: kliniu_session=<token SELLER>" -H "Content-Type: application/json" -d '{"costoProd":1}'
```
Expected: `200` (SELLER tiene `VIEW_CREATE_EDIT` por default).

- [ ] **Step 5: Commit**

```bash
git add app/api/panel/costos/route.ts
git commit -m "feat: wire MODULE_COSTOS con requirePermission"
```

---

### Task 16: Wire `MODULE_COTIZACIONES` — familia de cotizaciones + tax-config (9 archivos)

**Files:**
- Modify: `app/api/panel/quotations/route.ts`
- Modify: `app/api/panel/quotations/[id]/route.ts`
- Modify: `app/api/panel/quotations/items/[id]/route.ts`
- Modify: `app/api/panel/quotations/[id]/reject/route.ts`
- Modify: `app/api/panel/quotations/[id]/pdf/route.ts`
- Modify: `app/api/panel/quotations/[id]/approve/route.ts`
- Modify: `app/api/panel/quotations/[id]/items/route.ts`
- Modify: `app/api/panel/quotations/[id]/send/route.ts`
- Modify: `app/api/panel/quotations/[id]/convert/route.ts`
- Modify: `app/api/panel/quotation-tax-config/route.ts`

Todas comparten el mismo patrón de import y guard inicial; solo cambia la acción según el verbo. Aplicar en cada archivo:

- [ ] **Step 1: `quotations/route.ts`**

Reemplazar import `import { getSessionFromCookies } from "@/lib/auth";` por `import { requirePermission } from "@/lib/permissions";`.

`GET`: reemplazar
```ts
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```
por
```ts
  const access = await requirePermission("MODULE_COTIZACIONES", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

`POST`: mismo reemplazo pero con `requirePermission("MODULE_COTIZACIONES", "create")`.

- [ ] **Step 2: `quotations/[id]/route.ts`**

Import igual al Step 1. `GET` → `"view"`, `PATCH` → `"edit"`, `DELETE` → `"delete"`. Mismo patrón de reemplazo en los 3 handlers (la función interna `loadWithAccess` no cambia, sigue usando `session.role`/`session.userId` que ahora vienen de `access.session`).

- [ ] **Step 3: `quotations/items/[id]/route.ts`**

Import igual. `PATCH` → `"edit"`, `DELETE` → `"delete"`.

- [ ] **Step 4: `quotations/[id]/reject/route.ts`, `approve/route.ts`, `items/route.ts`, `send/route.ts`, `convert/route.ts`**

Import igual en los 5. Todos son `POST` con el mismo guard actual (`ADMIN`/`SELLER`); mapear cada uno a `"edit"` (son transiciones de estado de una cotización existente, no altas nuevas):

Old (idéntico en los 5 archivos):
```ts
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New (idéntico en los 5 archivos):
```ts
  const access = await requirePermission("MODULE_COTIZACIONES", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

Excepción: `quotations/[id]/items/route.ts` es un `POST` que **crea** un ítem — usar `"create"` en vez de `"edit"`.

- [ ] **Step 5: `quotation-tax-config/route.ts`**

Import: `import { requirePermission, requireAdmin } from "@/lib/permissions";` (en vez de `getSessionFromCookies`).

`GET`: reemplazar
```ts
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```
por
```ts
  const access = await requirePermission("MODULE_COTIZACIONES", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
```

`PATCH`: reemplazar
```ts
  const session = await getSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```
por
```ts
  const access = await requireAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
```

- [ ] **Step 6: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores en los 10 archivos. Prestar atención a `quotations/[id]/pdf/route.ts`, que también usa `cookies()` directamente para el token de Playwright — no tocar esa parte, solo el guard inicial (mismo patrón que Step 4).

- [ ] **Step 7: Verificación manual**

```bash
curl -i http://localhost:3000/api/panel/quotations -H "Cookie: kliniu_session=<token SELLER>"
curl -i -X PATCH http://localhost:3000/api/panel/quotation-tax-config -H "Cookie: kliniu_session=<token SELLER>" -H "Content-Type: application/json" -d '{"ivaPct":19}'
```
Expected: primero `200`; segundo `403` (tax-config PATCH es admin estricto).

- [ ] **Step 8: Commit**

```bash
git add app/api/panel/quotations app/api/panel/quotation-tax-config
git commit -m "feat: wire MODULE_COTIZACIONES con requirePermission/requireAdmin"
```

---

### Task 17: Wire `MODULE_CALCULADORA_PRECIO` — familia sale-calculators (5 archivos)

**Files:**
- Modify: `app/api/panel/sale-calculators/route.ts`
- Modify: `app/api/panel/sale-calculators/[id]/route.ts`
- Modify: `app/api/panel/sale-calculators/[id]/duplicate/route.ts`
- Modify: `app/api/panel/sale-calculators/[id]/items/route.ts`
- Modify: `app/api/panel/sale-calculator-items/[id]/route.ts`

En los 5 archivos, reemplazar el import:

Old: `import { getSessionFromCookies } from "@/lib/auth";`
New: `import { requirePermission } from "@/lib/permissions";`

- [ ] **Step 1: `sale-calculators/route.ts`** — `GET` → `"view"`, `POST` → `"create"`. Mismo patrón de reemplazo de guard que Task 16 Step 1.

- [ ] **Step 2: `sale-calculators/[id]/route.ts`** — `GET` → `"view"`, `PATCH` → `"edit"`, `DELETE` → `"delete"`. `loadWithAccess` no cambia.

- [ ] **Step 3: `sale-calculators/[id]/duplicate/route.ts`** — `POST` → `"create"` (duplica = crea uno nuevo).

- [ ] **Step 4: `sale-calculators/[id]/items/route.ts`** — `POST` → `"create"`.

- [ ] **Step 5: `sale-calculator-items/[id]/route.ts`** — `PATCH` → `"edit"`, `DELETE` → `"delete"`.

Patrón de reemplazo idéntico en todos (ejemplo con `sale-calculators/route.ts` `GET`):

Old:
```ts
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
  const access = await requirePermission("MODULE_CALCULADORA_PRECIO", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

(sustituir `"view"` por la acción correspondiente en cada handler según el mapeo de los Steps 1-5).

- [ ] **Step 6: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores en los 5 archivos.

- [ ] **Step 7: Verificación manual**

```bash
curl -i -X POST http://localhost:3000/api/panel/sale-calculators -H "Cookie: kliniu_session=<token SELLER>" -H "Content-Type: application/json" -d '{"name":"test"}'
```
Expected: `200`.

- [ ] **Step 8: Commit**

```bash
git add app/api/panel/sale-calculators app/api/panel/sale-calculator-items
git commit -m "feat: wire MODULE_CALCULADORA_PRECIO con requirePermission"
```

---

### Task 18: Wire `MODULE_PRODUCCION` — machines, operators, orders, runs (13 archivos)

**Files:**
- Modify: `app/api/panel/machines/route.ts`
- Modify: `app/api/panel/machines/[id]/route.ts`
- Modify: `app/api/panel/production-operators/route.ts`
- Modify: `app/api/panel/production-orders/route.ts`
- Modify: `app/api/panel/production-orders/[id]/route.ts`
- Modify: `app/api/panel/production-orders/items/[id]/route.ts`
- Modify: `app/api/panel/production-orders/[id]/cancel/route.ts`
- Modify: `app/api/panel/production-orders/[id]/complete/route.ts`
- Modify: `app/api/panel/production-orders/[id]/start/route.ts`
- Modify: `app/api/panel/production-orders/[id]/approve/route.ts`
- Modify: `app/api/panel/production-orders/[id]/items/route.ts`
- Modify: `app/api/panel/production-runs/route.ts`
- Modify: `app/api/panel/production-runs/[id]/route.ts`

- [ ] **Step 1: `machines/route.ts` — `GET` (view, cualquiera con permiso) y `POST` (admin estricto)**

Old:
```ts
import { getSessionFromCookies } from "@/lib/auth";
import { createMachine, getMachines } from "@/lib/panel";

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
import { requirePermission, requireAdmin } from "@/lib/permissions";
import { createMachine, getMachines } from "@/lib/panel";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
```

Old:
```ts
export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
export async function POST(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
```

- [ ] **Step 2: `machines/[id]/route.ts` — `PATCH` y `DELETE` (ambos admin estricto)**

Old (idéntico en ambos handlers):
```ts
import { getSessionFromCookies } from "@/lib/auth";
```
New:
```ts
import { requireAdmin } from "@/lib/permissions";
```

Old (en `PATCH` y en `DELETE`, idéntico):
```ts
  const session = await getSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
  const access = await requireAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
```

- [ ] **Step 3: `production-operators/route.ts` — `GET` (view)**

Old:
```ts
import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```

New:
```ts
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
```

- [ ] **Step 4: `production-orders/route.ts` — `GET` (view) y `POST` (create)**

Old import: `import { getSessionFromCookies } from "@/lib/auth";` → New: `import { requirePermission } from "@/lib/permissions";`

`GET` old:
```ts
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```
New:
```ts
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
```

`POST` old (usa `session.userId` en el body de creación, atención):
```ts
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```
New:
```ts
  const access = await requirePermission("MODULE_PRODUCCION", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
```

- [ ] **Step 5: `production-orders/[id]/route.ts` — `GET` (view), `PATCH` (edit), `DELETE` (delete)**

Mismo import que Step 4. Reemplazar cada uno de los 3 bloques idénticos:
```ts
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
```
por (con la acción correspondiente a cada handler):
```ts
  const access = await requirePermission("MODULE_PRODUCCION", "<view|edit|delete>");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
```

- [ ] **Step 6: `production-orders/items/[id]/route.ts` — `PATCH` (edit), `DELETE` (delete)**

Mismo import e igual patrón que Step 5, con `"edit"` en `PATCH` y `"delete"` en `DELETE`.

- [ ] **Step 7: `production-orders/[id]/cancel/route.ts`, `complete/route.ts`, `start/route.ts`, `approve/route.ts`, `items/route.ts`**

Todos `POST`. Mismo import (`requirePermission`). Mapeo de acción: `cancel`/`complete`/`start`/`approve` → `"edit"` (transición de estado sobre una orden existente); `items/route.ts` → `"create"` (agrega un ítem nuevo). Mismo patrón de reemplazo que Step 5 en los 5 archivos.

- [ ] **Step 8: `production-runs/route.ts` — `GET` (view), `POST` (create)**

Mismo import que Step 4. `GET` → `"view"`, `POST` → `"create"` (atención: `POST` usa varias variables `session`-derivadas indirectamente no, revisar que no se rompa nada — no usa `session` en el cuerpo, solo el guard).

- [ ] **Step 9: `production-runs/[id]/route.ts` — `GET` (view), `PATCH` (edit), `DELETE` (delete)**

Mismo import, mismo patrón que Step 5 en los 3 handlers.

- [ ] **Step 10: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores en los 13 archivos.

- [ ] **Step 11: Verificación manual**

```bash
curl -i http://localhost:3000/api/panel/machines -H "Cookie: kliniu_session=<token PACKING>"
curl -i -X POST http://localhost:3000/api/panel/machines -H "Cookie: kliniu_session=<token PACKING>" -H "Content-Type: application/json" -d '{"code":1,"name":"M1","brand":"X"}'
curl -i http://localhost:3000/api/panel/production-orders -H "Cookie: kliniu_session=<token PACKING>"
```
Expected: primero `200` (view permitido), segundo `403` (POST es admin estricto), tercero `200` (PACKING tiene FULL en `MODULE_PRODUCCION`).

- [ ] **Step 12: Commit**

```bash
git add app/api/panel/machines app/api/panel/production-operators app/api/panel/production-orders app/api/panel/production-runs
git commit -m "feat: wire MODULE_PRODUCCION con requirePermission/requireAdmin"
```

---

### Task 19: Wire páginas server-side — Dashboard, Métricas, Odoo (8 archivos)

**Files:**
- Modify: `app/panel/page.tsx`
- Modify: `app/panel/metricas/page.tsx`
- Modify: `app/panel/odoo/page.tsx`
- Modify: `app/panel/odoo/aplicaciones/page.tsx`
- Modify: `app/panel/odoo/asistente/page.tsx`
- Modify: `app/panel/odoo/reportes/page.tsx`
- Modify: `app/panel/odoo/productos/page.tsx`
- Modify: `app/panel/odoo/inventario/page.tsx`

Estas páginas son Server Components que hoy hacen `redirect("/login")` si el rol no es `ADMIN`/`SELLER`. El resto de páginas del panel (`pedidos`, `productos`, `campanas`, `costos`, `calculadora-precio`, `cotizaciones`, `produccion`, `produccion/ordenes`) son `"use client"` sin guard propio — quedan protegidas transitivamente por sus llamadas a la API ya wireada (Tasks 12-18) y por el sidebar (Task 11); no se tocan en este plan.

- [ ] **Step 1: `app/panel/page.tsx` (Dashboard) — `MODULE_DASHBOARD`, acción `view`**

Old:
```ts
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
```
más abajo:
```ts
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    redirect("/login");
```

New:
```ts
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
```
más abajo:
```ts
  const access = await requirePermission("MODULE_DASHBOARD", "view");
  if (!access.ok) {
    redirect("/login");
```

Si el archivo usa `session.role`/`session.userId` más abajo en el mismo componente, agregar `const { session } = access;` justo después del bloque anterior (revisar el resto del archivo antes de guardar — según lo visto, `page.tsx:20` usa `session.role === "ADMIN"`, así que sí hace falta esa línea).

- [ ] **Step 2: `app/panel/metricas/page.tsx` — `MODULE_METRICAS`, acción `view`**

Mismo patrón que Step 1, cambiando el módulo a `"MODULE_METRICAS"`. El archivo usa `session.role === "SELLER"` más abajo (`metricas/page.tsx:18`), agregar `const { session } = access;`.

- [ ] **Step 3: Las 6 páginas de Odoo — `MODULE_ODOO`, acción `view`**

En cada uno de `app/panel/odoo/page.tsx`, `aplicaciones/page.tsx`, `asistente/page.tsx`, `reportes/page.tsx`, `productos/page.tsx`, `inventario/page.tsx`, aplicar el mismo patrón:

Old:
```ts
import { getSessionFromCookies } from "@/lib/auth";
```
```ts
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    redirect("/login");
```

New:
```ts
import { requirePermission } from "@/lib/permissions";
```
```ts
  const access = await requirePermission("MODULE_ODOO", "view");
  if (!access.ok) {
    redirect("/login");
```

Si el resto del componente referencia `session.*`, agregar `const { session } = access;` después del bloque de redirect (revisar cada archivo individualmente antes de guardar).

- [ ] **Step 4: Verificar compilación**

Run: `npx tsc --noEmit`
Expected: sin errores en los 8 archivos.

- [ ] **Step 5: Verificación manual en navegador**

Login como PACKING (tiene `MODULE_ODOO: NONE` y `MODULE_DASHBOARD: NONE` por default), navegar a `/panel` y a `/panel/odoo`. Expected: ambos redirigen a `/login` (comportamiento igual al actual, solo que ahora pasa por permisos en vez de rol hardcodeado).

- [ ] **Step 6: Commit**

```bash
git add app/panel/page.tsx app/panel/metricas/page.tsx app/panel/odoo
git commit -m "feat: wire MODULE_DASHBOARD/MODULE_METRICAS/MODULE_ODOO en paginas server-side"
```

---

### Task 20: Verificación end-to-end manual

**Files:** ninguno (solo verificación).

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: build exitoso sin errores de tipo.

- [ ] **Step 2: Flujo SUPERADMIN completo**

1. Login como SUPERADMIN → llega a `/panel`.
2. `/panel/usuarios` visible en sidebar, resto de módulos también (SUPERADMIN bypass).
3. Crear un usuario `SELLER` nuevo desde la UI.
4. Loguear con ese usuario nuevo en otra sesión/incógnito → debe ver el sidebar según `DEFAULT_PERMISSIONS.SELLER` (sin "Producción" con flags NONE... espera, SELLER tiene FULL en Producción por la matriz — debe verlo; sin "Usuarios").
5. Desde SUPERADMIN, abrir "Editar permisos" de ese SELLER, quitar `canView` de `MODULE_CAMPANAS`, guardar.
6. Recargar sesión del SELLER → "Campañas" desaparece del sidebar; `curl /api/panel/campaigns` con su cookie devuelve `403`.
7. Desde SUPERADMIN, cambiar `status` del SELLER a `SUSPENDED`.
8. Intentar login con ese SELLER → `403 USER_NOT_ACTIVE`.

Expected: los 8 pasos se comportan como se describe.

- [ ] **Step 3: Regresión de roles existentes**

Login como ADMIN, SELLER y PACKING preexistentes (creados antes de esta migración, `status` default `ACTIVE`, sin overrides). Expected: acceso idéntico al que tenían antes de este cambio (la matriz `DEFAULT_PERMISSIONS` fue derivada 1:1 de los guards que existían).

- [ ] **Step 4: Commit final (si hubo ajustes durante la verificación)**

```bash
git add -A
git commit -m "fix: ajustes de verificacion end-to-end del sistema de permisos"
```
