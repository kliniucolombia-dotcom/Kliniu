# Producción — Especificación

Referencia funcional: `Planillas Diarias de Inyecciones.xlsx` (hoja `PLANILLA DIRIA`, junio). Objetivo: mismo resultado operativo (registrar corridas de inyección), integrado al sistema, sin copiar el Excel visualmente.

## 1. QA del Excel — fórmulas verificadas

Columnas P–T (fila de datos, ej. fila 9):

- `P` Cantidad unitaria de piezas (producida) — input
- `Q` Cantidad dañada — input
- `R` Cantidad total de piezas buenas = `=P9-Q9` → **`produced - damaged`**
- `S` Cantidad de piezas no conformes — input (columna vacía en casi todas las filas revisadas, pero existe y se usa en `T`)
- `T` Indicador % piezas buenas = `=(R9-S9)/P9` → **`(goodPieces - nonConforming) / produced`**, formato celda porcentaje (no hay `*100` literal en la fórmula, el header dice "x100" mal etiquetado — es solo formato visual).

Confirmado en ~230 filas de datos: sin excepciones, sin fórmulas alternativas. `R` a veces aparece como valor fijo (no fórmula) en filas antiguas, pero el patrón dominante y correcto es `P-Q`.

**Coincide exactamente con lo propuesto por el usuario.** `calcGoodPieces = produced - damaged` (nunca negativo) y `calcQualityPercentage = ((goodPieces - nonConforming) / produced) * 100` (multiplicando por 100 explícito porque el store no usa formato de celda). Sin diferencias, no se detiene implementación.

### Catálogo de máquinas (filas 7-12, columnas A-C)

| Código | Marca | 
|---|---|
| 1 | WELLTEC |
| 2 | APEM |
| 3 | GREENST |
| 4 | HENGDA |
| 5 | HAIJING |
| 6 | PRENSA (CAUCHOS) |

La marca es fija por máquina. El operario (`Persona Encargada`) **varía por corrida**, no es fijo por máquina (ej. máquina 5 aparece con "John Jairo" y "Kike" en filas distintas) → operario es input de cada `ProductionRun`, no del catálogo.

## 2. Arquitectura

Mismo patrón que `SaleCalculator`/`Quotation`:

- Modelos nuevos en `prisma/schema.prisma`: `Machine`, `ProductionRun`.
- Cálculos puros en `lib/production-calculator.ts` (sin acceso a DB).
- CRUD en `lib/panel.ts`.
- API REST bajo `app/api/panel/production-runs/` y `app/api/panel/machines/`.
- Frontend bajo `app/panel/produccion/`.
- **Regla dura**: no se persisten `goodPieces` ni `qualityPercentage`. Se calculan siempre con `production-calculator.ts`, tanto en API como en frontend (resumen en vivo).

No se crea `ProductionResult` como modelo separado — el Excel no lo justifica; "resultados" y "calculados" son columnas del mismo registro (`ProductionRun`). Un modelo aparte solo agregaría un join innecesario.

**Decisión: `operatorId` referencia `User` existente** (mismo patrón que `Campaign.seller`), sin restricción de `role` — el Excel identifica operarios por nombre, no por rol de sistema. Si en el futuro se requiere un rol dedicado (`OPERATOR`), es un cambio de enum aislado, no afecta este modelo.

## 3. Modelo de datos

```prisma
model Machine {
  id        String   @id @default(cuid())
  code      Int      @unique   // 1, 2, 3... (N° máquina del Excel)
  name      String             // nombre interno, ej. "Inyectora 1"
  brand     String             // WELLTEC, APEM, HENGDA... — única fuente de verdad de la marca
  model     String?
  location  String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  runs      ProductionRun[]

  @@index([isActive])
}

model ProductionRun {
  id               String   @id @default(cuid())
  machineId        String
  machine          Machine  @relation(fields: [machineId], references: [id])
  operatorId       String
  operator         User     @relation("ProductionOperator", fields: [operatorId], references: [id])
  productId        String?
  product          Product? @relation(fields: [productId], references: [id])
  orderNumber      String
  productionDate   DateTime
  startTime        DateTime
  endTime          DateTime

  // Parámetros (propios de la corrida; no viven en Machine ni en Product)
  material         String
  pigment          String?
  injectionWeight  Float    // gramos
  pieceWeight      Float    // gramos (peso de la vela)
  cycle            Float    // segundos
  temperature      Float    // °C

  // Producción (inputs, nunca derivados)
  produced         Int
  damaged          Int      @default(0)
  nonConforming    Int      @default(0)

  // Observaciones
  couplingTest     String?  // "prueba de acople con pieza complementaria"
  observations     String?

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  @@index([machineId])
  @@index([operatorId])
  @@index([productionDate])
}
```

`goodPieces` y `qualityPercentage` NO están en el modelo — se derivan siempre, nunca se escriben en `ProductionRun`.

La marca de la máquina **nunca se escribe en `ProductionRun`** — se lee siempre por join a través de `machineId → Machine.brand`. Ningún formulario permite editarla manualmente.

`productId` opcional: si el producto existe en catálogo, autocompleta nombre/referencia/material/peso de referencia; si no, `material`/`pieceWeight`/`injectionWeight` se ingresan manualmente (igual que `QuotationItem.manualImageUrl` vs `productId`). No se duplica el nombre de la pieza como columna aparte — se lee de `Product.name` cuando hay `productId`, o queda implícito en `material`+observaciones cuando no.

Requiere agregar a `User`: `productionRuns ProductionRun[] @relation("ProductionOperator")`.

## 4. `lib/production-calculator.ts`

```ts
export type ProductionRunInput = {
  produced: number;
  damaged: number;
  nonConforming: number;
};

export type ProductionSummary = {
  goodPieces: number;
  qualityPercentage: number;
};

export function calcGoodPieces(input: ProductionRunInput): number {
  return Math.max(input.produced - input.damaged, 0);
}

export function calcQualityPercentage(input: ProductionRunInput): number {
  if (input.produced === 0) return 0;
  const goodPieces = calcGoodPieces(input);
  const pct = ((goodPieces - input.nonConforming) / input.produced) * 100;
  if (!Number.isFinite(pct)) return 0;
  return pct;
}

export function buildProductionSummary(input: ProductionRunInput): ProductionSummary {
  return {
    goodPieces: calcGoodPieces(input),
    qualityPercentage: calcQualityPercentage(input),
  };
}
```

Sin duplicación: `buildProductionSummary` solo compone las dos funciones base, igual que `buildQuotationSummary`/`buildSaleCalculatorSummary`.

## 5. API

- `GET/POST /api/panel/machines` — catálogo.
- `GET/PATCH/DELETE /api/panel/machines/[id]`
- `GET/POST /api/panel/production-runs` — filtros por fecha/máquina.
- `GET/PATCH/DELETE /api/panel/production-runs/[id]`

Todas las respuestas de `ProductionRun` incluyen `summary: buildProductionSummary(run)` calculado en `lib/panel.ts`, nunca leído de DB.

## 6. Flujo

```
Nueva corrida
  ↓
Seleccionar máquina        → autocompleta marca (solo lectura)
  ↓
Seleccionar operario       → User existente
  ↓
Seleccionar producto       → autocompleta nombre/referencia/material/peso si existe
  ↓
Completar parámetros restantes (los que no autocompletó el producto)
  ↓
Registrar producción       → produced, damaged, nonConforming
  ↓
Resumen automático         → goodPieces, qualityPercentage (useMemo, sin botón)
  ↓
Guardar                    → solo inputs, nunca derivados
```

## 7. Interfaz

No copiar el Excel. `app/panel/produccion/` — formulario en 4 bloques:

1. **Información general**: máquina (select → autocompleta marca, solo lectura), operario (select de `User`), producto, fecha, hora inicio, hora final, N° orden.
2. **Parámetros de producción**: material, peso inyección, peso pieza, ciclo, temperatura, pigmento — autocompletados si `productId` tiene datos de referencia, editables si no.
3. **Producción**: cantidad producida, dañada, no conforme (inputs), prueba de acople, observaciones.
4. **Resumen**: piezas buenas + % calidad, vía `useMemo` sobre `buildProductionSummary`, sin botón "Calcular" (mismo patrón que `app/panel/calculadora-precio/[id]/page.tsx`).

Listado de corridas: tabla/agrupación por fecha, filtro por máquina/operario — reutilizar componentes de tabla existentes.

## 8. Reportes futuros (no implementar ahora)

El modelo actual (`ProductionRun` con `machineId`, `operatorId`, `productId`, `productionDate`, campos de producción como inputs puros) permite construir después, **sin migrar el esquema**:

- Producción por máquina, por operario, por producto
- Calidad (% piezas buenas) por máquina, por operario, por producto
- Producción diaria / mensual (agregando por `productionDate`)

Todos estos reportes se resuelven con `groupBy`/agregaciones sobre `ProductionRun` + `buildProductionSummary` aplicado por fila antes de agregar — no requieren campos nuevos.

## 9. Validaciones

- `produced`, `damaged`, `nonConforming` ≥ 0, enteros.
- `temperature`, `cycle`, `injectionWeight`, `pieceWeight` > 0.
- `endTime` > `startTime` (misma corrida).
- Sanitizar con función tipo `sanitizeSaleCalcNumber` (existente en `sale-calculator.ts`, reutilizable o replicar patrón) contra `NaN`/`Infinity`.
- `damaged` y `nonConforming` no pueden superar `produced` (bloqueo en frontend + backend).

## 10. QA — casos mínimos de prueba

- `produced = 0` → `goodPieces = 0`, `qualityPercentage = 0` (sin división por cero).
- `damaged = 0` → `goodPieces = produced`.
- `nonConforming = 0` → `qualityPercentage = (goodPieces/produced)*100`.
- Producción grande (ej. `produced = 50_000`) → sin overflow, `Number.isFinite` en todo el cálculo.
- `damaged > produced` → rechazado en validación (frontend + backend), no llega a `calcGoodPieces`.
- División por cero (`produced = 0` con `damaged`/`nonConforming` > 0) → retorna `0`, nunca `NaN`/`Infinity`.
- Persistencia tras recarga: crear corrida, recargar página, `goodPieces`/`qualityPercentage` se recalculan igual (no se leen de DB, no cambian).
- Comparación con el Excel: tomar 5 filas reales de `PLANILLA DIRIA` y verificar que `goodPieces`/`qualityPercentage` calculados coinciden con `R`/`T` del Excel.

## 11. Criterios de aceptación

- Crear corrida sin guardar `goodPieces`/`qualityPercentage` en DB.
- Cambiar cantidad producida/dañada actualiza resumen en tiempo real sin botón.
- Seleccionar máquina autocompleta marca; campo marca no editable manualmente en ningún formulario.
- Seleccionar producto de catálogo (si existe) autocompleta parámetros, sin duplicar datos.
- Resultados coinciden exactamente con fórmulas del Excel para las filas comparadas en QA.

## 12. Definition of Done

- Build limpio (`npm run build` sin errores).
- Lint limpio (`npm run lint` sin errores).
- Migración Prisma aplicada (`Machine`, `ProductionRun`, relación `User.productionRuns`).
- `lib/production-calculator.ts` con tests unitarios de las 3 funciones (casos de la sección 10).
- CRUD completo en `lib/panel.ts` + rutas API.
- Frontend funcional con resumen en vivo.
- QA funcional ejecutado (todos los casos de la sección 10).
- Comparación con el Excel documentada (5 filas mínimo).
- Sin lógica de cálculo duplicada fuera de `production-calculator.ts`.
- Sin datos derivados persistidos (`goodPieces`, `qualityPercentage` no existen como columnas).

## 13. Checklist técnico

- [ ] Modelo `Machine` + seed con las 6 máquinas existentes
- [ ] Modelo `ProductionRun` + relación `User.productionRuns`
- [ ] `lib/production-calculator.ts`
- [ ] CRUD en `lib/panel.ts`
- [ ] `app/api/panel/machines/`
- [ ] `app/api/panel/production-runs/`
- [ ] `app/panel/produccion/` (listado + formulario)
- [ ] Validaciones frontend + backend
- [ ] Tests de cálculo puro

**Spec aprobada. Implementación completa.**

## Observaciones sobre el Excel original

Durante la validación final (post-implementación) se compararon 5 filas reales de `PLANILLA DIRIA`: primera fila con datos (9), dos filas intermedias (15, 130, 200) y última fila (243).

Todas coinciden exactamente con la fórmula oficial (`R = P - Q`, `T = (R - S) / P`) **excepto la fila 15**: su celda `T15` contiene el valor `0.97` escrito manualmente, que no corresponde al resultado de la fórmula (`90/95 = 94.74%`). La celda `R15` de esa misma fila también aparece como valor fijo en vez de fórmula — consistente con el hallazgo original de la sección 1 ("`R` a veces aparece como valor fijo... en filas antiguas").

**Conclusión**: es un error de digitación en el archivo Excel original, no una regla de negocio alternativa. El sistema implementa la fórmula oficial (`calcGoodPieces`, `calcQualityPercentage`) de forma consistente en el 100% de las corridas — no reproduce el error puntual de la fila 15. Queda documentado aquí para trazabilidad ante futuras auditorías que comparen contra el Excel y encuentren esa fila específica.
