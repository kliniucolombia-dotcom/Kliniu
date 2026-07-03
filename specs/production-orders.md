# Órdenes de Producción — Especificación

Referencia funcional: `orden produccion 16.xlsx` (hoja `Hoja1`). Objetivo: planificación de fabricación (qué se debe producir), integrada al sistema, sin copiar el Excel visualmente. Es el paso previo a `ProductionRun` (que registra la ejecución real).

## 1. QA del Excel — verificado

Revisado `/Users/creativo/Downloads/orden produccion 16.xlsx` completo (celda por celda, `data_only=False`).

**Sin fórmulas. Sin cálculos. Sin lógica matemática oculta.** Confirmado — coincide con lo indicado por el usuario. No se detiene la implementación.

Estructura real de datos:

| Columna | Contenido | Ejemplo |
|---|---|---|
| A | Marca de destino (solo algunas filas) | `INTER` |
| B | Referencia (vacía en casi todas las filas) | — |
| C | Descripción / producto | `SERVILLETEROS HUMO` |
| E | Cantidad | `350` |
| F | "Orden de trabajo" (columna vacía en el 100% de las filas de datos) | — |

Pie del documento: `Orden #` (entero simple, ej. `16`), `FECHA`, `AUTORIZADO` (nombre), `NOMBRE` (mismo valor que autorizado en este documento — un solo responsable en este caso, pero son dos campos distintos en el formato).

**Hallazgo relevante**: varias filas (17–20, 33) no tienen producto ni cantidad — son texto libre con instrucciones para planta (ej. *"DECOCKLIN TOCA QUE HAYA 100 DE CADA UNO Y 60 DE ACONDICIONAR"*, *"ALISTAR PARA ENVIAR INTERNACIONAL EN CAJA GRANDE DE IMPORTACION"*). No son líneas de producto — confirman la necesidad de un campo de observaciones generales de la orden (bloque 3 de la interfaz), separado de las líneas de producto.

Columna F (`ORDEN DE TRABAJO`) está vacía en el 100% de las filas — no se modela, es vestigial en el Excel.

Columna A (`INTER`) marca destino de exportación en filas puntuales → corresponde exactamente a `destination` opcional en `ProductionOrderItem`, ya previsto por el usuario.

## 2. Arquitectura

Mismo patrón que `Quotation`/`ProductionRun` (ver `specs/quotations.md`, `specs/production.md`):

```
Prisma → lib/panel.ts → API REST (app/api/panel/production-orders/) → Frontend (app/panel/produccion/ordenes/) → QA
```

- Sin archivo `*-calculator.ts` propio: no hay cálculos que derivar (confirmado en QA). El resumen (bloque 4) es una agregación trivial (`items.length`, `sum(quantity)`) resuelta inline en `lib/panel.ts`, igual que se hace con `totalItems` en `Order`.
- Reutiliza componentes existentes: selector de producto (`app/panel/produccion/` ya tiene selector de `Product`), selector de usuario/responsable (mismo patrón que `Campaign.seller` / `ProductionRun.operator`).
- No se toca `ProductionRun`, `Machine` ni `Quotation` salvo la relación nueva descrita en la sección 5.

## 3. Modelo de datos

```prisma
enum ProductionOrderStatus {
  DRAFT
  APPROVED
  IN_PRODUCTION
  COMPLETED
  CANCELLED
}

model ProductionOrder {
  id             String                @id @default(cuid())
  number         String                @unique   // "OP-2026-000017", mismo patrón que Quotation.number
  productionDate DateTime
  status         ProductionOrderStatus @default(DRAFT)
  notes          String?               // observaciones generales para planta (bloque 3)
  createdById    String
  createdBy      User                  @relation("ProductionOrderCreatedBy", fields: [createdById], references: [id])
  approvedById   String?
  approvedBy     User?                 @relation("ProductionOrderApprovedBy", fields: [approvedById], references: [id])
  approvedAt     DateTime?
  createdAt      DateTime              @default(now())
  updatedAt      DateTime              @updatedAt
  items          ProductionOrderItem[]
  runs           ProductionRun[]

  @@index([createdById])
  @@index([status])
}

model ProductionOrderItem {
  id                String          @id @default(cuid())
  productionOrderId String
  productionOrder   ProductionOrder @relation(fields: [productionOrderId], references: [id], onDelete: Cascade)
  productId         String
  product           Product         @relation(fields: [productId], references: [id])
  quantity          Int
  destination       String?         // ej. "INTER" — libre, opcional
  notes             String?         // nota puntual de esa línea
  order             Int             @default(0)

  @@index([productionOrderId])
  @@index([productId])
}
```

**Cambios en modelos existentes:**

```prisma
// User
productionOrdersCreated  ProductionOrder[] @relation("ProductionOrderCreatedBy")
productionOrdersApproved ProductionOrder[] @relation("ProductionOrderApprovedBy")

// Product
productionOrderItems ProductionOrderItem[]

// ProductionRun — única modificación al módulo existente
productionOrderId String?
productionOrder   ProductionOrder? @relation(fields: [productionOrderId], references: [id])
```

No se persisten `totalReferences`/`totalUnits` — se calculan siempre desde `items` (igual regla que `goodPieces`/`qualityPercentage` en `ProductionRun`).

**Cambio respecto a la versión anterior de la spec**: `productId` es obligatorio (no nullable) y no se guarda `name`/referencia/imagen en `ProductionOrderItem`. A diferencia de `QuotationItem` (que permite producto manual sin catálogo), aquí **todo producto a fabricar debe existir en el catálogo** — nombre, referencia e imagen se leen siempre por join a `Product`, nunca se duplican ni se snapshotean. Si el producto cambia de nombre después, la orden histórica muestra el nombre actual (comportamiento aceptado explícitamente, distinto al de cotizaciones).

## 4. Integración con Producción

`ProductionRun.productionOrderId` es **opcional** (nullable): una corrida puede registrarse sin orden (caso actual, sin romper nada existente) o vinculada a una orden.

```
ProductionOrder (planificación: qué fabricar)
   ↓ (1 a N, opcional)
ProductionRun (ejecución: qué se fabricó realmente)
```

No se duplica cantidad ni producto — `ProductionRun` ya tiene sus propios campos (`produced`, `productId`); la relación solo permite agrupar corridas bajo la orden que las originó. Reportes de avance (planificado vs. producido) se resuelven por `groupBy(productionOrderId)` sin campos nuevos — igual estrategia que sección 8 de `specs/production.md`.

Migración retrocompatible: columna nueva nullable, sin afectar `ProductionRun` existentes.

## 5. Estados

```
DRAFT → APPROVED → IN_PRODUCTION → COMPLETED
  ↓         ↓
CANCELLED CANCELLED
```

Se acepta el flujo propuesto por el usuario, mismo patrón de guardas que `Quotation` (`assertDraft`):

- **DRAFT**: editable (items, fecha, notas). Único estado donde se permite modificar/eliminar.
- **APPROVED**: requiere `approvedById` + `items.length > 0` (igual regla que `sendQuotation` exige `items.length > 0`). Ya no editable.
- **IN_PRODUCTION**: transición manual (acción explícita), no automática al crear el primer `ProductionRun` — evitar acoplar dos módulos por efecto colateral implícito.
- **COMPLETED**: transición manual, sin cálculo de "cantidad completada" (no hay ese dato en el Excel; si se requiere después, se agrega como reporte, no como campo).
- **CANCELLED**: permitido desde `DRAFT` o `APPROVED`, no desde `COMPLETED`.

## 6. API

- `GET/POST /api/panel/production-orders`
- `GET/PATCH/DELETE /api/panel/production-orders/[id]` (PATCH/DELETE solo en `DRAFT`)
- `POST /api/panel/production-orders/[id]/items`
- `PATCH/DELETE /api/panel/production-orders/items/[id]`
- `POST /api/panel/production-orders/[id]/approve`
- `POST /api/panel/production-orders/[id]/start` (→ `IN_PRODUCTION`)
- `POST /api/panel/production-orders/[id]/complete`
- `POST /api/panel/production-orders/[id]/cancel`

Mismo esqueleto que `app/api/panel/quotations/` (`[id]/approve`, `[id]/reject`, `items/[id]`).

Toda respuesta de `ProductionOrder` incluye `summary: { totalReferences, totalUnits, status }` calculado en `lib/panel.ts`, nunca leído de DB (excepto `status`, que sí es un campo persistido, incluido en el resumen solo para lectura conjunta en frontend).

## 7. Interfaz

`app/panel/produccion/ordenes/` — 4 bloques, sin botón "Calcular":

1. **Información general**: número (autogenerado, solo lectura), fecha de producción, responsable (`createdBy`, selector de `User`), estado.
2. **Productos a fabricar**: tabla de líneas — selector de producto de catálogo (obligatorio, autocompleta nombre/referencia/imagen), cantidad, destino (opcional), nota por línea. Agregar/quitar filas.
3. **Instrucciones de Producción**: campo de texto libre (`notes` de la cabecera) para observaciones, prioridades, instrucciones especiales y comentarios para planta — cubre las filas 17-20/33 del Excel que no son líneas de producto. Nunca se guarda como `ProductionOrderItem`.
4. **Resumen**: total de referencias (`items.length`), total de unidades (`sum(quantity)`) y estado actual, vía `useMemo`, actualizado en vivo, nunca persistido. Mismo patrón que el resumen de `app/panel/produccion/page.tsx`.

Listado: tabla de órdenes con filtro por estado/fecha, reutilizando componentes de tabla existentes.

## 8. Validaciones

- `quantity` > 0, entero.
- `productionDate` requerida.
- Al menos 1 item para pasar de `DRAFT` a `APPROVED`.
- Transiciones de estado solo en el orden definido en sección 5 (rechazar transición inválida, igual patrón `INVALID_TRANSITION` de `Quotation`).
- Edición de items solo permitida en `DRAFT` (igual patrón `assertDraft`).

## 9. QA — casos mínimos de prueba

- Crear orden.
- Editar orden (cabecera e items) en `DRAFT`.
- Aprobar orden (`DRAFT` → `APPROVED`, requiere items).
- Cancelar orden (desde `DRAFT` y desde `APPROVED`).
- Agregar productos (items) a una orden.
- Eliminar productos (items) de una orden.
- Orden con varias referencias distintas → `totalReferences` correcto.
- Orden con varias cantidades por línea → `totalUnits` correcto (suma).
- Conversión a corridas de producción: crear `ProductionRun` con `productionOrderId` → aparece en el listado de corridas de esa orden; crear `ProductionRun` sin `productionOrderId` (flujo actual) → sigue funcionando sin cambios.
- Persistencia tras recargar: crear orden con items, recargar, `totalReferences`/`totalUnits` se recalculan igual (no se leen de DB).
- Intentar `APPROVED` sin items → rechazado.
- Intentar editar items de una orden `APPROVED` → rechazado.
- Cancelar desde `COMPLETED` → rechazado.
- Comparación contra el Excel: las 26 filas con producto+cantidad de `orden produccion 16.xlsx` deben poder representarse 1:1 como `ProductionOrderItem`; las 5 filas de solo texto deben caber en `notes` (bloque "Instrucciones de Producción").

## 10. Criterios de aceptación

- No se persisten `totalReferences`/`totalUnits` en DB.
- Selección de producto siempre desde catálogo (`productId` obligatorio), sin texto libre, sin excepción.
- Responsable siempre un `User` existente, nunca texto libre.
- Transiciones de estado respetan el flujo definido, con guardas backend (no solo frontend).
- `ProductionRun` existente sigue funcionando sin `productionOrderId` (relación opcional, no rompe el módulo Producción).

## 11. Definition of Done

- Build limpio (`npm run build`).
- Lint limpio (`npm run lint`).
- QA funcional ejecutado (sección 9).
- Integración con Producción verificada (`ProductionRun.productionOrderId`, corridas agrupadas por orden, flujo sin orden sigue intacto).
- Sin lógica duplicada (sin `*-calculator.ts` propio; agregación de resumen resuelta una sola vez en `lib/panel.ts`).
- Sin datos derivados persistidos (`totalReferences`/`totalUnits` nunca son columnas).
- Migración Prisma aplicada (`ProductionOrder`, `ProductionOrderItem`, `ProductionOrderStatus`, relaciones en `User`/`Product`/`ProductionRun`).
- CRUD completo en `lib/panel.ts` + rutas API.
- Frontend funcional (4 bloques, resumen en vivo).
- Sin ruptura del módulo Producción existente (regresión verificada).

## 12. Checklist técnico

- [ ] Enum `ProductionOrderStatus`
- [ ] Modelo `ProductionOrder`
- [ ] Modelo `ProductionOrderItem`
- [ ] Relación `ProductionRun.productionOrderId` (nullable)
- [ ] Relaciones nuevas en `User` y `Product`
- [ ] CRUD + transiciones de estado en `lib/panel.ts`
- [ ] `app/api/panel/production-orders/` (todas las rutas de sección 6)
- [ ] `app/panel/produccion/ordenes/` (listado + formulario 4 bloques)
- [ ] Validaciones frontend + backend
- [ ] QA de regresión sobre `ProductionRun` existente

**Pendiente de aprobación del usuario antes de implementar.**
