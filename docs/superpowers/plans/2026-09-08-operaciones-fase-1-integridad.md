# Operaciones Fase 1 Integridad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Blindar autorización, validación, concurrencia y consistencia de los módulos existentes de Operaciones.

**Architecture:** Extraer reglas puras de validación y cálculo para probarlas sin base de datos, y aplicar las mutaciones sensibles como actualizaciones condicionales dentro de transacciones Prisma. Los Route Handlers conservarán la autorización como frontera de entrada y Playwright verificará los recorridos completos por rol.

**Tech Stack:** TypeScript 5, React 19, Next.js 16 App Router, Prisma 7, PostgreSQL, Node test runner con `tsx`, Playwright, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-08-operaciones-fase-1-integridad.md`

## Global Constraints

- No implementar elementos declarados fuera de alcance en la especificación.
- Usar `npx pnpm` para paquetes y scripts; no instalar dependencias nuevas si Node y `tsx` cubren las pruebas.
- Para Prisma usar `db push`, nunca `migrate dev`, y ejecutar `prisma generate` después.
- No cambiar contraseñas ni escribir datos de prueba en cuentas reales.
- Antes de Playwright, detener cualquier `next dev` anterior del puerto 3000.
- No afirmar funcionamiento sin verificación en navegador real.

---

### Task 1: Armazón de pruebas y validadores compartidos

**Files:**
- Create: `lib/operations-validation.ts`
- Create: `tests/operations-validation.test.ts`
- Modify: `package.json`
- Read before implementation: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`

**Interfaces:**
- Produces: `parseBogotaCivilDate(value: unknown): Date`, `parseIsoDateTime(value: unknown): Date`, `parsePositiveInteger(value: unknown): number`, `parseNonNegativeNumber(value: unknown): number`, `isRecord(value: unknown): value is Record<string, unknown>`.

- [ ] **Step 1: Add the test command and write failing tests** for impossible civil dates, malformed timestamps, `NaN`, infinities, decimals where integers are required, zero/negative quantities and non-object JSON bodies.
- [ ] **Step 2: Run `npx tsx --test tests/operations-validation.test.ts`** and confirm failures are caused by the missing module/functions.
- [ ] **Step 3: Implement strict parsers** using component round-trips for `YYYY-MM-DD` in Bogotá and `Number.isFinite`; each rejection must throw `INVALID_DATE`, `INVALID_DATETIME`, `INVALID_NUMBER` or `INVALID_BODY`.
- [ ] **Step 4: Run `npx tsx --test tests/operations-validation.test.ts`** and confirm all cases pass.
- [ ] **Step 5: Commit** with `test: add operations validation harness`.

### Task 2: Autorización de informes y KPI calculados en servidor

**Files:**
- Create: `tests/operations-reports.test.ts`
- Modify: `lib/operations-reports.ts`
- Modify: `app/api/panel/operaciones/informes/route.ts`
- Modify: `app/api/panel/operaciones/route.ts`
- Modify: `app/panel/logistica/page.tsx`
- Modify: `app/panel/mantenimiento/page.tsx`

**Interfaces:**
- Produces: `listAuthorizedOperationsReports(modules: PanelModule[], take?: number)` and `buildOperationsReportKpis(module, from, to)`.
- Changes POST body to `{ module, periodStart, periodEnd, notes? }`; `kpis` sent by the client is ignored/rejected.

- [ ] **Step 1: Write failing tests** proving a logística-only user cannot receive maintenance reports, the dashboard query is restricted to visible modules, and forged client KPI are never stored.
- [ ] **Step 2: Run the focused tests** and confirm the current cross-module result and trusted client JSON make them fail.
- [ ] **Step 3: Implement authorized listing** by deriving all effective `canView` modules and adding `module: { in: allowedModules }` to every unfiltered report query.
- [ ] **Step 4: Implement server KPI builders** by delegating to `getLogisticsKpis`, `getMaintenanceKpis`, `getMoldKpis`, and a warehouse summary computed for the requested period/current snapshot; keep stable KPI keys expected by the UI.
- [ ] **Step 5: Remove KPI payloads from report modals** and return a clear 400 for invalid periods/modules.
- [ ] **Step 6: Run focused tests and TypeScript** with `npx tsx --test tests/operations-reports.test.ts` and `npx tsc --noEmit`.
- [ ] **Step 7: Commit** with `fix: isolate operations reports by permission`.

### Task 3: Validación completa de Route Handlers

**Files:**
- Create: `tests/operations-api-validation.test.ts`
- Modify: `app/api/panel/logistica/**/*.ts`
- Modify: `app/api/panel/mantenimiento/**/*.ts`
- Modify: `app/api/panel/bodegas/**/*.ts`
- Modify: `app/api/panel/production-orders/**/*.ts`
- Modify: `app/api/panel/production-runs/**/*.ts`
- Modify: `app/api/panel/produccion/moldes/**/*.ts`

**Interfaces:**
- Consumes the parsers from Task 1.
- Produces uniform 400 responses for invalid JSON, dates, numbers, enums and missing identifiers; 404 remains reserved for valid identifiers with no entity.

- [ ] **Step 1: Write table-driven failing tests** covering every mutating endpoint with malformed JSON, wrong enum, impossible date, invalid timestamp, fractional quantity and empty identifiers.
- [ ] **Step 2: Run the test file** and record that each case reaches current unsafe parsing or Prisma instead of returning 400.
- [ ] **Step 3: Replace unchecked casts and `new Date(...)` calls** with the shared parsers; whitelist every enum and trim all required strings before calling domain functions.
- [ ] **Step 4: Validate date ranges centrally** and ensure `from <= to` after parsing, not by string comparison alone.
- [ ] **Step 5: Run API validation tests and TypeScript** until both are clean.
- [ ] **Step 6: Commit** with `fix: validate operations API inputs`.

### Task 4: Transiciones atómicas y finalización real de producción

**Files:**
- Create: `tests/production-order-transitions.test.ts`
- Modify: `lib/panel.ts`
- Modify: `app/api/panel/production-orders/[id]/approve/route.ts`
- Modify: `app/api/panel/production-orders/[id]/start/route.ts`
- Modify: `app/api/panel/production-orders/[id]/complete/route.ts`
- Modify: `app/api/panel/production-orders/[id]/cancel/route.ts`

**Interfaces:**
- Produces conditional transitions `transitionProductionOrder(id, from, to, metadata?)`.
- `completeProductionOrder(id)` throws `NO_PRODUCTION_RUNS` or `INSUFFICIENT_PRODUCTION` when net acceptable units (`produced - damaged - nonConforming`, clamped at zero per run) do not cover ordered units.

- [ ] **Step 1: Write failing transition tests** for two simultaneous starts, completion without corridas, insufficient net production, sufficient production and cancellation from forbidden states.
- [ ] **Step 2: Run them and confirm current read-then-write transitions fail the concurrency/production assertions.**
- [ ] **Step 3: Implement conditional `updateMany` transitions in a transaction** and map a zero update count to `INVALID_TRANSITION`.
- [ ] **Step 4: Aggregate associated production runs before completion** and reject missing/insufficient production without changing state.
- [ ] **Step 5: Map domain errors to 409/400 responses** without collapsing them into generic 500 errors.
- [ ] **Step 6: Run transition tests and TypeScript.**
- [ ] **Step 7: Commit** with `fix: enforce production order transitions`.

### Task 5: Mantenimiento consistente bajo concurrencia

**Files:**
- Create: `tests/maintenance-transitions.test.ts`
- Modify: `lib/maintenance.ts`
- Modify: `app/api/panel/mantenimiento/ordenes/[id]/route.ts`

**Interfaces:**
- Produces `generateMaintenanceOrderNumber(tx)` with bounded retry on Prisma `P2002` and conditional state transitions for start, complete and cancel.

- [ ] **Step 1: Write failing tests** for duplicate-number retry, simultaneous start, completing a pending order, cancelling a completed order and equipment status with another open order.
- [ ] **Step 2: Run tests and confirm current behavior fails.**
- [ ] **Step 3: Generate and create the maintenance order in one transaction** with up to three retries only on the unique `number` constraint.
- [ ] **Step 4: Replace read/update transitions with conditional updates** and preserve equipment status until no pending/in-progress orders remain.
- [ ] **Step 5: Return domain-specific 409 responses** from the route.
- [ ] **Step 6: Run tests and TypeScript.**
- [ ] **Step 7: Commit** with `fix: make maintenance transitions atomic`.

### Task 6: Integridad de moldes y montajes

**Files:**
- Create: `tests/mold-changes.test.ts`
- Modify: `prisma/schema.prisma`
- Modify: `lib/molds.ts`
- Modify: `app/api/panel/produccion/moldes/[id]/route.ts`
- Modify: `app/api/panel/produccion/moldes/cambios/[id]/route.ts`
- Modify: `app/api/panel/produccion/moldes/cambios/route.ts`

**Interfaces:**
- Status changes exposed by the generic mold PATCH are limited to name and maintenance entry/exit compatible with no open mounting.
- Mount/unmount is the sole path for `IN_USE`.

- [ ] **Step 1: Write failing tests** for two simultaneous mounts on one machine, one mold on two machines, direct `IN_USE`, maintenance while mounted and double unmount.
- [ ] **Step 2: Run tests and confirm the existing read-before-create checks are insufficient.**
- [ ] **Step 3: Add schema support for an atomic open-mount claim** using nullable unique active references (or an equivalent transaction-safe ownership model supported by Prisma/PostgreSQL), preserving historical `MoldChange` rows.
- [ ] **Step 4: Apply with `npx prisma db push` and then `npx prisma generate`; never use `migrate dev`.**
- [ ] **Step 5: Update mount/unmount transactions** so claims and statuses change together and failures roll back.
- [ ] **Step 6: Restrict the generic mold PATCH** and map conflicts to 409.
- [ ] **Step 7: Run tests, Prisma validation and TypeScript.**
- [ ] **Step 8: Commit** with `fix: enforce exclusive mold mounting`.

### Task 7: Stock bajo correcto por bodega

**Files:**
- Create: `tests/warehouse-kpis.test.ts`
- Modify: `lib/warehouses.ts`
- Modify: `app/api/panel/operaciones/route.ts`

**Interfaces:**
- Produces `summarizeWarehouseStock(warehouses, products)` where `lowStock` counts every active product whose local quantity is less than or equal to its minimum, including zero.

- [ ] **Step 1: Write failing tests** for stock suficiente global pero crítico local, cantidad local cero y cantidades por encima del mínimo.
- [ ] **Step 2: Run tests and confirm the dashboard calculation fails the first two cases.**
- [ ] **Step 3: Extract and use the pure warehouse summarizer** in the dashboard route.
- [ ] **Step 4: Run the focused test and TypeScript.**
- [ ] **Step 5: Commit** with `fix: calculate low stock per warehouse`.

### Task 8: Resolver los errores ESLint de carga en cliente

**Files:**
- Modify: `app/panel/operaciones/page.tsx`
- Modify: `app/panel/bodegas/page.tsx`
- Modify: `app/panel/logistica/page.tsx`
- Modify: `app/panel/mantenimiento/page.tsx`
- Modify: `app/panel/produccion/moldes/page.tsx`

**Interfaces:**
- No cambia contratos HTTP ni comportamiento visible; produce carga cancelable que no actualiza estado después de desmontaje.

- [ ] **Step 1: Capture the current failing ESLint command** for the five pages.
- [ ] **Step 2: Refactor each loader effect** to own its async work and `AbortController`, keeping event-triggered reloads in a separate callback.
- [ ] **Step 3: Run focused ESLint** and confirm zero errors/warnings in the affected files.
- [ ] **Step 4: Run TypeScript and all Node tests.**
- [ ] **Step 5: Commit** with `fix: make operations page loading lint-safe`.

### Task 9: Verificación Playwright por rol y flujo crítico

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/operations-integrity.spec.ts`
- Create: `tests/e2e/fixtures/operations-users.ts`
- Modify only if required by existing test seeding: `scripts/create-operaciones-users.ts`

**Interfaces:**
- Produces repeatable browser scenarios for one restricted role and one operations manager using dedicated non-production test identities.

- [ ] **Step 1: Read Next.js Playwright guidance** at `node_modules/next/dist/docs/01-app/02-guides/testing/playwright.md` and configure the existing Next.js application without adding a second test stack.
- [ ] **Step 2: Write browser tests** for module navigation visibility, forbidden report access, server-generated report KPI, production transition guards, exclusive mold mounting, maintenance transition guards and local warehouse low-stock display.
- [ ] **Step 3: Stop the old process on port 3000**, start a fresh `next dev`, and run the test once to observe expected failures before the fixes are considered complete.
- [ ] **Step 4: Run `npx playwright test tests/e2e/operations-integrity.spec.ts`** against isolated test records and confirm all scenarios pass in Chromium.
- [ ] **Step 5: Run the complete gate:** `npx tsx --test tests/*.test.ts`, `npx tsc --noEmit`, focused `npx eslint ...`, and the Playwright suite.
- [ ] **Step 6: Inspect `git diff --check` and `git status --short`**, ensuring `.agents/` and `.claude/` remain untouched/untracked.
- [ ] **Step 7: Commit** with `test: verify operations integrity flows`.

## Final acceptance checklist

- [ ] Informes nunca cruzan límites de permisos.
- [ ] KPI persistidos provienen del servidor.
- [ ] Entradas inválidas devuelven 400 de forma consistente.
- [ ] Transiciones concurrentes dejan un único estado válido.
- [ ] Producción no se completa sin unidades netas suficientes.
- [ ] Numeración de mantenimiento resiste colisiones.
- [ ] Montajes de moldes son exclusivos y coherentes con su estado.
- [ ] Stock bajo es local a cada bodega e incluye cero.
- [ ] TypeScript, ESLint, tests y Playwright están en verde.
- [ ] No se implementó ningún elemento de las fases 2 a 6.
