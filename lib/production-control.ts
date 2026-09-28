import { prisma } from "@/lib/prisma";
import type { Permission } from "@/lib/permission-defaults";
import { isRecord, parseBogotaCivilDate, parseDateRange, parseEnum, parseRequiredString } from "@/lib/operations-validation";
import { addDays, bogotaNow } from "@/lib/commercial-calendar";
import { OWN_WINDOW_DAYS, buildIndicators, overlapsPartially, withinOwnWindow } from "@/lib/production-control-calculator";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

function isUniqueViolation(e: unknown) {
  return Boolean(e && typeof e === "object" && "code" in e && e.code === "P2002");
}

// ─── Alcance ─────────────────────────────────────────────────────

/**
 * Qué puede hacer el usuario en el módulo, derivado del permiso efectivo (no del rol):
 * manage = gestiona todo · own = solo sus propios bloques · read = lectura de todo.
 */
export type ControlScope = "manage" | "own" | "read";

export function controlScope(p: Permission): ControlScope | null {
  if (p.canEdit) return "manage";
  if (p.canCreate) return "own";
  if (p.canView) return "read";
  return null;
}

// ─── Parsers ─────────────────────────────────────────────────────

/** "YYYY-MM-DD" → fecha civil guardada a mediodía UTC (convención de ensamble). */
export function civilDate(value: unknown): Date {
  parseBogotaCivilDate(value);
  return new Date(`${value as string}T12:00:00.000Z`);
}

// Tope de columna Int de Postgres: más allá, Prisma revienta con 500 en vez de un 400 claro.
const MAX_INT = 2_147_483_647;

function intOrThrow(value: unknown, code: string, min: number): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > MAX_INT) throw new Error(code);
  return value;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

// ─── ODTs ────────────────────────────────────────────────────────

const WORK_ORDER_STATUSES = ["OPEN", "CLOSED"] as const;

export type WorkOrderInput = {
  number: number;
  date: Date;
  reference: string;
  productName: string;
  client: string;
  lot: number | null;
  quantity: number;
  producedQuantity: number | null;
  notes: string | null;
};

/** Valida el cuerpo de una ODT. Con `partial` solo exige los campos presentes. */
export function parseWorkOrderInput(body: unknown, partial = false): Partial<WorkOrderInput> {
  if (!isRecord(body)) throw new Error("INVALID_BODY");
  const has = (k: string) => body[k] !== undefined;
  const out: Partial<WorkOrderInput> = {};
  if (!partial || has("number")) out.number = intOrThrow(body.number, "INVALID_WORK_ORDER_NUMBER", 1);
  if (!partial || has("date")) out.date = civilDate(body.date);
  if (!partial || has("reference")) out.reference = parseRequiredString(body.reference);
  if (!partial || has("productName")) out.productName = parseRequiredString(body.productName);
  if (!partial || has("client")) out.client = (optionalText(body.client) ?? "KLINIU").toUpperCase();
  if (!partial || has("quantity")) out.quantity = intOrThrow(body.quantity, "INVALID_QUANTITY", 1);
  if (has("lot")) out.lot = body.lot === null || body.lot === "" ? null : intOrThrow(body.lot, "INVALID_LOT", 1);
  if (has("producedQuantity")) {
    out.producedQuantity = body.producedQuantity === null || body.producedQuantity === ""
      ? null
      : intOrThrow(body.producedQuantity, "INVALID_PRODUCED_QUANTITY", 0);
  }
  if (has("notes")) out.notes = optionalText(body.notes);
  return out;
}

export function parseWorkOrderStatus(value: string | null): "OPEN" | "CLOSED" | null {
  if (!value || value === "ALL") return null;
  return parseEnum(value, WORK_ORDER_STATUSES);
}

export async function listWorkOrders(filters: { status: "OPEN" | "CLOSED" | null; q?: string }) {
  const db = requirePrisma();
  const q = filters.q?.trim();
  const asNumber = q && /^\d+$/.test(q) && Number(q) <= MAX_INT ? Number(q) : null;
  return db.workOrder.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(q
        ? {
            OR: [
              ...(asNumber !== null ? [{ number: asNumber }] : []),
              { reference: { contains: q, mode: "insensitive" as const } },
              { productName: { contains: q, mode: "insensitive" as const } },
              { client: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    include: { _count: { select: { entries: true } } },
    orderBy: { number: "desc" },
    // ponytail: tope fijo; paginar si las cerradas crecen más allá de lo que se revisa a ojo.
    take: 500,
  });
}

/** Detalle de la ODT con unidades por operación. Dos operarios pueden registrar la misma tarea: se prorratea por sharedBy. */
export async function getWorkOrderDetail(id: string) {
  const db = requirePrisma();
  const order = await db.workOrder.findUnique({ where: { id } });
  if (!order) throw new Error("NOT_FOUND");
  const entries = await db.productionTimeEntry.findMany({
    where: { workOrderId: id },
    select: { quantity: true, sharedBy: true, operatorId: true, operation: { select: { id: true, code: true, name: true } } },
  });
  const byOperation = new Map<string, { code: string; name: string; units: number; entries: number }>();
  for (const e of entries) {
    const row = byOperation.get(e.operation.id) ?? { code: e.operation.code, name: e.operation.name, units: 0, entries: 0 };
    row.units += e.quantity / e.sharedBy;
    row.entries += 1;
    byOperation.set(e.operation.id, row);
  }
  return {
    order,
    operations: [...byOperation.values()].sort((a, b) => a.code.localeCompare(b.code)),
    operators: new Set(entries.map((e) => e.operatorId)).size,
  };
}

export async function nextWorkOrderNumber(): Promise<number | null> {
  const db = requirePrisma();
  const last = await db.workOrder.findFirst({ orderBy: { number: "desc" }, select: { number: true } });
  return last ? last.number + 1 : null;
}

export async function createWorkOrder(input: WorkOrderInput, userId: string) {
  const db = requirePrisma();
  try {
    return await db.workOrder.create({ data: { ...input, createdById: userId } });
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("WORK_ORDER_NUMBER_TAKEN");
    throw e;
  }
}

export async function updateWorkOrder(id: string, input: Partial<WorkOrderInput>) {
  const db = requirePrisma();
  if (input.producedQuantity === null) {
    const order = await db.workOrder.findUnique({ where: { id }, select: { status: true } });
    if (!order) throw new Error("NOT_FOUND");
    if (order.status === "CLOSED") throw new Error("PRODUCED_QUANTITY_REQUIRED");
  }
  try {
    return await db.workOrder.update({ where: { id }, data: input });
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("WORK_ORDER_NUMBER_TAKEN");
    throw e;
  }
}

/** Cerrar exige UNI PROD (la que llega o la ya guardada). */
export async function closeWorkOrder(id: string, producedQuantity: number | null | undefined) {
  const db = requirePrisma();
  const order = await db.workOrder.findUnique({ where: { id }, select: { producedQuantity: true } });
  if (!order) throw new Error("NOT_FOUND");
  const produced = producedQuantity ?? order.producedQuantity;
  if (produced === null || produced === undefined) throw new Error("PRODUCED_QUANTITY_REQUIRED");
  const { count } = await db.workOrder.updateMany({
    where: { id, status: "OPEN" },
    data: { status: "CLOSED", producedQuantity: produced, closedAt: new Date() },
  });
  if (count === 0) throw new Error("WORK_ORDER_NOT_OPEN");
  return db.workOrder.findUniqueOrThrow({ where: { id } });
}

export async function reopenWorkOrder(id: string) {
  const db = requirePrisma();
  const { count } = await db.workOrder.updateMany({
    where: { id, status: "CLOSED" },
    data: { status: "OPEN", closedAt: null },
  });
  if (count === 0) {
    const exists = await db.workOrder.findUnique({ where: { id }, select: { id: true } });
    throw new Error(exists ? "WORK_ORDER_NOT_CLOSED" : "NOT_FOUND");
  }
  return db.workOrder.findUniqueOrThrow({ where: { id } });
}

export async function deleteWorkOrder(id: string) {
  const db = requirePrisma();
  const entries = await db.productionTimeEntry.count({ where: { workOrderId: id } });
  if (entries > 0) throw new Error("WORK_ORDER_HAS_ENTRIES");
  await db.workOrder.delete({ where: { id } });
}

// ─── Operaciones estándar (hoja TIEMPOS) ─────────────────────────

export type OperationInput = { code: string; name: string; family: string; standardSeconds: number; isActive: boolean };

export function parseOperationInput(body: unknown, partial = false): Partial<OperationInput> {
  if (!isRecord(body)) throw new Error("INVALID_BODY");
  const has = (k: string) => body[k] !== undefined;
  const out: Partial<OperationInput> = {};
  if (!partial || has("code")) out.code = parseRequiredString(body.code).toUpperCase();
  if (!partial || has("name")) out.name = parseRequiredString(body.name).toUpperCase();
  if (!partial || has("family")) out.family = parseRequiredString(body.family).toUpperCase();
  if (!partial || has("standardSeconds")) {
    const v = body.standardSeconds;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 86_400) throw new Error("INVALID_STANDARD_TIME");
    out.standardSeconds = v;
  }
  if (typeof body.isActive === "boolean") out.isActive = body.isActive;
  return out;
}

export async function listOperations(onlyActive = false) {
  const db = requirePrisma();
  return db.standardOperation.findMany({
    where: onlyActive ? { isActive: true } : {},
    include: { _count: { select: { entries: true } } },
    orderBy: [{ family: "asc" }, { code: "asc" }],
  });
}

export async function createOperation(input: OperationInput) {
  const db = requirePrisma();
  try {
    return await db.standardOperation.create({ data: input });
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("OPERATION_CODE_TAKEN");
    throw e;
  }
}

/** Cambiar el estándar no toca bloques ya registrados: cada bloque guarda su snapshot. */
export async function updateOperation(id: string, input: Partial<OperationInput>) {
  const db = requirePrisma();
  try {
    return await db.standardOperation.update({ where: { id }, data: input });
  } catch (e) {
    if (isUniqueViolation(e)) throw new Error("OPERATION_CODE_TAKEN");
    throw e;
  }
}

export async function deleteOperation(id: string) {
  const db = requirePrisma();
  const entries = await db.productionTimeEntry.count({ where: { operationId: id } });
  if (entries > 0) throw new Error("OPERATION_HAS_ENTRIES");
  await db.standardOperation.delete({ where: { id } });
}

// ─── Bloques por operario ────────────────────────────────────────

const SECTIONS = ["ENSAMBLE", "EMPAQUE"] as const;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const MAX_SHARED_BY = 10;
const MAX_RANGE_DAYS = 366;
// ponytail: tope fijo de filas por consulta; paginar si un rango de un año supera esto.
const MAX_ENTRY_ROWS = 5000;

/** Quién puede aparecer como operario: OPERARIO/LIDER_ENSAMBLE activos (salvo override que lo quite) o con override para registrar. */
const OPERATOR_WHERE = {
  status: "ACTIVE" as const,
  OR: [
    {
      role: { in: ["OPERARIO" as const, "LIDER_ENSAMBLE" as const] },
      permissions: { none: { module: "MODULE_CONTROL_PRODUCCION" as const, canCreate: false } },
    },
    { permissions: { some: { module: "MODULE_CONTROL_PRODUCCION" as const, canCreate: true } } },
  ],
};

export type EntryInput = {
  operatorId: string;
  date: string;
  start: string;
  end: string;
  section: (typeof SECTIONS)[number];
  workOrderId: string | null;
  operationId: string;
  quantity: number;
  sharedBy: number;
  observations: string | null;
};

export type EntryActor = { id: string; permission: Permission };

function parseTime(value: unknown): string {
  if (typeof value !== "string" || !TIME_RE.test(value)) throw new Error("INVALID_TIME");
  return value;
}

/** Valida el cuerpo de un bloque. Con `partial` solo exige los campos presentes. */
export function parseEntryInput(body: unknown, partial = false): Partial<EntryInput> {
  if (!isRecord(body)) throw new Error("INVALID_BODY");
  const has = (k: string) => body[k] !== undefined;
  const out: Partial<EntryInput> = {};
  if (has("operatorId")) out.operatorId = parseRequiredString(body.operatorId);
  if (!partial || has("date")) {
    parseBogotaCivilDate(body.date);
    out.date = body.date as string;
  }
  if (!partial || has("start")) out.start = parseTime(body.start);
  if (!partial || has("end")) out.end = parseTime(body.end);
  if (!partial || has("section")) out.section = parseEnum(body.section, SECTIONS);
  if (!partial || has("workOrderId")) out.workOrderId = optionalText(body.workOrderId);
  if (!partial || has("operationId")) out.operationId = parseRequiredString(body.operationId);
  if (!partial || has("quantity")) out.quantity = intOrThrow(body.quantity, "INVALID_ENTRY_QUANTITY", 0);
  if (has("sharedBy")) {
    out.sharedBy = intOrThrow(body.sharedBy, "INVALID_SHARED_BY", 1);
    if (out.sharedBy > MAX_SHARED_BY) throw new Error("INVALID_SHARED_BY");
  }
  if (has("observations")) out.observations = optionalText(body.observations);
  return out;
}

const entryInclude = {
  operator: { select: { id: true, fullName: true } },
  operation: { select: { id: true, code: true, name: true, family: true } },
  workOrder: { select: { id: true, number: true, reference: true, productName: true, status: true } },
} as const;

const clock = (date: string, hhmm: string) => new Date(`${date}T${hhmm}:00.000Z`);
const dateKeyOf = (d: Date) => d.toISOString().slice(0, 10);
const timeKeyOf = (d: Date) => d.toISOString().slice(11, 16);

type ExistingEntry = NonNullable<Awaited<ReturnType<typeof findEntry>>>;

function findEntry(id: string) {
  return requirePrisma().productionTimeEntry.findUnique({ where: { id } });
}

/** Crea o actualiza un bloque aplicando todas las reglas; `existing` = null para crear. */
async function writeEntry(actor: EntryActor, existing: ExistingEntry | null, input: Partial<EntryInput>) {
  const db = requirePrisma();
  const today = bogotaNow().key;

  let operatorId = existing?.operatorId ?? actor.id;
  // Solo quien gestiona registra o reasigna a nombre de otro; para los demás el campo se ignora.
  if (input.operatorId !== undefined && input.operatorId !== operatorId && actor.permission.canEdit) {
    if (input.operatorId !== actor.id) {
      const eligible = await db.user.findFirst({ where: { id: input.operatorId, ...OPERATOR_WHERE }, select: { id: true } });
      if (!eligible) throw new Error("OPERATOR_NOT_ELIGIBLE");
    }
    operatorId = input.operatorId;
  }

  const m = {
    date: input.date ?? (existing ? dateKeyOf(existing.workDate) : ""),
    start: input.start ?? (existing ? timeKeyOf(existing.startTime) : ""),
    end: input.end ?? (existing ? timeKeyOf(existing.endTime) : ""),
    section: input.section ?? existing?.section ?? "ENSAMBLE",
    workOrderId: input.workOrderId !== undefined ? input.workOrderId : (existing?.workOrderId ?? null),
    operationId: input.operationId ?? existing?.operationId ?? "",
    quantity: input.quantity ?? existing?.quantity ?? 0,
    sharedBy: input.sharedBy ?? existing?.sharedBy ?? 1,
    observations: input.observations !== undefined ? input.observations : (existing?.observations ?? null),
  };

  if (m.date > today) throw new Error("DATE_IN_FUTURE");
  if (!actor.permission.canEdit && !withinOwnWindow(m.date, today)) throw new Error("OUTSIDE_EDIT_WINDOW");
  if (m.end <= m.start) throw new Error("INVALID_TIME_RANGE");

  return db.$transaction(async (tx) => {
    // Dos envíos seguidos del mismo operario/día no deben pasar ambos el chequeo de solapes.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`time-entry:${operatorId}:${m.date}`}))`;

    const operation = await tx.standardOperation.findUnique({ where: { id: m.operationId } });
    if (!operation) throw new Error("OPERATION_NOT_FOUND");
    const operationChanged = !existing || existing.operationId !== m.operationId;
    if (operationChanged && !operation.isActive) throw new Error("OPERATION_INACTIVE");
    const standardSeconds = operationChanged ? operation.standardSeconds : existing.standardSeconds;

    if (standardSeconds > 0 && !m.workOrderId) throw new Error("WORK_ORDER_REQUIRED");
    if (standardSeconds > 0 && m.quantity <= 0) throw new Error("INVALID_ENTRY_QUANTITY");
    if (m.workOrderId && (!existing || existing.workOrderId !== m.workOrderId)) {
      const order = await tx.workOrder.findUnique({ where: { id: m.workOrderId }, select: { status: true } });
      if (!order) throw new Error("WORK_ORDER_NOT_FOUND");
      if (order.status !== "OPEN") throw new Error("WORK_ORDER_CLOSED");
    }

    const workDate = civilDate(m.date);
    const startTime = clock(m.date, m.start);
    const endTime = clock(m.date, m.end);
    const sameDay = await tx.productionTimeEntry.findMany({
      where: { operatorId, workDate, ...(existing ? { id: { not: existing.id } } : {}) },
      select: { startTime: true, endTime: true },
    });
    if (overlapsPartially(sameDay, { startTime, endTime })) throw new Error("TIME_OVERLAP");

    const data = {
      operatorId, workDate, startTime, endTime, section: m.section, workOrderId: m.workOrderId,
      operationId: m.operationId, standardSeconds, quantity: m.quantity, sharedBy: m.sharedBy, observations: m.observations,
    };
    return existing
      ? tx.productionTimeEntry.update({ where: { id: existing.id }, data, include: entryInclude })
      : tx.productionTimeEntry.create({ data: { ...data, createdById: actor.id }, include: entryInclude });
  });
}

export async function createEntry(input: Partial<EntryInput>, actor: EntryActor) {
  return writeEntry(actor, null, input);
}

/** Propio dentro de la ventana, o cualquiera con `edit`. */
export async function updateEntry(id: string, input: Partial<EntryInput>, actor: EntryActor) {
  const existing = await findEntry(id);
  if (!existing) throw new Error("NOT_FOUND");
  if (!actor.permission.canEdit) {
    if (existing.operatorId !== actor.id || !actor.permission.canCreate) throw new Error("FORBIDDEN");
    if (!withinOwnWindow(dateKeyOf(existing.workDate), bogotaNow().key)) throw new Error("OUTSIDE_EDIT_WINDOW");
  }
  return writeEntry(actor, existing, input);
}

/** Propio dentro de la ventana, o cualquiera con `delete`. */
export async function deleteEntry(id: string, actor: EntryActor) {
  const db = requirePrisma();
  const existing = await findEntry(id);
  if (!existing) throw new Error("NOT_FOUND");
  if (!actor.permission.canDelete) {
    if (existing.operatorId !== actor.id || !actor.permission.canCreate) throw new Error("FORBIDDEN");
    if (!actor.permission.canEdit && !withinOwnWindow(dateKeyOf(existing.workDate), bogotaNow().key)) {
      throw new Error("OUTSIDE_EDIT_WINDOW");
    }
  }
  await db.productionTimeEntry.delete({ where: { id } });
}

export type EntryFilters = { from: string; to: string; operatorId?: string; workOrderId?: string; section?: string };

export async function listEntries(filters: EntryFilters, actor: EntryActor, scope: ControlScope) {
  const db = requirePrisma();
  const { from, to } = parseDateRange(filters.from, filters.to);
  if (addDays(from, MAX_RANGE_DAYS) < to) throw new Error("RANGE_TOO_LONG");
  const rows = await db.productionTimeEntry.findMany({
    where: {
      workDate: { gte: civilDate(from), lte: civilDate(to) },
      // Quien solo registra lo suyo nunca ve bloques de otros, pida lo que pida.
      ...(scope === "own" ? { operatorId: actor.id } : filters.operatorId ? { operatorId: filters.operatorId } : {}),
      ...(filters.workOrderId ? { workOrderId: filters.workOrderId } : {}),
      ...(filters.section ? { section: parseEnum(filters.section, SECTIONS) } : {}),
    },
    include: entryInclude,
    orderBy: [{ workDate: "desc" }, { operator: { fullName: "asc" } }, { startTime: "asc" }],
    take: MAX_ENTRY_ROWS + 1,
  });
  return { entries: rows.slice(0, MAX_ENTRY_ROWS), truncated: rows.length > MAX_ENTRY_ROWS };
}

// ─── Catálogos del formulario ────────────────────────────────────

export async function getControlOptions(scope: ControlScope, actorId: string) {
  const db = requirePrisma();
  const today = bogotaNow().key;
  const [openOrders, operations, products, pastOrders, pastClients, nextNumber, operators, recent] = await Promise.all([
    db.workOrder.findMany({
      where: { status: "OPEN" },
      select: { id: true, number: true, reference: true, productName: true, client: true },
      orderBy: { number: "desc" },
    }),
    db.standardOperation.findMany({
      where: { isActive: true },
      select: { id: true, code: true, name: true, family: true, standardSeconds: true },
      orderBy: [{ family: "asc" }, { code: "asc" }],
    }),
    scope === "manage"
      ? db.product.findMany({ where: { active: true }, select: { sku: true, name: true }, orderBy: { sku: "asc" } })
      : Promise.resolve([]),
    scope === "manage"
      ? db.workOrder.findMany({
          select: { reference: true, productName: true, client: true },
          distinct: ["reference"],
          orderBy: { number: "desc" },
          take: 500,
        })
      : Promise.resolve([]),
    scope === "manage"
      ? db.workOrder.findMany({ select: { client: true }, distinct: ["client"], orderBy: { client: "asc" } })
      : Promise.resolve([]),
    scope === "manage" ? nextWorkOrderNumber() : Promise.resolve(null),
    // "Registrar por" (manage) y filtro por operario (manage/read).
    scope === "own"
      ? Promise.resolve([])
      : db.user.findMany({ where: OPERATOR_WHERE, select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    // Operaciones usadas en el último mes por quien registra: salen primero en el selector.
    db.productionTimeEntry.findMany({
      where: { operatorId: actorId, workDate: { gte: civilDate(addDays(today, -30)) } },
      select: { operationId: true, section: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const references = new Map<string, string>();
  for (const o of pastOrders) references.set(o.reference, o.productName);
  for (const p of products) if (p.sku && !references.has(p.sku)) references.set(p.sku, p.name);
  const clients = [...new Set(["KLINIU", ...pastClients.map((o) => o.client)])];

  return {
    openOrders,
    operations,
    operators,
    references: [...references.entries()].map(([reference, productName]) => ({ reference, productName })),
    clients,
    nextNumber,
    today,
    ownWindowDays: OWN_WINDOW_DAYS,
    recentOperationIds: [...new Set(recent.map((r) => r.operationId))].slice(0, 15),
    lastSection: recent[0]?.section ?? null,
  };
}

// ─── Indicadores ─────────────────────────────────────────────────

/** Indicadores del rango. Quien solo registra lo suyo recibe únicamente sus propios números. */
export async function getIndicators(filters: { from: string; to: string; section?: string }, actor: EntryActor, scope: ControlScope) {
  const db = requirePrisma();
  const { from, to } = parseDateRange(filters.from, filters.to);
  if (addDays(from, MAX_RANGE_DAYS) < to) throw new Error("RANGE_TOO_LONG");
  // ponytail: agrega en memoria todo el rango (≤ 1 año, ~miles de filas); pasar a SQL si la planta crece mucho.
  const rows = await db.productionTimeEntry.findMany({
    where: {
      workDate: { gte: civilDate(from), lte: civilDate(to) },
      ...(scope === "own" ? { operatorId: actor.id } : {}),
      ...(filters.section ? { section: parseEnum(filters.section, SECTIONS) } : {}),
    },
    select: {
      id: true, operatorId: true, workDate: true, startTime: true, endTime: true,
      standardSeconds: true, quantity: true, sharedBy: true,
      operator: { select: { fullName: true } },
      operation: { select: { id: true, code: true, name: true, family: true } },
      workOrder: { select: { id: true, number: true, reference: true, productName: true, quantity: true, producedQuantity: true, status: true } },
    },
  });
  return buildIndicators(rows.map((r) => ({
    ...r,
    operatorName: r.operator.fullName,
    workDate: r.workDate.toISOString(),
  })));
}
