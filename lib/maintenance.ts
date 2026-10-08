import { prisma } from "@/lib/prisma";
import type {
  EquipmentStatus,
  EquipmentType,
  InventoryItemCategory,
  MaintenancePriority,
  MaintenanceQuoteStatus,
  MaintenanceStatus,
  MaintenanceType,
} from "@/generated/prisma/client";
import { parseBogotaDate } from "@/lib/logistics";
import { nextMaintenanceNumber } from "@/lib/maintenance-policy";
import type { MaintenanceAttachment } from "@/lib/maintenance-upload";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

function endOfBogotaDay(value: string): Date {
  return new Date(`${value}T23:59:59.999-05:00`);
}

const OPEN_STATUSES: MaintenanceStatus[] = ["PENDING", "IN_PROGRESS"];

export async function listEquipment() {
  return requirePrisma().equipment.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      machine: { select: { id: true, code: true, name: true } },
      mold: { select: { id: true, code: true, name: true } },
      _count: { select: { orders: true } },
    },
  });
}

export async function listMachinesForEquipment() {
  return requirePrisma().machine.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, brand: true },
  });
}

export async function createEquipment(data: {
  name: string;
  code: string;
  type: EquipmentType;
  location?: string;
  machineId?: string;
  moldId?: string;
  imageUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}) {
  return requirePrisma().equipment.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      type: data.type,
      location: data.location?.trim() || null,
      machineId: data.machineId || null,
      moldId: data.moldId || null,
      imageUrl: data.imageUrl?.trim() || null,
      attachmentUrl: data.attachmentUrl?.trim() || null,
      attachmentName: data.attachmentName?.trim() || null,
    },
  });
}

export async function updateEquipment(
  id: string,
  data: {
    name?: string;
    location?: string | null;
    status?: EquipmentStatus;
    imageUrl?: string | null;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
  },
) {
  return requirePrisma().equipment.update({ where: { id }, data });
}

export async function getEquipmentHistory(id: string) {
  return requirePrisma().maintenanceOrder.findMany({
    where: { equipmentId: id },
    orderBy: { reportedAt: "desc" },
    take: 200,
    include: { reportedBy: { select: { fullName: true } }, assignedTo: { select: { fullName: true } } },
  });
}

export async function listOrders(from: string, to: string, onlyAssignedTo?: string) {
  const range = { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) };
  return requirePrisma().maintenanceOrder.findMany({
    where: { OR: [{ status: { in: OPEN_STATUSES } }, { reportedAt: range }], ...(onlyAssignedTo ? { assignedToId: onlyAssignedTo } : {}) },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { reportedAt: "desc" }],
    take: 500,
    include: {
      equipment: { select: { id: true, name: true, code: true, type: true, status: true } },
      reportedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } },
      quotes: { select: { id: true, status: true, amount: true } },
    },
  });
}

type MaintenanceTx = Parameters<Parameters<ReturnType<typeof requirePrisma>["$transaction"]>[0]>[0];

async function generateOrderNumber(tx: MaintenanceTx) {
  const last = await tx.maintenanceOrder.findFirst({
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  return nextMaintenanceNumber(last?.number ?? null);
}

export async function createOrder(input: {
  equipmentId: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  description: string;
  assignedToId?: string;
  reportedById: string;
  attachments?: MaintenanceAttachment[];
}) {
  const db = requirePrisma();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(async (tx) => tx.maintenanceOrder.create({ data: { number: await generateOrderNumber(tx), equipmentId: input.equipmentId, type: input.type, priority: input.priority, description: input.description.trim(), assignedToId: input.assignedToId || null, reportedById: input.reportedById, attachments: input.attachments ?? [] }, include: { equipment: { select: { name: true } } } }));
    } catch (error) {
      const duplicate = typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "P2002";
      if (!duplicate || attempt === 2) throw error;
    }
  }
  throw new Error("MAINTENANCE_ORDER_NUMBER_CONFLICT");
}

export async function startOrder(id: string) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    const changed = await tx.maintenanceOrder.updateMany({ where: { id, status: "PENDING" }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
    if (changed.count !== 1) throw new Error("INVALID_TRANSITION");
    const order = await tx.maintenanceOrder.findUniqueOrThrow({ where: { id } });
    await tx.equipment.update({ where: { id: order.equipmentId }, data: { status: "MAINTENANCE" } });
    return order;
  });
}

export async function completeOrder(id: string, data: { resolution: string; downtimeMinutes?: number; signatureData: string; signedByName: string; executorSignatureData: string; executorName: string; attachments?: MaintenanceAttachment[] }) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    const current = await tx.maintenanceOrder.findUnique({ where: { id } });
    if (!current) throw new Error("NOT_FOUND");
    if (current.status !== "IN_PROGRESS") throw new Error("INVALID_TRANSITION");
    const completedAt = new Date();
    const autoDowntime = current.startedAt ? Math.round((completedAt.getTime() - current.startedAt.getTime()) / 60000) : null;
    const changed = await tx.maintenanceOrder.updateMany({
      where: { id, status: "IN_PROGRESS" },
      data: {
        status: "DONE",
        completedAt,
        resolution: data.resolution.trim(),
        signatureData: data.signatureData,
        signedByName: data.signedByName.trim(),
        executorSignatureData: data.executorSignatureData,
        executorName: data.executorName.trim(),
        signedAt: completedAt,
        downtimeMinutes: data.downtimeMinutes ?? autoDowntime,
        attachments: data.attachments,
      },
    });
    if (changed.count !== 1) throw new Error("INVALID_TRANSITION");
    const order = await tx.maintenanceOrder.findUniqueOrThrow({ where: { id } });
    const stillOpen = await tx.maintenanceOrder.count({
      where: { equipmentId: order.equipmentId, status: { in: OPEN_STATUSES } },
    });
    if (stillOpen === 0) {
      const eq = await tx.equipment.update({ where: { id: order.equipmentId }, data: { status: "OPERATIVE" } });
      // Un molde reparado vuelve a quedar disponible en Producción.
      if (eq.moldId) await tx.mold.updateMany({ where: { id: eq.moldId, status: "MAINTENANCE" }, data: { status: "AVAILABLE" } });
    }
    return order;
  });
}

export async function cancelOrder(id: string) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    const changed = await tx.maintenanceOrder.updateMany({ where: { id, status: { in: ["PENDING", "IN_PROGRESS"] } }, data: { status: "CANCELLED" } });
    if (changed.count !== 1) throw new Error("INVALID_TRANSITION");
    const order = await tx.maintenanceOrder.findUniqueOrThrow({ where: { id } });
    const stillOpen = await tx.maintenanceOrder.count({
      where: { equipmentId: order.equipmentId, status: { in: OPEN_STATUSES } },
    });
    if (stillOpen === 0) {
      await tx.equipment.updateMany({
        where: { id: order.equipmentId, status: "MAINTENANCE" },
        data: { status: "OPERATIVE" },
      });
    }
    return order;
  });
}

export async function updateOrder(id: string, data: { priority?: MaintenancePriority; assignedToId?: string | null; description?: string; attachments?: MaintenanceAttachment[] }) {
  const updated = await requirePrisma().maintenanceOrder.update({ where: { id }, data });
  const equipment = await requirePrisma().equipment.findUnique({ where: { id: updated.equipmentId }, select: { name: true } });
  return { ...updated, equipment };
}

export async function listInventory() {
  return requirePrisma().inventoryItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
}

export async function createInventoryItem(data: {
  name: string;
  code: string;
  category: InventoryItemCategory;
  stock: number;
  minStock: number;
  unit?: string;
  location?: string;
  imageUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
}) {
  return requirePrisma().inventoryItem.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      category: data.category,
      stock: Math.max(0, Math.round(data.stock)),
      minStock: Math.max(0, Math.round(data.minStock)),
      unit: data.unit?.trim() || "und",
      location: data.location?.trim() || null,
      imageUrl: data.imageUrl?.trim() || null,
      attachmentUrl: data.attachmentUrl?.trim() || null,
      attachmentName: data.attachmentName?.trim() || null,
    },
  });
}

export async function updateInventoryItem(
  id: string,
  data: { name?: string; minStock?: number; location?: string | null; imageUrl?: string | null; attachmentUrl?: string | null; attachmentName?: string | null },
) {
  return requirePrisma().inventoryItem.update({
    where: { id },
    data: {
      name: data.name?.trim() || undefined,
      minStock: data.minStock !== undefined ? Math.max(0, Math.round(data.minStock)) : undefined,
      location: data.location,
      imageUrl: data.imageUrl,
      attachmentUrl: data.attachmentUrl,
      attachmentName: data.attachmentName,
    },
  });
}

export async function adjustInventoryItem(id: string, data: { delta?: number; minStock?: number; location?: string | null }) {
  const db = requirePrisma();
  if (data.delta !== undefined) {
    const item = await db.inventoryItem.findUniqueOrThrow({ where: { id }, select: { stock: true } });
    if (item.stock + data.delta < 0) throw new Error("INSUFFICIENT_STOCK");
  }
  return db.inventoryItem.update({
    where: { id },
    data: {
      stock: data.delta !== undefined ? { increment: Math.round(data.delta) } : undefined,
      minStock: data.minStock !== undefined ? Math.max(0, Math.round(data.minStock)) : undefined,
      location: data.location,
    },
  });
}

export async function listQuotes() {
  return requirePrisma().maintenanceQuote.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { maintenanceOrder: { select: { id: true, number: true, equipment: { select: { name: true } } } } },
  });
}

export async function createQuote(data: { supplier: string; description: string; amount: number; maintenanceOrderId?: string; attachments?: MaintenanceAttachment[] }) {
  return requirePrisma().maintenanceQuote.create({
    data: {
      supplier: data.supplier.trim(),
      description: data.description.trim(),
      amount: Math.round(data.amount),
      maintenanceOrderId: data.maintenanceOrderId || null,
      attachments: data.attachments ?? [],
    },
  });
}

export async function updateQuote(id: string, data: { status?: MaintenanceQuoteStatus; amount?: number; attachments?: MaintenanceAttachment[] }) {
  return requirePrisma().maintenanceQuote.update({
    where: { id },
    data: {
      status: data.status,
      amount: data.amount !== undefined ? Math.round(data.amount) : undefined,
      attachments: data.attachments,
    },
  });
}

export async function getMaintenanceKpis(from: string, to: string) {
  const db = requirePrisma();
  const range = { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) };
  const [openOrders, byType, doneAgg, downEquipment, inventory] = await Promise.all([
    db.maintenanceOrder.count({ where: { status: { in: OPEN_STATUSES } } }),
    db.maintenanceOrder.groupBy({ by: ["type"], where: { reportedAt: range }, _count: { _all: true } }),
    db.maintenanceOrder.aggregate({
      where: { status: "DONE", completedAt: range },
      _count: { _all: true },
      _sum: { downtimeMinutes: true },
    }),
    db.equipment.count({ where: { status: { in: ["DOWN", "MAINTENANCE"] } } }),
    db.inventoryItem.findMany({ select: { stock: true, minStock: true } }),
  ]);

  return {
    openOrders,
    preventive: byType.find((t) => t.type === "PREVENTIVE")?._count._all ?? 0,
    corrective: byType.find((t) => t.type === "CORRECTIVE")?._count._all ?? 0,
    completed: doneAgg._count._all,
    downtimeMinutes: doneAgg._sum.downtimeMinutes ?? 0,
    equipmentDown: downEquipment,
    lowStockItems: inventory.filter((i) => i.stock <= i.minStock).length,
  };
}

// Molde enviado a mantenimiento desde Producción: asegura su equipo y abre una orden correctiva (una sola mientras haya una abierta).
export async function ensureMoldEquipment(moldId: string) {
  const db = requirePrisma();
  const mold = await db.mold.findUniqueOrThrow({ where: { id: moldId } });
  const equipment =
    (await db.equipment.findFirst({ where: { moldId } })) ??
    (await db.equipment.create({ data: { name: `Molde ${mold.name}`, code: `MOL-${mold.code}`.toUpperCase(), type: "MOLD", moldId } }));
  return { mold, equipment };
}

export async function openMoldRepairOrder(moldId: string, reportedById: string) {
  const db = requirePrisma();
  const { mold, equipment } = await ensureMoldEquipment(moldId);
  const open = await db.maintenanceOrder.count({ where: { equipmentId: equipment.id, status: { in: OPEN_STATUSES } } });
  if (open > 0) return null;
  return createOrder({
    equipmentId: equipment.id,
    type: "CORRECTIVE",
    priority: "MEDIUM",
    description: `Reparación de molde ${mold.code} - ${mold.name} (enviado desde Moldes)`,
    reportedById,
  });
}
