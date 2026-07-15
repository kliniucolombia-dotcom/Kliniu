# Bodegas y stock por ubicación — Design

## Contexto

El rol `BODEGA` ya existe (permisos: Productos ver+crear, nada más). Pero la idea original
de "bodegas" nunca se construyó: 3 bodegas físicas con stock independiente por ubicación:

1. **Materia prima / moldes**
2. **Piezas inyectadas / importadas**
3. **Producto terminado**

Hoy `Product.stock` es un solo número global, editable manualmente en el form de
crear/editar producto y sincronizado automáticamente desde Odoo (`qty_available`) vía
`syncStockFromOdoo` en `lib/products.ts`.

## Objetivo

Llevar el stock desglosado por las 3 bodegas fijas, con historial de movimientos,
manteniendo compatibilidad con la sync de Odoo y el form existente.

## Modelo de datos (Prisma)

### `Warehouse`
Catálogo fijo, 3 filas seed. Sin UI para crear/borrar bodegas (YAGNI — el negocio tiene
exactamente 3 bodegas físicas, no una cantidad variable).

```prisma
model Warehouse {
  id             String                  @id @default(cuid())
  key            String                  @unique // "MATERIA_PRIMA_MOLDES" | "PIEZAS_IMPORTADAS" | "PRODUCTO_TERMINADO"
  name           String
  order          Int
  stocks         ProductWarehouseStock[]
  movementsFrom  WarehouseMovement[]     @relation("MovementFrom")
  movementsTo    WarehouseMovement[]     @relation("MovementTo")
}
```

### `ProductWarehouseStock`
Cantidad actual por producto+bodega.

```prisma
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
```

### `WarehouseMovement`
Historial de ajustes/transferencias. Origen/destino explícitos en vez de un
`warehouseId` + `relatedWarehouseId` que obliga a interpretar según el tipo:

- Entrada: `fromWarehouseId = null`, `toWarehouseId = <bodega>`.
- Salida: `fromWarehouseId = <bodega>`, `toWarehouseId = null`.
- Transferencia: `fromWarehouseId = <origen>`, `toWarehouseId = <destino>` — **un solo
  registro**, no dos. La transacción resta `quantity` en `fromWarehouseId` y suma
  `quantity` en `toWarehouseId`.

`quantityAfter` se elimina del modelo: con from/to no hay un único "stock resultante"
que tenga sentido guardar en la fila (serían dos). El estado actual siempre se lee de
`ProductWarehouseStock`, que es la fuente de verdad; el historial solo registra el delta.

`userId` es obligatorio — no hay movimientos anónimos. Para movimientos que no origina
una persona (sync de Odoo) se usa un `source` explícito en vez de deducir intención por
el texto de la nota:

```prisma
enum WarehouseMovementType {
  ENTRADA
  SALIDA
  TRANSFERENCIA
}

enum WarehouseMovementSource {
  USER   // ajuste manual desde /panel/bodegas
  ODOO   // syncStockFromOdoo
  SYSTEM // migración inicial / futuros procesos automáticos
}

model WarehouseMovement {
  id                String                  @id @default(cuid())
  productId         String
  type              WarehouseMovementType
  source            WarehouseMovementSource
  quantity          Int
  fromWarehouseId   String?
  toWarehouseId     String?
  note              String?
  userId            String
  createdAt         DateTime                @default(now())
  product           Product                 @relation(fields: [productId], references: [id], onDelete: Cascade)
  fromWarehouse     Warehouse?              @relation("MovementFrom", fields: [fromWarehouseId], references: [id])
  toWarehouse       Warehouse?              @relation("MovementTo", fields: [toWarehouseId], references: [id])

  @@index([productId])
  @@index([fromWarehouseId])
  @@index([toWarehouseId])
}
```

Para movimientos con `source = ODOO`/`SYSTEM` que no tienen un usuario real, `userId`
apunta a una cuenta de servicio fija (ya existe patrón similar para procesos
automáticos — si no existe, se crea un `User` técnico `system@kliniu.internal` con rol
sin acceso al panel). Así `userId` sigue siendo NOT NULL sin excepciones, y quién/qué
originó el movimiento se filtra por `source`, nunca por el texto de `note` (`note` es
siempre texto libre, nunca se usa en lógica — nada de `if note === "..."`).

`Product` gana relaciones `warehouseStocks ProductWarehouseStock[]` y
`warehouseMovements WarehouseMovement[]`.

## Regla de stock (compatibilidad con Odoo y form existente)

- `Product.stock` **se mantiene** como columna (no se elimina — muchas queries de listado
  la leen directo), pero pasa a ser un valor **calculado**: suma de las 3
  `ProductWarehouseStock.quantity` de ese producto.
- Recálculo centralizado: una única función `recalculateProductStock(productId, tx)` en
  `lib/warehouses.ts` hace `SUM(quantity)` y actualiza `Product.stock`. **Todo** el código
  que toca `ProductWarehouseStock` (ajuste manual, transferencia, sync de Odoo, seed de
  migración) termina llamando esta función dentro de la misma transacción — cero lógica
  de recálculo duplicada en los distintos call sites.
- La bodega **"Producto terminado"** es la única que tocan:
  - `syncStockFromOdoo`: en vez de escribir `Product.stock` directo, ajusta
    `ProductWarehouseStock` de esa bodega y crea un `WarehouseMovement`
    (`type` ENTRADA/SALIDA según el signo del delta, `source = ODOO`), luego llama
    `recalculateProductStock`.
  - El campo `stock` del form crear/editar producto en `/panel/productos` (en
    `createProduct`/`updateProduct` de `lib/products.ts`): el valor que el usuario escribe
    ahí se guarda como la cantidad de la bodega "Producto terminado" (`source = USER`), no
    como `Product.stock` directo.
- Bodegas 1 y 2 (materia prima/moldes, piezas) **solo** cambian vía movimiento manual
  desde `/panel/bodegas` (rol BODEGA, `source = USER`). Nadie más las toca.
- `InventoryMovement` (tabla existente) **queda deprecada**: se mantiene sin cambios de
  esquema por compatibilidad con el código que ya la lee (`/admin`,
  `getRecentInventoryMovements`), pero **todo código nuevo usa `WarehouseMovement`**. No
  se escriben features nuevas sobre `InventoryMovement`. Se anota como candidata a
  retirar/migrar en una fase futura, para no terminar con dos historiales de stock que
  nadie sepa reconciliar.

## Permisos

Nuevo módulo en el enum `PanelModule`: `MODULE_BODEGAS`.

En `lib/permission-defaults.ts`:
- `BODEGA`: `VIEW_CREATE_EDIT` (ve, crea productos ya lo tenía; ahora también ajusta
  cantidades y crea transferencias — no borra movimientos).
- `ADMIN`: `VIEW_ONLY`.
- `INGENIERIA`: `VIEW_ONLY`.
- Todos los demás roles: `NONE`.

Nav: agregar entrada `{ href: "/panel/bodegas", label: "Bodegas", icon: MdWarehouse,
module: "MODULE_BODEGAS" }` en `app/panel/layout.tsx`, gateada por `visibleModules` igual
que el resto.

## UI — `/panel/bodegas`

Página nueva, patrón similar a `/panel/banners` (tabla + acciones inline, sin modal
pesado salvo para el movimiento).

- **Tabla de productos**: columnas `Producto | SKU | Bodega 1 | Bodega 2 | Bodega 3 |
  Total`. Buscador por nombre/SKU. Fila resaltada en rojo si total ≤ `minimumStock`.
- **Click en celda de cantidad** (solo si `canEdit`, o sea rol BODEGA): abre modal de
  movimiento:
  - Tipo: Entrada / Salida / Transferencia a otra bodega.
  - Cantidad.
  - Si Transferencia: selector de bodega destino → **un solo** `WarehouseMovement` con
    `fromWarehouseId`/`toWarehouseId`, la transacción resta en origen y suma en destino.
  - Nota opcional (texto libre, no se interpreta en ningún `if`).
  - Confirmar → API crea el `WarehouseMovement` (`source = USER`, `userId` del usuario en
    sesión), actualiza `ProductWarehouseStock.quantity` afectadas, llama
    `recalculateProductStock`.
  - Validación: no permitir Salida/Transferencia que deje la cantidad en negativo.
- **Historial**: tab o sección expandible por producto, lista los últimos
  `WarehouseMovement` ordenados **`createdAt DESC`** (tipo, origen→destino, cantidad,
  nota, quién, fuente, cuándo), igual estilo que `getRecentInventoryMovements` ya usado en
  `/admin`. Filtro opcional por `source` (manual / Odoo / sistema).
- Vista de solo lectura para ADMIN/INGENIERIA: misma tabla, sin poder abrir el modal de
  ajuste (botones deshabilitados, igual patrón que `mobileLocked`/`disabled` en
  `/panel/banners`).

## API

Endpoints separados por intención en vez de uno genérico — más claro de leer y de
validar (una transferencia y un ajuste simple no comparten reglas de negocio):

- `GET /api/panel/bodegas` — lista productos con sus 3 cantidades + total. Requiere
  `MODULE_BODEGAS` view.
- `POST /api/panel/bodegas/ajuste` — body `{ productId, warehouseId, type: "ENTRADA" |
  "SALIDA", quantity, note? }`. Requiere `MODULE_BODEGAS` edit (solo BODEGA). Crea el
  `WarehouseMovement` (`fromWarehouseId`/`toWarehouseId` según type), actualiza
  `ProductWarehouseStock`, llama `recalculateProductStock`.
- `POST /api/panel/bodegas/transferir` — body `{ productId, fromWarehouseId,
  toWarehouseId, quantity, note? }`. Requiere `MODULE_BODEGAS` edit. Un único
  `WarehouseMovement` tipo `TRANSFERENCIA`, resta/suma en la misma transacción, llama
  `recalculateProductStock`.
- `GET /api/panel/bodegas/[productId]/historial` — movimientos de un producto,
  `orderBy createdAt desc`.

## Migración de datos existente

Al aplicar el `db push`/seed:
- Seed de las 3 filas `Warehouse`.
- Seed de un `User` técnico (`system@kliniu.internal`, sin acceso al panel) para poblar
  `userId` en movimientos `source = SYSTEM`/`ODOO` donde no hay una persona real detrás
  — así `userId` puede ser NOT NULL sin excepciones.
- Para cada `Product` existente: crear `ProductWarehouseStock` para la bodega
  "Producto terminado" con `quantity = Product.stock` actual (todo el stock legado se
  asume producto terminado), y `quantity = 0` para las otras 2 bodegas. Se registra un
  `WarehouseMovement` inicial `source = SYSTEM`, nota `"Migración inicial de stock legado"`.
- No se pierde ningún dato: el total inicial coincide con el `stock` actual.

## Fuera de alcance (fase 2, no se construye ahora)

- Integración con `ProductionRun`/`ProductionOrder` para mover stock automático al
  producir (ej: consumir bodega 1, producir en bodega 2/3). Ver
  `[[user-permissions-module]]` — queda anotado como pendiente real para cuando se
  retome producción.
- UI para crear/editar/borrar bodegas (fijas a 3, hardcodeadas).

## Testing

- Manual con Playwright: crear producto, hacer entrada/salida/transferencia en las 3
  bodegas como rol BODEGA, confirmar que `Product.stock` (visible en `/panel/productos`)
  cuadra con la suma, y que ADMIN ve pero no puede editar.
- Confirmar que `syncStockFromOdoo` sigue corriendo sin romper (bodega 3 se actualiza,
  las otras 2 quedan intactas).
