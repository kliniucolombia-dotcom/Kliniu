import { prisma } from "@/lib/prisma";
import type { Permission } from "@/lib/permission-defaults";
import { isRecord, parseBogotaCivilDate, parseEnum, parseRequiredString } from "@/lib/operations-validation";

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

// ─── Catálogos del formulario ────────────────────────────────────

export async function getControlOptions(scope: ControlScope) {
  const db = requirePrisma();
  const [openOrders, operations, products, pastOrders, pastClients, nextNumber, operators] = await Promise.all([
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
    // Selector "registrar por": operarios, líderes de ensamble y quien tenga override para registrar.
    scope === "manage"
      ? db.user.findMany({
          where: {
            status: "ACTIVE",
            OR: [
              {
                role: { in: ["OPERARIO", "LIDER_ENSAMBLE"] },
                permissions: { none: { module: "MODULE_CONTROL_PRODUCCION", canCreate: false } },
              },
              { permissions: { some: { module: "MODULE_CONTROL_PRODUCCION", canCreate: true } } },
            ],
          },
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        })
      : Promise.resolve([]),
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
  };
}
