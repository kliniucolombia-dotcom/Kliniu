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
  id     String   @id @default(cuid())
  key    String   @unique // "MATERIA_PRIMA_MOLDES" | "PIEZAS_IMPORTADAS" | "PRODUCTO_TERMINADO"
  name   String
  order  Int
  stocks ProductWarehouseStock[]
  movements WarehouseMovement[]
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
  updatedAt   DateTime  @updatedAt
  product     Product   @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouse   Warehouse @relation(fields: [warehouseId], references: [id])

  @@unique([productId, warehouseId])
}
```

### `WarehouseMovement`
Historial de ajustes/transferencias.

```prisma
enum WarehouseMovementType {
  ENTRADA
  SALIDA
  TRANSFERENCIA
}

model WarehouseMovement {
  id                String                @id @default(cuid())
  productId         String
  warehouseId       String
  type              WarehouseMovementType
  quantity          Int
  quantityAfter     Int
  note              String?
  userId            String?
  relatedWarehouseId String?              // bodega destino/origen si type = TRANSFERENCIA
  createdAt         DateTime              @default(now())
  product           Product               @relation(fields: [productId], references: [id], onDelete: Cascade)
  warehouse         Warehouse             @relation(fields: [warehouseId], references: [id])
}
```

`Product` gana relaciones `warehouseStocks ProductWarehouseStock[]` y
`warehouseMovements WarehouseMovement[]`.

## Regla de stock (compatibilidad con Odoo y form existente)

- `Product.stock` **se mantiene** como columna (no se elimina — muchas queries de listado
  la leen directo), pero pasa a ser un valor **calculado**: suma de las 3
  `ProductWarehouseStock.quantity` de ese producto.
- Cada vez que cambia una cantidad de bodega (por movimiento manual o por sync de Odoo),
  se recalcula `Product.stock` en la misma transacción.
- La bodega **"Producto terminado"** es la única que tocan:
  - `syncStockFromOdoo` (en vez de escribir `Product.stock` directo, escribe/ajusta
    `ProductWarehouseStock` de esa bodega, generando un `WarehouseMovement` tipo
    `ENTRADA`/`SALIDA` con nota `"Sincronización automática de stock desde Odoo"`, igual
    que hoy hace con `InventoryMovement`).
  - El campo `stock` del form crear/editar producto en `/panel/productos` (en
    `createProduct`/`updateProduct` de `lib/products.ts`): el valor que el usuario escribe
    ahí se guarda como la cantidad de la bodega "Producto terminado", no como
    `Product.stock` directo.
- Bodegas 1 y 2 (materia prima/moldes, piezas) **solo** cambian vía movimiento manual
  desde `/panel/bodegas` (rol BODEGA). Nadie más las toca.
- `InventoryMovement` (tabla existente) se mantiene sin cambios — sigue registrando el
  movimiento a nivel de `Product.stock` total, en paralelo a `WarehouseMovement`. No se
  fusionan las dos tablas para no tocar código existente que lee `InventoryMovement`.

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
  - Si Transferencia: selector de bodega destino (resta de la actual, suma a la destino,
    genera 2 `WarehouseMovement` con `relatedWarehouseId` cruzado).
  - Nota opcional.
  - Confirmar → API crea el/los `WarehouseMovement`, actualiza
    `ProductWarehouseStock.quantity`, recalcula `Product.stock`.
  - Validación: no permitir Salida/Transferencia que deje la cantidad en negativo.
- **Historial**: tab o sección expandible por producto, lista los últimos
  `WarehouseMovement` (tipo, cantidad, nota, quién, cuándo), igual estilo que
  `getRecentInventoryMovements` ya usado en `/admin`.
- Vista de solo lectura para ADMIN/INGENIERIA: misma tabla, sin poder abrir el modal de
  ajuste (botones deshabilitados, igual patrón que `mobileLocked`/`disabled` en
  `/panel/banners`).

## API

- `GET /api/panel/bodegas` — lista productos con sus 3 cantidades + total. Requiere
  `MODULE_BODEGAS` view.
- `POST /api/panel/bodegas/movimiento` — body `{ productId, warehouseId, type, quantity,
  note?, toWarehouseId? }`. Requiere `MODULE_BODEGAS` edit (solo BODEGA). Transacción:
  valida no-negativo, crea movimiento(s), actualiza `ProductWarehouseStock`, recalcula
  `Product.stock`.
- `GET /api/panel/bodegas/[productId]/historial` — movimientos de un producto.

## Migración de datos existente

Al aplicar el `db push`/seed:
- Seed de las 3 filas `Warehouse`.
- Para cada `Product` existente: crear `ProductWarehouseStock` para la bodega
  "Producto terminado" con `quantity = Product.stock` actual (todo el stock legado se
  asume producto terminado), y `quantity = 0` para las otras 2 bodegas.
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
