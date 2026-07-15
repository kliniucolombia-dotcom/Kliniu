# Bodegas y Stock por Ubicación Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el stock global único por 3 bodegas fijas (Materia prima/moldes,
Piezas importadas, Producto terminado) con historial de movimientos, manteniendo
`Product.stock` como total calculado y sin romper la sync de Odoo ni el form de
crear/editar producto.

**Architecture:** Nuevos modelos Prisma (`Warehouse`, `ProductWarehouseStock`,
`WarehouseMovement`) con lógica centralizada en `lib/warehouses.ts`. Un único punto de
recálculo (`recalculateProductStock`) escribe siempre el total en `Product.stock`. El
form de producto y la sync de Odoo pasan a escribir en la bodega "Producto terminado" en
vez de tocar `Product.stock` directo. Nueva sección `/panel/bodegas` (rol BODEGA edita,
ADMIN/INGENIERIA solo ven) con 3 endpoints: listar, ajuste (entrada/salida) y
transferencia.

**Tech Stack:** Next.js App Router, Prisma (`@/generated/prisma/client`), Supabase
Postgres, React (client component) para la UI del panel.

## Global Constraints

- Spec de referencia: `docs/superpowers/specs/2026-07-15-bodegas-stock-design.md` — toda
  ambigüedad se resuelve releyendo ese archivo, no inventando variantes.
- Este repo **no tiene test runner** (no jest/vitest en `package.json`). La verificación
  de cada tarea es: `npx tsc --noEmit` sin errores nuevos, y donde aplique, un chequeo
  manual (`curl` a la ruta API en local, o Playwright/browser real para UI) — sigue el
  patrón ya usado en el resto del proyecto (ver memoria `feedback-test-before-push`).
- Todas las escrituras nuevas de bodegas usan el cliente Prisma (`@/lib/prisma`), igual
  que `lib/banners.ts` — **no** `supabaseDb` (el cliente Supabase crudo que usa el código
  legado de `lib/products.ts` para `Product`/`InventoryMovement`). Ambos clientes escriben
  a la misma tabla Postgres subyacente, así que mezclar Prisma para las tablas nuevas y
  Supabase para las viejas es seguro.
- `note` en `WarehouseMovement` es siempre texto libre para mostrar en UI — ningún código
  compara ni bifurca lógica sobre su contenido. La intención (manual/Odoo/sistema) vive
  únicamente en el campo `source`.
- Ningún código nuevo escribe en `InventoryMovement` — esa tabla queda congelada tal cual
  está, solo para lo que ya la usaba (`/admin`, `getRecentInventoryMovements`).
- Comandos npm relevantes: `npm run db:generate` (= `prisma generate`), `npm run db:push`
  (= `prisma db push`, aplica el schema directo a la base de producción en Supabase — es
  el flujo real de este repo, no hay carpeta `prisma/migrations`).

---

## Task 1: Schema Prisma — modelos de bodegas y permiso nuevo

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: modelos `Warehouse`, `ProductWarehouseStock`, `WarehouseMovement`; enums
  `WarehouseMovementType` (`ENTRADA`, `SALIDA`, `TRANSFERENCIA`), `WarehouseMovementSource`
  (`USER`, `ODOO`, `SYSTEM`); valor `MODULE_BODEGAS` en enum `PanelModule`; relaciones
  `Product.warehouseStocks` (`ProductWarehouseStock[]`) y
  `Product.warehouseMovements` (`WarehouseMovement[]`).

- [ ] **Step 1: Agregar `MODULE_BODEGAS` al enum `PanelModule`**

En `prisma/schema.prisma`, dentro de `enum PanelModule` (línea ~386-402), agregar la
última línea antes del cierre:

```prisma
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
  MODULE_BANNERS
  MODULE_COMBOS
  MODULE_RRHH
  MODULE_OUTLET
  MODULE_BODEGAS
}
```

- [ ] **Step 2: Agregar relaciones nuevas en `model Product`**

En `model Product` (línea ~10-45), agregar dos líneas al final del bloque de relaciones
(justo antes del `}` que cierra el modelo, después de `comboItems`):

```prisma
  comboItems            ComboItem[]
  warehouseStocks       ProductWarehouseStock[]
  warehouseMovements    WarehouseMovement[]
}
```

- [ ] **Step 3: Agregar los enums y modelos nuevos**

Al final de `prisma/schema.prisma`, agregar:

```prisma
enum WarehouseMovementType {
  ENTRADA
  SALIDA
  TRANSFERENCIA
}

enum WarehouseMovementSource {
  USER
  ODOO
  SYSTEM
}

model Warehouse {
  id            String                  @id @default(cuid())
  key           String                  @unique
  name          String
  order         Int
  stocks        ProductWarehouseStock[]
  movementsFrom WarehouseMovement[]     @relation("MovementFrom")
  movementsTo   WarehouseMovement[]     @relation("MovementTo")
}

model ProductWarehouseStock {
  id          String    @id @default(cuid())
  productId   String
  warehouseId String
  quantity    Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])

  @@unique([productId, warehouseId])
  @@index([warehouseId])
  @@index([productId])
}

model WarehouseMovement {
  id              String                  @id @default(cuid())
  productId       String
  type            WarehouseMovementType
  source          WarehouseMovementSource
  quantity        Int
  fromWarehouseId String?
  toWarehouseId   String?
  note            String?
  userId          String
  createdAt       DateTime                @default(now())
  product         Product                 @relation(fields: [productId], references: [id], onDelete: Cascade)
  fromWarehouse   Warehouse?              @relation("MovementFrom", fields: [fromWarehouseId], references: [id])
  toWarehouse     Warehouse?              @relation("MovementTo", fields: [toWarehouseId], references: [id])

  @@index([productId])
  @@index([fromWarehouseId])
  @@index([toWarehouseId])
}
```

- [ ] **Step 4: Generar el cliente Prisma y verificar tipos**

Run: `npm run db:generate`
Expected: termina sin errores, imprime "Generated Prisma Client".

Run: `npx tsc --noEmit`
Expected: sin errores nuevos relacionados a `prisma/schema.prisma` (los modelos nuevos
aún no se usan en ningún `.ts`, así que no debe haber errores de tipos todavía).

- [ ] **Step 5: Aplicar el schema a la base de datos**

Run: `npm run db:push`
Expected: Prisma reporta las tablas `Warehouse`, `ProductWarehouseStock`,
`WarehouseMovement` creadas y la columna nueva del enum `PanelModule` aplicada, sin
pérdida de datos en las tablas existentes.

**Nota para quien ejecute este paso:** `db:push` escribe directo sobre la base de
producción en Supabase (no hay entorno de staging separado en este repo). Confirma con
el usuario antes de correrlo si no es obvio que ya se aprobó.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: agrega modelos de bodegas (Warehouse, ProductWarehouseStock, WarehouseMovement)"
```

---

## Task 2: Permisos — `MODULE_BODEGAS` en `permission-defaults.ts`

**Files:**
- Modify: `lib/permission-defaults.ts`

**Interfaces:**
- Consumes: enum `PanelModule` (Task 1, ahora incluye `MODULE_BODEGAS`).
- Produces: `DEFAULT_PERMISSIONS[*].MODULE_BODEGAS` para todos los roles;
  `ALL_MODULES` incluye `"MODULE_BODEGAS"`.

- [ ] **Step 1: Agregar `MODULE_BODEGAS: NONE` a todos los roles excepto BODEGA/ADMIN/INGENIERIA**

En `lib/permission-defaults.ts`, cada bloque de rol dentro de `DEFAULT_PERMISSIONS` tiene
una línea `MODULE_OUTLET: <algo>,` seguida del `}` que cierra el rol. Justo después de esa
línea, en **cada** rol (`ADMIN`, `SELLER`, `PACKING`, `CUSTOMER`, `RRHH`, `EMPLOYEE`,
`BODEGA`, `DISENO`, `MARKETING`, `JEFE_VENTAS`, `TESORERIA`, `INGENIERIA`), agregar la
línea de `MODULE_BODEGAS` correspondiente:

Para `ADMIN` (ya tiene `MODULE_OUTLET: NONE`):
```prisma
    MODULE_OUTLET: NONE,
    MODULE_BODEGAS: VIEW_ONLY,
  },
```

Para `INGENIERIA` (el último rol del archivo, tiene `MODULE_OUTLET: NONE`):
```prisma
    MODULE_OUTLET: NONE,
    MODULE_BODEGAS: VIEW_ONLY,
  },
};
```

Para `BODEGA` (tiene `MODULE_OUTLET: NONE` — confirmar leyendo el bloque real del rol
antes de editar, ya que el resto de módulos de ese rol es distinto a los demás):
```prisma
    MODULE_OUTLET: NONE,
    MODULE_BODEGAS: VIEW_CREATE_EDIT,
  },
```

Para el resto de roles (`SELLER`, `PACKING`, `CUSTOMER`, `RRHH`, `EMPLOYEE`, `DISENO`,
`MARKETING`, `JEFE_VENTAS`, `TESORERIA`):
```prisma
    MODULE_OUTLET: <lo que ya tenga ese rol, sin tocar>,
    MODULE_BODEGAS: NONE,
  },
```

(El valor de `MODULE_BODEGAS` es independiente del valor de `MODULE_OUTLET` de cada rol —
solo se usa esa línea como ancla porque es la última de cada bloque. No cambiar ningún
otro valor existente.)

- [ ] **Step 2: Agregar `"MODULE_BODEGAS"` a `ALL_MODULES`**

Al final del archivo:

```typescript
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
  "MODULE_BANNERS",
  "MODULE_COMBOS",
  "MODULE_RRHH",
  "MODULE_OUTLET",
  "MODULE_BODEGAS",
];
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores. Si falta `MODULE_BODEGAS` en algún rol, TypeScript marca el
`Record<PanelModule, Permission>` de ese rol como incompleto — corregir el rol que falte.

- [ ] **Step 4: Commit**

```bash
git add lib/permission-defaults.ts
git commit -m "feat: agrega permisos MODULE_BODEGAS por rol"
```

---

## Task 3: `lib/warehouses.ts` — núcleo (catálogo, usuario sistema, recálculo)

**Files:**
- Create: `lib/warehouses.ts`

**Interfaces:**
- Consumes: `prisma` de `@/lib/prisma`; tipos `Prisma`, `WarehouseMovementSource`,
  `WarehouseMovementType` de `@/generated/prisma/client`.
- Produces (usados por Tasks 4, 5, 6, 8, 9, 10, 11):
  - `export const WAREHOUSE_KEYS = { MATERIA_PRIMA_MOLDES, PIEZAS_IMPORTADAS, PRODUCTO_TERMINADO }`
  - `export async function getWarehouses(): Promise<Warehouse[]>` (ordenadas por `order`)
  - `export async function getWarehouseByKey(key: string): Promise<Warehouse>` (lanza si no existe)
  - `export async function getSystemUserId(): Promise<string>`
  - `export async function recalculateProductStock(tx: Prisma.TransactionClient, productId: string): Promise<number>`

- [ ] **Step 1: Escribir el archivo con catálogo, usuario sistema y recálculo**

```typescript
import { prisma } from "@/lib/prisma";
import type { Prisma, Warehouse } from "@/generated/prisma/client";

export const WAREHOUSE_KEYS = {
  MATERIA_PRIMA_MOLDES: "MATERIA_PRIMA_MOLDES",
  PIEZAS_IMPORTADAS: "PIEZAS_IMPORTADAS",
  PRODUCTO_TERMINADO: "PRODUCTO_TERMINADO",
} as const;

export type WarehouseKey = (typeof WAREHOUSE_KEYS)[keyof typeof WAREHOUSE_KEYS];

const SYSTEM_USER_EMAIL = "system@kliniu.internal";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

export async function getWarehouses(): Promise<Warehouse[]> {
  const db = requirePrisma();
  return db.warehouse.findMany({ orderBy: { order: "asc" } });
}

export async function getWarehouseByKey(key: WarehouseKey): Promise<Warehouse> {
  const db = requirePrisma();
  const warehouse = await db.warehouse.findUnique({ where: { key } });
  if (!warehouse) {
    throw new Error(`WAREHOUSE_NOT_FOUND:${key}`);
  }
  return warehouse;
}

let cachedSystemUserId: string | null = null;

export async function getSystemUserId(): Promise<string> {
  if (cachedSystemUserId) return cachedSystemUserId;

  const db = requirePrisma();
  const user = await db.user.findUnique({ where: { email: SYSTEM_USER_EMAIL } });
  if (!user) {
    throw new Error(
      "SYSTEM_USER_NOT_FOUND: corre scripts/seed-warehouses.ts antes de usar el módulo de bodegas",
    );
  }
  cachedSystemUserId = user.id;
  return user.id;
}

function computeAvailability(stock: number, minimumStock: number): string {
  if (stock <= 0) return "Agotado";
  if (stock <= minimumStock) return "Disponible por pedido";
  return "Entrega inmediata";
}

export async function recalculateProductStock(
  tx: Prisma.TransactionClient,
  productId: string,
): Promise<number> {
  const [{ _sum }, product] = await Promise.all([
    tx.productWarehouseStock.aggregate({
      where: { productId },
      _sum: { quantity: true },
    }),
    tx.product.findUniqueOrThrow({
      where: { id: productId },
      select: { minimumStock: true },
    }),
  ]);

  const total = _sum.quantity ?? 0;

  await tx.product.update({
    where: { id: productId },
    data: {
      stock: total,
      availability: computeAvailability(total, product.minimumStock),
    },
  });

  return total;
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores. Si `Prisma.TransactionClient` no resuelve, revisar que
`@/generated/prisma/client` exporte `Prisma` (ya lo hace — `lib/banners.ts` lo importa
igual en la línea 2).

- [ ] **Step 3: Commit**

```bash
git add lib/warehouses.ts
git commit -m "feat: agrega núcleo de lib/warehouses (catálogo, usuario sistema, recálculo de stock)"
```

---

## Task 4: `lib/warehouses.ts` — mutaciones (set absoluto, ajuste, transferencia, listados)

**Files:**
- Modify: `lib/warehouses.ts`

**Interfaces:**
- Consumes: `WAREHOUSE_KEYS`, `getWarehouseByKey`, `getSystemUserId`,
  `recalculateProductStock` (Task 3).
- Produces (usados por Tasks 5, 6, 8, 9, 10):
  - `export async function setWarehouseStockAbsolute(input: { productId: string; warehouseKey: WarehouseKey; quantity: number; source: "USER" | "ODOO" | "SYSTEM"; userId?: string; note?: string }): Promise<number>`
  - `export async function adjustWarehouseStock(input: { productId: string; warehouseId: string; type: "ENTRADA" | "SALIDA"; quantity: number; userId: string; note?: string }): Promise<number>`
  - `export async function transferWarehouseStock(input: { productId: string; fromWarehouseId: string; toWarehouseId: string; quantity: number; userId: string; note?: string }): Promise<number>`
  - `export type ProductWithWarehouseStocks = { id: string; name: string; sku: string | null; minimumStock: number; stock: number; stocksByWarehouseId: Record<string, number> }`
  - `export async function listProductsWithWarehouseStock(): Promise<ProductWithWarehouseStocks[]>`
  - `export async function getWarehouseMovements(productId: string, limit?: number)`

- [ ] **Step 1: Agregar las funciones al final de `lib/warehouses.ts`**

```typescript
async function upsertStockRow(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
  nextQuantity: number,
) {
  await tx.productWarehouseStock.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    update: { quantity: nextQuantity },
    create: { productId, warehouseId, quantity: nextQuantity },
  });
}

async function currentQuantity(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
): Promise<number> {
  const row = await tx.productWarehouseStock.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  });
  return row?.quantity ?? 0;
}

export async function setWarehouseStockAbsolute(input: {
  productId: string;
  warehouseKey: WarehouseKey;
  quantity: number;
  source: "USER" | "ODOO" | "SYSTEM";
  userId?: string;
  note?: string;
}): Promise<number> {
  const db = requirePrisma();
  const warehouse = await getWarehouseByKey(input.warehouseKey);
  const nextQuantity = Math.max(0, Math.round(input.quantity));
  const userId = input.userId ?? (await getSystemUserId());

  return db.$transaction(async (tx) => {
    const current = await currentQuantity(tx, input.productId, warehouse.id);
    const delta = nextQuantity - current;

    if (delta !== 0) {
      await tx.warehouseMovement.create({
        data: {
          productId: input.productId,
          type: delta > 0 ? "ENTRADA" : "SALIDA",
          source: input.source,
          quantity: Math.abs(delta),
          fromWarehouseId: delta > 0 ? null : warehouse.id,
          toWarehouseId: delta > 0 ? warehouse.id : null,
          note: input.note,
          userId,
        },
      });
      await upsertStockRow(tx, input.productId, warehouse.id, nextQuantity);
    }

    return recalculateProductStock(tx, input.productId);
  });
}

export async function adjustWarehouseStock(input: {
  productId: string;
  warehouseId: string;
  type: "ENTRADA" | "SALIDA";
  quantity: number;
  userId: string;
  note?: string;
}): Promise<number> {
  const db = requirePrisma();
  const quantity = Math.round(input.quantity);
  if (quantity <= 0) throw new Error("INVALID_QUANTITY");

  return db.$transaction(async (tx) => {
    const current = await currentQuantity(tx, input.productId, input.warehouseId);
    const nextQuantity = input.type === "ENTRADA" ? current + quantity : current - quantity;

    if (nextQuantity < 0) {
      throw new Error("INSUFFICIENT_STOCK");
    }

    await tx.warehouseMovement.create({
      data: {
        productId: input.productId,
        type: input.type,
        source: "USER",
        quantity,
        fromWarehouseId: input.type === "SALIDA" ? input.warehouseId : null,
        toWarehouseId: input.type === "ENTRADA" ? input.warehouseId : null,
        note: input.note,
        userId: input.userId,
      },
    });
    await upsertStockRow(tx, input.productId, input.warehouseId, nextQuantity);

    return recalculateProductStock(tx, input.productId);
  });
}

export async function transferWarehouseStock(input: {
  productId: string;
  fromWarehouseId: string;
  toWarehouseId: string;
  quantity: number;
  userId: string;
  note?: string;
}): Promise<number> {
  if (input.fromWarehouseId === input.toWarehouseId) {
    throw new Error("SAME_WAREHOUSE");
  }

  const db = requirePrisma();
  const quantity = Math.round(input.quantity);
  if (quantity <= 0) throw new Error("INVALID_QUANTITY");

  return db.$transaction(async (tx) => {
    const fromCurrent = await currentQuantity(tx, input.productId, input.fromWarehouseId);
    const nextFrom = fromCurrent - quantity;
    if (nextFrom < 0) throw new Error("INSUFFICIENT_STOCK");

    const toCurrent = await currentQuantity(tx, input.productId, input.toWarehouseId);

    await tx.warehouseMovement.create({
      data: {
        productId: input.productId,
        type: "TRANSFERENCIA",
        source: "USER",
        quantity,
        fromWarehouseId: input.fromWarehouseId,
        toWarehouseId: input.toWarehouseId,
        note: input.note,
        userId: input.userId,
      },
    });
    await upsertStockRow(tx, input.productId, input.fromWarehouseId, nextFrom);
    await upsertStockRow(tx, input.productId, input.toWarehouseId, toCurrent + quantity);

    return recalculateProductStock(tx, input.productId);
  });
}

export type ProductWithWarehouseStocks = {
  id: string;
  name: string;
  sku: string | null;
  minimumStock: number;
  stock: number;
  stocksByWarehouseId: Record<string, number>;
};

export async function listProductsWithWarehouseStock(): Promise<ProductWithWarehouseStocks[]> {
  const db = requirePrisma();
  const products = await db.product.findMany({
    where: { active: true },
    select: {
      id: true,
      name: true,
      sku: true,
      minimumStock: true,
      stock: true,
      warehouseStocks: { select: { warehouseId: true, quantity: true } },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    minimumStock: p.minimumStock,
    stock: p.stock,
    stocksByWarehouseId: Object.fromEntries(
      p.warehouseStocks.map((s) => [s.warehouseId, s.quantity]),
    ),
  }));
}

export async function getWarehouseMovements(productId: string, limit = 20) {
  const db = requirePrisma();
  return db.warehouseMovement.findMany({
    where: { productId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { fromWarehouse: true, toWarehouse: true },
  });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add lib/warehouses.ts
git commit -m "feat: agrega mutaciones de bodegas (set absoluto, ajuste, transferencia, listados)"
```

---

## Task 5: Script de seed — bodegas fijas, usuario sistema y migración del stock legado

**Files:**
- Create: `scripts/seed-warehouses.ts`

**Interfaces:**
- Consumes: cliente Prisma directo (patrón de `scripts/seed-machines.ts`), no
  `lib/warehouses.ts` (el script corre standalone antes de que exista el usuario sistema
  que esas funciones asumen disponible).

- [ ] **Step 1: Escribir el script**

```typescript
import { config as loadEnv } from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

loadEnv({ path: ".env.local" });
loadEnv();

const WAREHOUSES = [
  { key: "MATERIA_PRIMA_MOLDES", name: "Materia prima / moldes", order: 1 },
  { key: "PIEZAS_IMPORTADAS", name: "Piezas inyectadas / importadas", order: 2 },
  { key: "PRODUCTO_TERMINADO", name: "Producto terminado", order: 3 },
];

const SYSTEM_USER_EMAIL = "system@kliniu.internal";

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });

  for (const w of WAREHOUSES) {
    const warehouse = await prisma.warehouse.upsert({
      where: { key: w.key },
      update: { name: w.name, order: w.order },
      create: w,
    });
    console.log("Warehouse OK:", warehouse.key, warehouse.name);
  }

  const systemUser = await prisma.user.upsert({
    where: { email: SYSTEM_USER_EMAIL },
    update: {},
    create: {
      fullName: "Sistema (bodegas/Odoo)",
      email: SYSTEM_USER_EMAIL,
      passwordHash: "SYSTEM_ACCOUNT_NO_LOGIN",
      role: "INGENIERIA",
      status: "INACTIVE",
    },
  });
  console.log("System user OK:", systemUser.email);

  const productoTerminado = await prisma.warehouse.findUniqueOrThrow({
    where: { key: "PRODUCTO_TERMINADO" },
  });

  const products = await prisma.product.findMany({
    select: { id: true, stock: true },
  });

  let migrated = 0;
  for (const product of products) {
    const existing = await prisma.productWarehouseStock.findUnique({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: productoTerminado.id,
        },
      },
    });
    if (existing) continue;

    await prisma.productWarehouseStock.create({
      data: {
        productId: product.id,
        warehouseId: productoTerminado.id,
        quantity: product.stock,
      },
    });
    await prisma.warehouseMovement.create({
      data: {
        productId: product.id,
        type: "ENTRADA",
        source: "SYSTEM",
        quantity: product.stock,
        toWarehouseId: productoTerminado.id,
        note: "Migración inicial de stock legado",
        userId: systemUser.id,
      },
    });
    migrated++;
  }
  console.log(`Migrated ${migrated} products into PRODUCTO_TERMINADO.`);

  await prisma.$disconnect();
}

main();
```

- [ ] **Step 2: Correr el script**

Run: `npx tsx scripts/seed-warehouses.ts`
Expected: imprime las 3 bodegas OK, el usuario sistema OK, y
`Migrated N products into PRODUCTO_TERMINADO.` con N = cantidad de productos activos en
la base.

**Nota:** este script escribe sobre la base de datos configurada en `DATABASE_URL`
(producción, salvo que se apunte a otra). Confirmar con el usuario antes de correrlo si
no está ya aprobado, igual que el `db:push` de la Task 1.

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-warehouses.ts
git commit -m "feat: agrega script de seed para bodegas fijas, usuario sistema y migración de stock legado"
```

---

## Task 6: Conectar `syncStockFromOdoo` con la bodega "Producto terminado"

**Files:**
- Modify: `lib/products.ts:714-780` (función `syncStockFromOdoo`)

**Interfaces:**
- Consumes: `setWarehouseStockAbsolute`, `WAREHOUSE_KEYS` de `@/lib/warehouses` (Task 4).

- [ ] **Step 1: Reemplazar el cuerpo del loop para usar bodegas en vez de `Product.stock` directo**

En `lib/products.ts`, dentro de `syncStockFromOdoo`, reemplazar el bloque que va desde
`const { error: updateError } = await supabaseDb` hasta `result.updated++;` (líneas
~750-776) por:

```typescript
    await setWarehouseStockAbsolute({
      productId: product.id,
      warehouseKey: WAREHOUSE_KEYS.PRODUCTO_TERMINADO,
      quantity: nextStock,
      source: "ODOO",
      note: "Sincronización automática de stock desde Odoo",
    });

    const availability =
      nextStock <= 0
        ? "Agotado"
        : nextStock <= product.minimumStock
          ? "Disponible por pedido"
          : "Entrega inmediata";

    await supabaseDb
      .from("Product")
      .update({ availability, updatedAt: new Date().toISOString() })
      .eq("id", product.id);

    result.updated++;
```

(`setWarehouseStockAbsolute` ya deja `Product.stock` correcto vía
`recalculateProductStock` y ya recalcula `availability` con Prisma dentro de esa misma
función — el `update` de Supabase que queda aquí es redundante para `availability` pero
se mantiene por consistencia con el resto de columnas que sigue tocando el flujo legado
de Supabase. Si al revisar `recalculateProductStock` (Task 3) se confirma que ya deja
`availability` correcto, este segundo `update` puede omitirse — dejarlo comentado con una
nota si se omite, no borrarlo silenciosamente sin explicar por qué.)

Agregar el import al principio del archivo (junto a los demás imports):

```typescript
import { setWarehouseStockAbsolute, WAREHOUSE_KEYS } from "@/lib/warehouses";
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

Con la base ya migrada (Task 5), correr la sync de Odoo desde el panel (o el endpoint que
la dispare) para un producto con SKU conocido y confirmar en la tabla `WarehouseMovement`
(`npx prisma studio` o una query) que aparece un registro `source = ODOO` con
`toWarehouseId`/`fromWarehouseId` apuntando a "Producto terminado", y que
`Product.stock` de ese producto coincide con la suma de sus 3 bodegas.

- [ ] **Step 4: Commit**

```bash
git add lib/products.ts
git commit -m "feat: syncStockFromOdoo escribe en bodega Producto terminado en vez de Product.stock directo"
```

---

## Task 7: Conectar `createProduct`/`updateProduct` con la bodega "Producto terminado"

**Files:**
- Modify: `lib/products.ts:378-474` (`createProduct`), `lib/products.ts:476-595`
  (`updateProduct`)
- Modify: `app/api/products/route.ts:42-48` (`POST`)
- Modify: `app/api/products/[slug]/route.ts:42-52` (`PATCH`)

**Interfaces:**
- Consumes: `setWarehouseStockAbsolute`, `WAREHOUSE_KEYS` de `@/lib/warehouses`.
- Produces: `createProduct(input, actorUserId: string)` y
  `updateProduct(slug, input, actorUserId: string)` — firma cambia, ambos call sites se
  actualizan en este mismo task.

- [ ] **Step 1: `createProduct` — agregar parámetro y escribir en la bodega**

En `lib/products.ts`, cambiar la firma (línea 378):

```typescript
export async function createProduct(input: ProductMutationInput, actorUserId: string) {
```

Reemplazar el bloque (líneas ~463-471):

```typescript
  await supabaseDb.from("InventoryMovement").insert({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    productId: created.id,
    type: "CREATED",
    quantity: stock,
    stockAfter: stock,
    note: "Inventario inicial del producto",
  });

  return toStoreProduct(created as ProductRecord);
```

por:

```typescript
  await supabaseDb.from("InventoryMovement").insert({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    productId: created.id,
    type: "CREATED",
    quantity: stock,
    stockAfter: stock,
    note: "Inventario inicial del producto",
  });

  await setWarehouseStockAbsolute({
    productId: created.id,
    warehouseKey: WAREHOUSE_KEYS.PRODUCTO_TERMINADO,
    quantity: stock,
    source: "USER",
    userId: actorUserId,
    note: "Inventario inicial del producto",
  });

  return toStoreProduct(created as ProductRecord);
```

- [ ] **Step 2: `updateProduct` — agregar parámetro y escribir en la bodega**

Cambiar la firma (línea 476):

```typescript
export async function updateProduct(slug: string, input: ProductMutationInput, actorUserId: string) {
```

Reemplazar el bloque (líneas ~582-592):

```typescript
  if (stockDelta !== 0) {
    await supabaseDb.from("InventoryMovement").insert({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      productId: existingRecord.id,
      type: "ADJUSTMENT",
      quantity: stockDelta,
      stockAfter: stock,
      note: "Ajuste manual desde el panel admin",
    });
  }

  return toStoreProduct(updated as ProductRecord);
```

por:

```typescript
  if (stockDelta !== 0) {
    await supabaseDb.from("InventoryMovement").insert({
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      productId: existingRecord.id,
      type: "ADJUSTMENT",
      quantity: stockDelta,
      stockAfter: stock,
      note: "Ajuste manual desde el panel admin",
    });
  }

  await setWarehouseStockAbsolute({
    productId: existingRecord.id,
    warehouseKey: WAREHOUSE_KEYS.PRODUCTO_TERMINADO,
    quantity: stock,
    source: "USER",
    userId: actorUserId,
    note: "Ajuste manual desde el panel admin",
  });

  return toStoreProduct(updated as ProductRecord);
```

(El import de `setWarehouseStockAbsolute`/`WAREHOUSE_KEYS` ya se agregó en la Task 6 —
confirmar que sigue ahí, no duplicarlo.)

- [ ] **Step 3: Actualizar los call sites**

En `app/api/products/route.ts`, línea 44-46:

```typescript
    const user = await requireAdminOrSeller();
    const body = await request.json();
    const product = await createProduct(body, user.id);
```

En `app/api/products/[slug]/route.ts`, línea 47-50:

```typescript
    const user = await requireAdminOrSeller();
    const { slug } = await context.params;
    const body = await request.json();
    const product = await updateProduct(slug, body, user.id);
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores. Si algún otro call site de `createProduct`/`updateProduct` quedó
sin actualizar, TypeScript lo marca por falta del argumento — ya se confirmó en la
exploración previa que los únicos dos call sites de la función de `lib/products.ts` son
estos dos archivos (el `createProduct`/`updateProduct` de `app/admin/page.tsx` son
wrappers locales de fetch, no esta función).

- [ ] **Step 5: Verificación manual**

Crear un producto de prueba desde `/panel/productos`, confirmar en `ProductWarehouseStock`
que la bodega "Producto terminado" quedó con la cantidad ingresada y que se creó un
`WarehouseMovement` con `source = USER` y el `userId` del usuario logueado.

- [ ] **Step 6: Commit**

```bash
git add lib/products.ts app/api/products/route.ts app/api/products/[slug]/route.ts
git commit -m "feat: crear/editar producto escribe stock inicial en bodega Producto terminado"
```

---

## Task 8: API — `GET /api/panel/bodegas` (listado)

**Files:**
- Create: `app/api/panel/bodegas/route.ts`

**Interfaces:**
- Consumes: `requirePermission` de `@/lib/permissions`; `getWarehouses`,
  `listProductsWithWarehouseStock` de `@/lib/warehouses`.

- [ ] **Step 1: Escribir el endpoint**

```typescript
import { requirePermission, getEffectivePermission } from "@/lib/permissions";
import { getWarehouses, listProductsWithWarehouseStock } from "@/lib/warehouses";

export async function GET() {
  const access = await requirePermission("MODULE_BODEGAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const [warehouses, products, permission] = await Promise.all([
    getWarehouses(),
    listProductsWithWarehouseStock(),
    getEffectivePermission(access.user, "MODULE_BODEGAS"),
  ]);

  return Response.json({ warehouses, products, canEdit: permission.canEdit });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

Con el servidor local corriendo (`npm run dev`) y sesión de un usuario BODEGA/ADMIN en las
cookies del navegador, abrir `http://localhost:3000/api/panel/bodegas` y confirmar que
responde JSON con `warehouses` (3 filas), `products` (con `stocksByWarehouseId`) y
`canEdit` (`true` para BODEGA, `false` para ADMIN de solo lectura salvo que sea
SUPERADMIN).

- [ ] **Step 4: Commit**

```bash
git add app/api/panel/bodegas/route.ts
git commit -m "feat: agrega GET /api/panel/bodegas (listado de productos por bodega)"
```

---

## Task 9: API — ajuste y transferencia

**Files:**
- Create: `app/api/panel/bodegas/ajuste/route.ts`
- Create: `app/api/panel/bodegas/transferir/route.ts`

**Interfaces:**
- Consumes: `requirePermission`, `adjustWarehouseStock`, `transferWarehouseStock` (Task 4).

- [ ] **Step 1: Escribir `app/api/panel/bodegas/ajuste/route.ts`**

```typescript
import { requirePermission } from "@/lib/permissions";
import { adjustWarehouseStock } from "@/lib/warehouses";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_BODEGAS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    productId?: string;
    warehouseId?: string;
    type?: "ENTRADA" | "SALIDA";
    quantity?: number;
    note?: string;
  };

  if (!body.productId || !body.warehouseId || !body.type || !body.quantity) {
    return Response.json({ error: "Faltan datos (productId, warehouseId, type, quantity)" }, { status: 400 });
  }

  try {
    const stock = await adjustWarehouseStock({
      productId: body.productId,
      warehouseId: body.warehouseId,
      type: body.type,
      quantity: body.quantity,
      userId: access.user.id,
      note: body.note,
    });
    return Response.json({ stock });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "INSUFFICIENT_STOCK"
        ? "No hay suficiente stock en esa bodega para esta salida."
        : "No fue posible registrar el movimiento.";
    return Response.json({ error: message }, { status: 400 });
  }
}
```

- [ ] **Step 2: Escribir `app/api/panel/bodegas/transferir/route.ts`**

```typescript
import { requirePermission } from "@/lib/permissions";
import { transferWarehouseStock } from "@/lib/warehouses";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_BODEGAS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    productId?: string;
    fromWarehouseId?: string;
    toWarehouseId?: string;
    quantity?: number;
    note?: string;
  };

  if (!body.productId || !body.fromWarehouseId || !body.toWarehouseId || !body.quantity) {
    return Response.json(
      { error: "Faltan datos (productId, fromWarehouseId, toWarehouseId, quantity)" },
      { status: 400 },
    );
  }

  try {
    const stock = await transferWarehouseStock({
      productId: body.productId,
      fromWarehouseId: body.fromWarehouseId,
      toWarehouseId: body.toWarehouseId,
      quantity: body.quantity,
      userId: access.user.id,
      note: body.note,
    });
    return Response.json({ stock });
  } catch (error) {
    const message =
      error instanceof Error && error.message === "INSUFFICIENT_STOCK"
        ? "No hay suficiente stock en la bodega de origen."
        : error instanceof Error && error.message === "SAME_WAREHOUSE"
          ? "La bodega de origen y destino no pueden ser la misma."
          : "No fue posible registrar la transferencia.";
    return Response.json({ error: message }, { status: 400 });
  }
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Verificación manual**

Con sesión BODEGA, `curl` local:

```bash
curl -X POST http://localhost:3000/api/panel/bodegas/ajuste \
  -H "Content-Type: application/json" \
  --cookie "<cookie de sesión>" \
  -d '{"productId":"<id>","warehouseId":"<id bodega 1>","type":"ENTRADA","quantity":10,"note":"prueba"}'
```

Expected: `{"stock": <total actualizado>}`. Repetir con `SALIDA` de cantidad mayor a la
disponible y confirmar `400` con el mensaje de stock insuficiente.

- [ ] **Step 5: Commit**

```bash
git add app/api/panel/bodegas/ajuste/route.ts app/api/panel/bodegas/transferir/route.ts
git commit -m "feat: agrega endpoints de ajuste y transferencia de stock por bodega"
```

---

## Task 10: API — historial de movimientos por producto

**Files:**
- Create: `app/api/panel/bodegas/[productId]/historial/route.ts`

**Interfaces:**
- Consumes: `requirePermission`, `getWarehouseMovements` (Task 4).

- [ ] **Step 1: Escribir el endpoint**

```typescript
import { requirePermission } from "@/lib/permissions";
import { getWarehouseMovements } from "@/lib/warehouses";

export async function GET(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  const access = await requirePermission("MODULE_BODEGAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { productId } = await context.params;
  const movements = await getWarehouseMovements(productId);

  return Response.json({ movements });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual**

`curl http://localhost:3000/api/panel/bodegas/<productId>/historial` con cookie de
sesión válida, confirmar que devuelve `movements` ordenados del más reciente al más
antiguo (`createdAt desc`).

- [ ] **Step 4: Commit**

```bash
git add "app/api/panel/bodegas/[productId]/historial/route.ts"
git commit -m "feat: agrega GET historial de movimientos por producto"
```

---

## Task 11: Nav del panel — entrada "Bodegas"

**Files:**
- Modify: `app/panel/layout.tsx`
- Modify: `lib/permissions.ts:81-97` (`PANEL_LANDING_ROUTES`)

**Interfaces:**
- Consumes: icono `MdWarehouse` de `react-icons/md` (ya confirmado que existe en el
  paquete instalado).

- [ ] **Step 1: Agregar el import del icono**

En `app/panel/layout.tsx`, en el bloque de imports de `react-icons/md` (línea ~1-11),
agregar `MdWarehouse` a la lista de nombres importados.

- [ ] **Step 2: Agregar la entrada al array `NAV`**

Justo después de la línea del item `MODULE_OUTLET` (línea 27):

```typescript
  { href: "/panel/outlet", label: "Outlet", icon: <MdLocalOffer size={18} />, module: "MODULE_OUTLET" },
  { href: "/panel/bodegas", label: "Bodegas", icon: <MdWarehouse size={18} />, module: "MODULE_BODEGAS" },
```

- [ ] **Step 3: Agregar la ruta a `PANEL_LANDING_ROUTES`**

En `lib/permissions.ts`, dentro de `PANEL_LANDING_ROUTES` (línea ~81-97), agregar después
de la entrada de `MODULE_OUTLET`:

```typescript
  { module: "MODULE_OUTLET", path: "/panel/outlet" },
  { module: "MODULE_BODEGAS", path: "/panel/bodegas" },
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add app/panel/layout.tsx lib/permissions.ts
git commit -m "feat: agrega Bodegas a la navegación del panel"
```

---

## Task 12: UI — `/panel/bodegas`

**Files:**
- Create: `app/panel/bodegas/page.tsx`

**Interfaces:**
- Consumes: `GET /api/panel/bodegas`, `POST /api/panel/bodegas/ajuste`,
  `POST /api/panel/bodegas/transferir`, `GET /api/panel/bodegas/[productId]/historial`
  (Tasks 8, 9, 10).

- [ ] **Step 1: Escribir la página**

```tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Warehouse = { id: string; key: string; name: string; order: number };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  minimumStock: number;
  stock: number;
  stocksByWarehouseId: Record<string, number>;
};

type MovementModal = {
  product: Product;
  mode: "ajuste" | "transferir";
};

export default function BodegasPanel() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<MovementModal | null>(null);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/panel/bodegas");
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    const data = await r.json();
    setWarehouses(data.warehouses);
    setProducts(data.products);
    setCanEdit(data.canEdit);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel maestro</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Bodegas y stock por ubicación</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Materia prima/moldes, piezas importadas y producto terminado. El stock total del
          producto es la suma de las 3 bodegas.
        </p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por nombre o SKU..."
        className="mb-5 w-full max-w-sm rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
      />

      {alert && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
          {alert.msg}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
              <tr>
                <th className="px-4 py-3">Producto</th>
                {warehouses.map((w) => (
                  <th key={w.id} className="px-4 py-3">{w.name}</th>
                ))}
                <th className="px-4 py-3">Total</th>
                {canEdit && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={`border-b border-[#F1F5F9] ${p.stock <= p.minimumStock ? "bg-[#FEF2F2]" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-[#1A1A1A]">
                    {p.name}
                    <div className="text-xs font-normal text-[#94A3B8]">{p.sku}</div>
                  </td>
                  {warehouses.map((w) => (
                    <td key={w.id} className="px-4 py-3">{p.stocksByWarehouseId[w.id] ?? 0}</td>
                  ))}
                  <td className="px-4 py-3 font-bold">{p.stock}</td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setModal({ product: p, mode: "ajuste" })}
                          className="rounded-lg bg-[#27B1B8] px-2.5 py-1.5 text-xs font-bold text-white hover:opacity-80"
                        >
                          Ajustar
                        </button>
                        <button
                          onClick={() => setModal({ product: p, mode: "transferir" })}
                          className="rounded-lg border border-[#27B1B8] px-2.5 py-1.5 text-xs font-bold text-[#27B1B8] hover:bg-[#F0FDFE]"
                        >
                          Transferir
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <MovementModalView
          modal={modal}
          warehouses={warehouses}
          onClose={() => setModal(null)}
          onDone={(msg) => { setModal(null); setAlert({ type: "ok", msg }); load(); }}
          onError={(msg) => setAlert({ type: "err", msg })}
        />
      )}
    </div>
  );
}

function MovementModalView({
  modal,
  warehouses,
  onClose,
  onDone,
  onError,
}: {
  modal: MovementModal;
  warehouses: Warehouse[];
  onClose: () => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id ?? "");
  const [type, setType] = useState<"ENTRADA" | "SALIDA">("ENTRADA");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const url = modal.mode === "ajuste" ? "/api/panel/bodegas/ajuste" : "/api/panel/bodegas/transferir";
    const body =
      modal.mode === "ajuste"
        ? { productId: modal.product.id, warehouseId, type, quantity, note }
        : { productId: modal.product.id, fromWarehouseId: warehouseId, toWarehouseId, quantity, note };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);

    if (r.ok) {
      onDone(modal.mode === "ajuste" ? "Movimiento registrado" : "Transferencia registrada");
    } else {
      const d = await r.json();
      onError(d.error ?? "Error al registrar el movimiento");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-black text-[#1A1A1A]">
            {modal.mode === "ajuste" ? "Ajustar stock" : "Transferir stock"} — {modal.product.name}
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-[#64748B]">
              {modal.mode === "ajuste" ? "Bodega" : "Bodega origen"}
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {modal.mode === "ajuste" ? (
            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "ENTRADA" | "SALIDA")}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
              >
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Bodega destino</label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
              >
                {warehouses.filter((w) => w.id !== warehouseId).map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-[#64748B]">Cantidad</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#64748B]">Nota (opcional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || quantity <= 0}
            className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
          >
            {submitting ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Verificación manual con Playwright/browser real**

Con `npm run dev` corriendo:
1. Login como usuario rol BODEGA → entrar a `/panel/bodegas` → confirmar que la tabla
   carga con las 3 columnas de bodega + total, y que los botones "Ajustar"/"Transferir"
   están visibles.
2. Hacer una Entrada de 5 unidades en "Materia prima/moldes" para un producto → confirmar
   que la celda se actualiza y el total sube en 5.
3. Hacer una Transferencia de esas 5 unidades a "Producto terminado" → confirmar que baja
   en origen y sube en destino, total sin cambios.
4. Login como ADMIN → confirmar que ve la tabla pero no ve los botones de acción.
5. Confirmar en `/panel/productos` que el stock del producto tocado coincide con el total
   mostrado en `/panel/bodegas`.

- [ ] **Step 4: Commit**

```bash
git add app/panel/bodegas/page.tsx
git commit -m "feat: agrega UI de /panel/bodegas (tabla, ajuste, transferencia)"
```

---

## Fuera de alcance (no construir en este plan)

- Integración con `ProductionRun`/`ProductionOrder` para mover stock automático al
  producir — fase 2, ver spec.
- UI para crear/editar/borrar bodegas — las 3 son fijas y se crean por el script de seed
  (Task 5).
- Historial visible en la UI más allá del endpoint (Task 10 deja el endpoint listo; si se
  quiere un tab de historial dentro de `/panel/bodegas`, es una extensión natural de la
  Task 12 pero no es parte de este plan — el spec la describe como "tab o sección
  expandible", que puede agregarse después sin tocar el resto).
