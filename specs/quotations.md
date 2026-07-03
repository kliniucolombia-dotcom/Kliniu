# Cotizaciones Comerciales — Especificación

Referencia funcional: `PROFORMAS ALEX QUINTERO.xlsx` (Excel manual del vendedor). Objetivo: mismo resultado comercial, integrado al sistema, sin copiar el Excel literalmente.

## 1. Arquitectura

- Sigue el patrón existente de `SaleCalculator`/`SaleCalculatorItem` (ver `lib/panel.ts`, `app/api/panel/sale-calculators/`).
- Modelos nuevos en `prisma/schema.prisma`: `Quotation`, `QuotationItem`, `QuotationTaxConfig`.
- Lógica de negocio en `lib/panel.ts` (CRUD) + `lib/quotation-calculator.ts` (cálculos puros, sin acceso a DB).
- API REST bajo `app/api/panel/quotations/`.
- Frontend bajo `app/panel/cotizaciones/`.
- PDF (fase posterior): render HTML server-side + Playwright, endpoint reservado `POST /api/panel/quotations/:id/pdf`.
- **Regla dura**: no se persisten valores derivados (subtotal, impuestos, totales, `lineTotal`). Todo cálculo pasa por `quotation-calculator.ts`, tanto en API/lectura como en el PDF.

## 2. Modelo de datos

```prisma
model Quotation {
  id                String          @id @default(cuid())
  number            String          @unique // COT-AAAA-000001
  sellerId          String
  seller            User            @relation("QuotationSeller", fields: [sellerId], references: [id])
  clientId          String
  client            User            @relation("QuotationClient", fields: [clientId], references: [id])
  status            QuotationStatus @default(DRAFT)
  paymentTerms      String?
  notes             String?
  validUntil        DateTime?
  convertedOrderId  String?         @unique
  convertedOrder    Order?          @relation(fields: [convertedOrderId], references: [id])
  sentAt            DateTime?
  approvedAt        DateTime?
  rejectedAt        DateTime?
  createdAt         DateTime        @default(now())
  updatedAt         DateTime        @updatedAt
  items             QuotationItem[]
}

model QuotationItem {
  id              String    @id @default(cuid())
  quotationId     String
  quotation       Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  productId       String?
  product         Product?  @relation(fields: [productId], references: [id])
  name            String    // nombre congelado al agregar
  reference       String?   // ref/SKU libre, opcional
  manualImageUrl  String?   // solo aplica si productId es null
  quantity        Int
  unitPrice       Int       // precio congelado al agregar
  order           Int       @default(0)
}

model QuotationTaxConfig {
  id             String   @id @default(cuid())
  reteIcaPct     Float    @default(1.104)
  reteFuentePct  Float    @default(2.5)
  ivaPct         Float    @default(19)
  isActive       Boolean  @default(true)
  updatedAt      DateTime @updatedAt
}

enum QuotationStatus {
  DRAFT
  SENT
  APPROVED
  REJECTED
  EXPIRED
}
```

No hay `subtotal`, `total`, `lineTotal`, `reteIca`, `reteFuente`, `iva` persistidos.

## 3. Integración con productos

- Al agregar un ítem con `productId`, se congelan `name` y `unitPrice` (snapshot del `Product` en ese momento) para preservar histórico aunque el producto cambie luego.
- La imagen del ítem se resuelve en tiempo de lectura: `productId` presente → `Product.image`; `productId` ausente → `manualImageUrl`. Nunca se duplica/copia la imagen del catálogo.
- Ítem libre (sin `productId`): `name`, `reference`, `manualImageUrl`, `unitPrice` capturados a mano, igual que renglones no catalogados del Excel.

## 4. Integración con clientes

- No existe modelo `Cliente`. `Quotation.clientId` referencia un `User` (rol `CUSTOMER`) ya registrado.
- Datos mostrados en el documento (empresa, ciudad, dirección, contacto) se leen del `User` en tiempo de render, no se copian a `Quotation`.

## 5. Numeración automática

- Formato: `COT-AAAA-NNNNNN` (año calendario + correlativo de 6 dígitos, reinicia cada año).
- Generación dentro de una transacción Prisma (`prisma.$transaction`): cuenta cotizaciones del año actual (o mantiene contador dedicado) y arma el siguiente número antes de crear el registro, evitando colisiones por condición de carrera.

## 6. Estados del documento

`DRAFT → SENT → (APPROVED | REJECTED)`; `SENT → EXPIRED` si `validUntil` ya pasó (chequeo perezoso al leer, sin cron).

- **DRAFT**: editable (ítems, cliente, condiciones). Único estado donde se puede borrar la cotización.
- **SENT**: bloquea edición de ítems. Habilita generación de PDF. `sentAt` se registra al transicionar.
- **APPROVED**: `approvedAt` registrado. Habilita "Convertir a pedido".
- **REJECTED**: `rejectedAt` registrado. Estado terminal.
- **EXPIRED**: terminal, derivado por fecha, no por acción manual.

## 7. Conversión a pedido

- Solo desde `APPROVED` y solo si `convertedOrderId` es `null`.
- Crea `Order` + `OrderItem[]` con los datos congelados de `QuotationItem` (nombre, precio, cantidad) y los datos de contacto del `client` (User).
- Guarda `convertedOrderId` en la `Quotation` (relación 1:1, `@unique`).

## 8. Generación de PDF (diseñado, implementado en Fase 5)

- Vista HTML de impresión en `app/panel/cotizaciones/[id]/imprimir` (o ruta equivalente), que renderiza la cotización recalculando todo vía `buildQuotationSummary`.
- Playwright (ya en dependencias) captura esa ruta y genera el PDF en servidor.
- Endpoint reservado: `POST /api/panel/quotations/:id/pdf` — devuelve el PDF generado. No se implementa hasta Fase 5; el resto del sistema se diseña para no bloquear su llegada.

## 9. `lib/quotation-calculator.ts` (funciones puras)

```ts
calcLineTotal(item: { quantity: number; unitPrice: number }): number
calcSubtotal(items: LineItem[]): number
calcReteIca(subtotal: number, cfg: TaxConfig): number
calcReteFuente(subtotal: number, cfg: TaxConfig): number
calcIVA(subtotal: number, cfg: TaxConfig): number
calcTotal(subtotal: number, reteIca: number, reteFuente: number, iva: number): number
buildQuotationSummary(items: LineItem[], cfg: TaxConfig): QuotationSummary
```

Usadas tanto en API (para responder totales calculados) como en frontend (preview en vivo) y en el futuro render de PDF. Ninguna otra parte del sistema calcula totales por su cuenta.

## 10. API

Bajo `app/api/panel/quotations/`, autenticado con `getSessionFromCookies()`, roles `ADMIN`/`SELLER` (SELLER solo ve/edita las propias, igual que `SaleCalculator`):

- `GET /api/panel/quotations` — lista (con `summary` calculado por ítem sumarizado).
- `POST /api/panel/quotations` — crea DRAFT vacía (asigna número).
- `GET /api/panel/quotations/:id` — detalle + ítems + `summary`.
- `PATCH /api/panel/quotations/:id` — edita cabecera (cliente, condiciones, notas, validUntil) — solo en DRAFT.
- `DELETE /api/panel/quotations/:id` — solo en DRAFT.
- `POST /api/panel/quotations/:id/items` — agrega ítem.
- `PATCH /api/panel/quotations/items/:id` — edita ítem.
- `DELETE /api/panel/quotations/items/:id` — elimina ítem.
- `POST /api/panel/quotations/:id/send` — DRAFT → SENT.
- `POST /api/panel/quotations/:id/approve` — SENT → APPROVED.
- `POST /api/panel/quotations/:id/reject` — SENT → REJECTED.
- `POST /api/panel/quotations/:id/convert` — APPROVED → crea Order.
- `POST /api/panel/quotations/:id/pdf` — reservado, Fase 5.
- `GET /api/panel/quotation-tax-config` / `PATCH /api/panel/quotation-tax-config` — solo ADMIN.

## 11. Frontend

- `app/panel/cotizaciones/page.tsx` — lista (estado, cliente, total calculado, fecha).
- `app/panel/cotizaciones/[id]/page.tsx` — editor: datos cabecera, tabla de ítems (agregar producto del catálogo o ítem libre), resumen de totales en vivo (usa `quotation-calculator.ts` client-side), acciones de estado (Enviar/Aprobar/Rechazar/Convertir).
- Reutiliza componentes existentes de selección de producto (buscador ya usado en `SaleCalculator`/`Campaign`) y de cliente (buscador de `User` CUSTOMER).

## 12. Backend (resumen de responsabilidades)

- `lib/panel.ts`: funciones CRUD + transición de estados + generación de número + conversión a Order (transaccional).
- `lib/quotation-calculator.ts`: cálculos puros.
- Sin lógica de negocio en las rutas API (solo auth + validación de input + delegación).

## 13. Criterios de aceptación

1. Se puede crear una cotización DRAFT, agregar ítems de catálogo y libres, y ver el total recalculado en vivo.
2. Los totales nunca se leen de un campo persistido: cambiar `QuotationTaxConfig` afecta el cálculo de cotizaciones no convertidas al recargarlas.
3. El número de cotización es único, formato `COT-AAAA-NNNNNN`, sin colisiones bajo creación concurrente.
4. Cambiar el precio de un `Product` no afecta cotizaciones ya creadas (precio congelado en `QuotationItem.unitPrice`).
5. La imagen de un ítem de catálogo sigue al `Product.image` actual (no se congela); un ítem libre usa `manualImageUrl`.
6. Transiciones de estado respetan el flujo definido; acciones fuera de estado válido son rechazadas (400/409).
7. Solo se puede convertir a pedido una cotización `APPROVED` sin conversión previa.
8. SELLER solo ve/edita sus propias cotizaciones; ADMIN ve todas.

## 14. Definition of Done

- Migración Prisma aplicada, `prisma generate` sin errores.
- `lib/quotation-calculator.ts` con funciones puras y sin dependencias de DB.
- CRUD + transiciones de estado + conversión a pedido funcionando vía API.
- Frontend de lista y editor operativo, con totales en vivo coincidentes con el backend.
- `npm run build` y lint sin errores al cierre de cada fase.
- Vista de impresión y endpoint de PDF reservados (Fase 4/5), sin bloquear las fases anteriores.
- Sin commits automáticos: el usuario decide cuándo commitear.

## 15. Plan de fases (orden obligatorio)

1. Prisma → `quotation-calculator.ts` → CRUD (`lib/panel.ts`) → API.
2. Frontend: lista, editor, acciones de estado.
3. Conversión a pedido.
4. Vista HTML de impresión.
5. PDF con Playwright.

Después de cada fase: build, lint, corregir errores antes de continuar. Al finalizar cada fase: reportar archivos creados/modificados, resultado de build/lint, funcionalidades implementadas y pendientes. Sin commits.

## 16. Preparación para historial futuro (no implementado)

No existe tabla de auditoría todavía. Se documenta aquí cómo se agregaría sin romper lo existente, para cuando se necesite.

**Diseño futuro propuesto:** tabla `QuotationEvent` (no creada):

```prisma
model QuotationEvent {
  id          String   @id @default(cuid())
  quotationId String
  quotation   Quotation @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  type        QuotationEventType
  actorId     String   // userId que ejecutó la acción
  metadata    Json?    // ej. diff de campos editados
  createdAt   DateTime @default(now())

  @@index([quotationId])
}

enum QuotationEventType {
  CREATED
  EDITED
  SENT
  APPROVED
  REJECTED
  CONVERTED_TO_ORDER
}
```

**Puntos de extensión ya existentes en `lib/panel.ts`** (cada uno es el lugar natural para emitir un evento el día que se implemente, sin tocar rutas API ni frontend):

- `createQuotation` → `CREATED`
- `updateQuotation` / `createQuotationItem` / `updateQuotationItem` / `deleteQuotationItem` → `EDITED`
- `sendQuotation` → `SENT`
- `approveQuotation` → `APPROVED`
- `rejectQuotation` → `REJECTED`
- `convertQuotationToOrder` → `CONVERTED_TO_ORDER`

Cada transición de estado ya vive en su propia función aislada (no mezclada con lógica de otras transiciones), por lo que agregar `await tx.quotationEvent.create(...)` dentro de cada una es un cambio localizado cuando se decida implementarlo. No requiere refactor de arquitectura.
