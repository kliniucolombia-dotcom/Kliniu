import { prisma } from "@/lib/prisma";
import {
  assertAssemblyEffort,
  assertAssemblyQuantities,
  buildAssemblySummary,
  calcGoodUnits,
} from "@/lib/assembly-calculator";
import { WAREHOUSE_KEYS, adjustWarehouseStockTx, getWarehouseByKey } from "@/lib/warehouses";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

const runInclude = {
  station: { select: { id: true, name: true, code: true } },
  leader: { select: { id: true, fullName: true } },
  product: { select: { id: true, name: true, sku: true } },
  productionOrder: { select: { id: true, number: true } },
} as const;

type RunRow = {
  assembled: number;
  defective: number;
  nonConforming: number;
  workerCount: number;
  laborHours: number;
};

function withSummary<T extends RunRow>(run: T) {
  return { ...run, summary: buildAssemblySummary(run) };
}

// ─── Puestos de ensamble ─────────────────────────────────────────

export async function getAssemblyStations(onlyActive = false) {
  const db = requirePrisma();
  return db.assemblyStation.findMany({
    where: onlyActive ? { isActive: true } : {},
    orderBy: { code: "asc" },
  });
}

export async function createAssemblyStation(data: { code: number; name: string; location?: string | null }) {
  const db = requirePrisma();
  if (!Number.isInteger(data.code) || data.code <= 0) throw new Error("INVALID_CODE");
  if (!data.name.trim()) throw new Error("INVALID_NAME");
  return db.assemblyStation.create({
    data: { code: data.code, name: data.name.trim(), location: data.location?.trim() || null },
  });
}

export async function updateAssemblyStation(
  id: string,
  data: Partial<{ code: number; name: string; location: string | null; isActive: boolean }>,
) {
  const db = requirePrisma();
  if (data.code !== undefined && (!Number.isInteger(data.code) || data.code <= 0)) throw new Error("INVALID_CODE");
  if (data.name !== undefined && !data.name.trim()) throw new Error("INVALID_NAME");
  return db.assemblyStation.update({
    where: { id },
    data: {
      ...(data.code !== undefined ? { code: data.code } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.location !== undefined ? { location: data.location?.trim() || null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  });
}

/** Un puesto con corridas registradas no se borra: se desactiva para no perder el histórico. */
export async function deleteAssemblyStation(id: string) {
  const db = requirePrisma();
  const runs = await db.assemblyRun.count({ where: { stationId: id } });
  if (runs > 0) throw new Error("STATION_HAS_RUNS");
  await db.assemblyStation.delete({ where: { id } });
}

// ─── Corridas de ensamble ────────────────────────────────────────

export async function getAssemblyRuns(filters?: {
  stationId?: string;
  leaderId?: string;
  productId?: string;
  from?: Date;
  to?: Date;
}) {
  if (!prisma) return [];
  const runs = await prisma.assemblyRun.findMany({
    where: {
      ...(filters?.stationId ? { stationId: filters.stationId } : {}),
      ...(filters?.leaderId ? { leaderId: filters.leaderId } : {}),
      ...(filters?.productId ? { productId: filters.productId } : {}),
      ...(filters?.from || filters?.to
        ? { productionDate: { ...(filters?.from ? { gte: filters.from } : {}), ...(filters?.to ? { lte: filters.to } : {}) } }
        : {}),
    },
    include: runInclude,
    orderBy: [{ productionDate: "desc" }, { startTime: "desc" }],
  });
  return runs.map(withSummary);
}

export async function getAssemblyRunById(id: string) {
  if (!prisma) return null;
  const run = await prisma.assemblyRun.findUnique({ where: { id }, include: runInclude });
  return run ? withSummary(run) : null;
}

export type AssemblyRunWriteData = {
  stationId: string;
  leaderId: string;
  productId: string;
  productionOrderId?: string | null;
  orderNumber: string;
  productionDate: Date;
  startTime: Date;
  endTime: Date;
  assembled: number;
  defective?: number;
  nonConforming?: number;
  reworked?: number;
  workerCount: number;
  laborHours: number;
  defectReason?: string | null;
  observations?: string | null;
};

function assertRun(data: {
  assembled: number;
  defective: number;
  nonConforming: number;
  reworked: number;
  workerCount: number;
  laborHours: number;
  startTime: Date;
  endTime: Date;
}) {
  assertAssemblyQuantities(data);
  assertAssemblyEffort(data);
  if (data.endTime <= data.startTime) throw new Error("INVALID_TIME_RANGE");
}

/**
 * Registra la corrida y suma sus unidades buenas a producto terminado en la misma
 * transacción: si el movimiento de bodega falla, la corrida no queda registrada.
 */
export async function createAssemblyRun(data: AssemblyRunWriteData, userId: string) {
  const db = requirePrisma();
  const values = {
    assembled: data.assembled,
    defective: data.defective ?? 0,
    nonConforming: data.nonConforming ?? 0,
    reworked: data.reworked ?? 0,
    workerCount: data.workerCount,
    laborHours: data.laborHours,
    startTime: data.startTime,
    endTime: data.endTime,
  };
  assertRun(values);

  const warehouse = await getWarehouseByKey(WAREHOUSE_KEYS.PRODUCTO_TERMINADO);
  const goodUnits = calcGoodUnits(values);

  return db.$transaction(async (tx) => {
    const run = await tx.assemblyRun.create({
      data: {
        stationId: data.stationId,
        leaderId: data.leaderId,
        productId: data.productId,
        productionOrderId: data.productionOrderId ?? null,
        orderNumber: data.orderNumber.trim(),
        productionDate: data.productionDate,
        ...values,
        defectReason: data.defectReason?.trim() || null,
        observations: data.observations?.trim() || null,
      },
      include: runInclude,
    });

    if (goodUnits > 0) {
      await adjustWarehouseStockTx(tx, {
        productId: data.productId,
        warehouseId: warehouse.id,
        type: "ENTRADA",
        quantity: goodUnits,
        userId,
        source: "SYSTEM",
        note: `Ensamble ${run.orderNumber}`,
      });
    }

    return withSummary(run);
  });
}

/**
 * Edita la corrida y ajusta producto terminado por la diferencia de unidades buenas,
 * siempre como movimiento auditado (nunca reescribiendo el stock a mano).
 */
export async function updateAssemblyRun(id: string, data: Partial<AssemblyRunWriteData>, userId: string) {
  const db = requirePrisma();
  const existing = await db.assemblyRun.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");
  if (data.productId !== undefined && data.productId !== existing.productId) {
    throw new Error("PRODUCT_CHANGE_NOT_ALLOWED");
  }

  const values = {
    assembled: data.assembled ?? existing.assembled,
    defective: data.defective ?? existing.defective,
    nonConforming: data.nonConforming ?? existing.nonConforming,
    reworked: data.reworked ?? existing.reworked,
    workerCount: data.workerCount ?? existing.workerCount,
    laborHours: data.laborHours ?? existing.laborHours,
    startTime: data.startTime ?? existing.startTime,
    endTime: data.endTime ?? existing.endTime,
  };
  assertRun(values);

  const warehouse = await getWarehouseByKey(WAREHOUSE_KEYS.PRODUCTO_TERMINADO);
  const delta = calcGoodUnits(values) - calcGoodUnits(existing);

  return db.$transaction(async (tx) => {
    const run = await tx.assemblyRun.update({
      where: { id },
      data: {
        ...(data.stationId !== undefined ? { stationId: data.stationId } : {}),
        ...(data.leaderId !== undefined ? { leaderId: data.leaderId } : {}),
        ...(data.productionOrderId !== undefined ? { productionOrderId: data.productionOrderId } : {}),
        ...(data.orderNumber !== undefined ? { orderNumber: data.orderNumber.trim() } : {}),
        ...(data.productionDate !== undefined ? { productionDate: data.productionDate } : {}),
        ...(data.defectReason !== undefined ? { defectReason: data.defectReason?.trim() || null } : {}),
        ...(data.observations !== undefined ? { observations: data.observations?.trim() || null } : {}),
        ...values,
      },
      include: runInclude,
    });

    if (delta !== 0) {
      await adjustWarehouseStockTx(tx, {
        productId: existing.productId,
        warehouseId: warehouse.id,
        type: delta > 0 ? "ENTRADA" : "SALIDA",
        quantity: Math.abs(delta),
        userId,
        source: "SYSTEM",
        note: `Ajuste de ensamble ${run.orderNumber}`,
      });
    }

    return withSummary(run);
  });
}

/** Al borrar la corrida se devuelve el stock que había sumado. */
export async function deleteAssemblyRun(id: string, userId: string) {
  const db = requirePrisma();
  const existing = await db.assemblyRun.findUnique({ where: { id } });
  if (!existing) throw new Error("NOT_FOUND");

  const warehouse = await getWarehouseByKey(WAREHOUSE_KEYS.PRODUCTO_TERMINADO);
  const goodUnits = calcGoodUnits(existing);

  await db.$transaction(async (tx) => {
    await tx.assemblyRun.delete({ where: { id } });
    if (goodUnits > 0) {
      await adjustWarehouseStockTx(tx, {
        productId: existing.productId,
        warehouseId: warehouse.id,
        type: "SALIDA",
        quantity: goodUnits,
        userId,
        source: "SYSTEM",
        note: `Reversión de ensamble ${existing.orderNumber}`,
      });
    }
  });
}

// ─── KPIs ────────────────────────────────────────────────────────

export async function getAssemblyKpis(from: Date, to: Date) {
  if (!prisma) return { runs: 0, assembled: 0, goodUnits: 0, defective: 0, qualityPercentage: 0, unitsPerLaborHour: 0 };
  const runs = await prisma.assemblyRun.findMany({
    where: { productionDate: { gte: from, lte: to } },
    select: { assembled: true, defective: true, nonConforming: true, workerCount: true, laborHours: true },
  });

  const assembled = runs.reduce((total, run) => total + run.assembled, 0);
  const defective = runs.reduce((total, run) => total + run.defective + run.nonConforming, 0);
  const goodUnits = runs.reduce((total, run) => total + calcGoodUnits(run), 0);
  const laborHours = runs.reduce((total, run) => total + run.workerCount * run.laborHours, 0);

  return {
    runs: runs.length,
    assembled,
    goodUnits,
    defective,
    qualityPercentage: assembled > 0 ? (goodUnits / assembled) * 100 : 0,
    unitsPerLaborHour: laborHours > 0 ? goodUnits / laborHours : 0,
  };
}
