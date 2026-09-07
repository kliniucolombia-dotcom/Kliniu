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
}) {
  return requirePrisma().equipment.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      type: data.type,
      location: data.location?.trim() || null,
      machineId: data.machineId || null,
      moldId: data.moldId || null,
    },
  });
}

export async function updateEquipment(
  id: string,
  data: { name?: string; location?: string | null; status?: EquipmentStatus },
) {
  return requirePrisma().equipment.update({ where: { id }, data });
}

export async function getEquipmentHistory(id: string) {
  return requirePrisma().maintenanceOrder.findMany({
    where: { equipmentId: id },
    orderBy: { reportedAt: "desc" },
    include: { reportedBy: { select: { fullName: true } }, assignedTo: { select: { fullName: true } } },
  });
}

export async function listOrders(from: string, to: string) {
  const range = { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) };
  return requirePrisma().maintenanceOrder.findMany({
    where: { OR: [{ status: { in: OPEN_STATUSES } }, { reportedAt: range }] },
    orderBy: [{ status: "asc" }, { priority: "desc" }, { reportedAt: "desc" }],
    include: {
      equipment: { select: { id: true, name: true, code: true, type: true, status: true } },
      reportedBy: { select: { fullName: true } },
      assignedTo: { select: { fullName: true } },
      quotes: { select: { id: true, status: true, amount: true } },
    },
  });
}

async function nextOrderNumber() {
  const last = await requirePrisma().maintenanceOrder.findFirst({
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });
  const n = last ? parseInt(last.number.replace(/\D/g, ""), 10) + 1 : 1;
  return `MT-${String(n).padStart(4, "0")}`;
}

export async function createOrder(input: {
  equipmentId: string;
  type: MaintenanceType;
  priority: MaintenancePriority;
  description: string;
  assignedToId?: string;
  reportedById: string;
}) {
  const db = requirePrisma();
  const number = await nextOrderNumber();
  return db.maintenanceOrder.create({
    data: {
      number,
      equipmentId: input.equipmentId,
      type: input.type,
      priority: input.priority,
      description: input.description.trim(),
      assignedToId: input.assignedToId || null,
      reportedById: input.reportedById,
    },
  });
}

export async function startOrder(id: string) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    const order = await tx.maintenanceOrder.update({
      where: { id },
      data: { status: "IN_PROGRESS", startedAt: new Date() },
    });
    await tx.equipment.update({ where: { id: order.equipmentId }, data: { status: "MAINTENANCE" } });
    return order;
  });
}

export async function completeOrder(id: string, data: { resolution: string; downtimeMinutes?: number }) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    const current = await tx.maintenanceOrder.findUniqueOrThrow({ where: { id } });
    const completedAt = new Date();
    const autoDowntime = current.startedAt ? Math.round((completedAt.getTime() - current.startedAt.getTime()) / 60000) : null;
    const order = await tx.maintenanceOrder.update({
      where: { id },
      data: {
        status: "DONE",
        completedAt,
        resolution: data.resolution.trim(),
        downtimeMinutes: data.downtimeMinutes ?? autoDowntime,
      },
    });
    const stillOpen = await tx.maintenanceOrder.count({
      where: { equipmentId: order.equipmentId, status: { in: OPEN_STATUSES } },
    });
    if (stillOpen === 0) {
      await tx.equipment.update({ where: { id: order.equipmentId }, data: { status: "OPERATIVE" } });
    }
    return order;
  });
}

export async function cancelOrder(id: string) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    const order = await tx.maintenanceOrder.update({ where: { id }, data: { status: "CANCELLED" } });
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

export async function updateOrder(id: string, data: { priority?: MaintenancePriority; assignedToId?: string | null; description?: string }) {
  return requirePrisma().maintenanceOrder.update({ where: { id }, data });
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

export async function createQuote(data: { supplier: string; description: string; amount: number; maintenanceOrderId?: string }) {
  return requirePrisma().maintenanceQuote.create({
    data: {
      supplier: data.supplier.trim(),
      description: data.description.trim(),
      amount: Math.round(data.amount),
      maintenanceOrderId: data.maintenanceOrderId || null,
    },
  });
}

export async function updateQuote(id: string, data: { status?: MaintenanceQuoteStatus; amount?: number }) {
  return requirePrisma().maintenanceQuote.update({
    where: { id },
    data: { status: data.status, amount: data.amount !== undefined ? Math.round(data.amount) : undefined },
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
