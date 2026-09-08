import { prisma } from "@/lib/prisma";
import type {
  DeliveryRouteStatus,
  TransportCostCategory,
  TransportIncidentStatus,
  VehicleType,
} from "@/generated/prisma/client";
import { parseBogotaCivilDate } from "@/lib/operations-validation";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

// Fechas "YYYY-MM-DD" se interpretan en hora Bogotá para evitar el corrimiento de un día por TZ.
export function parseBogotaDate(value: string): Date {
  return parseBogotaCivilDate(value);
}

function endOfBogotaDay(value: string): Date {
  return new Date(`${value}T23:59:59.999-05:00`);
}

const ASSIGNABLE_SHIPPING = ["PENDING", "PREPARING", "SHIPPED"] as const;

const orderSelect = {
  id: true,
  customerName: true,
  customerPhone: true,
  city: true,
  department: true,
  addressLine1: true,
  shippingStatus: true,
  totalItems: true,
  subtotal: true,
  createdAt: true,
} as const;

export async function listDrivers() {
  return requirePrisma().driver.findMany({ orderBy: [{ active: "desc" }, { fullName: "asc" }] });
}

export async function createDriver(data: { fullName: string; phone?: string }) {
  return requirePrisma().driver.create({ data });
}

export async function updateDriver(id: string, data: { fullName?: string; phone?: string | null; active?: boolean }) {
  return requirePrisma().driver.update({ where: { id }, data });
}

export async function listVehicles() {
  return requirePrisma().vehicle.findMany({ orderBy: [{ active: "desc" }, { plate: "asc" }] });
}

export async function createVehicle(data: { plate: string; type: VehicleType }) {
  return requirePrisma().vehicle.create({ data: { ...data, plate: data.plate.trim().toUpperCase() } });
}

export async function updateVehicle(id: string, data: { plate?: string; type?: VehicleType; active?: boolean }) {
  return requirePrisma().vehicle.update({
    where: { id },
    data: { ...data, plate: data.plate ? data.plate.trim().toUpperCase() : undefined },
  });
}

export async function listRoutes(from: string, to: string) {
  return requirePrisma().deliveryRoute.findMany({
    where: { date: { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      vehicle: true,
      driver: true,
      createdBy: { select: { fullName: true } },
      orders: { select: orderSelect, orderBy: { createdAt: "asc" } },
    },
  });
}

export async function listAssignableOrders() {
  return requirePrisma().order.findMany({
    where: { deliveryRouteId: null, shippingStatus: { in: [...ASSIGNABLE_SHIPPING] }, status: { not: "CANCELLED" } },
    select: orderSelect,
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

export async function createRoute(input: {
  date: string;
  vehicleId: string;
  driverId: string;
  notes?: string;
  orderIds: string[];
  userId: string;
}) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    const route = await tx.deliveryRoute.create({
      data: {
        date: parseBogotaDate(input.date),
        vehicleId: input.vehicleId,
        driverId: input.driverId,
        notes: input.notes || null,
        createdById: input.userId,
      },
    });
    if (input.orderIds.length > 0) {
      await tx.order.updateMany({
        where: { id: { in: input.orderIds }, deliveryRouteId: null },
        data: { deliveryRouteId: route.id },
      });
    }
    return route;
  });
}

export async function updateRoute(
  id: string,
  data: { status?: DeliveryRouteStatus; notes?: string | null; vehicleId?: string; driverId?: string; date?: string },
) {
  return requirePrisma().deliveryRoute.update({
    where: { id },
    data: { ...data, date: data.date ? parseBogotaDate(data.date) : undefined },
  });
}

export async function addOrdersToRoute(routeId: string, orderIds: string[]) {
  return requirePrisma().order.updateMany({
    where: { id: { in: orderIds }, deliveryRouteId: null },
    data: { deliveryRouteId: routeId },
  });
}

export async function removeOrderFromRoute(routeId: string, orderId: string) {
  return requirePrisma().order.updateMany({
    where: { id: orderId, deliveryRouteId: routeId },
    data: { deliveryRouteId: null },
  });
}

export async function deleteRoute(id: string) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    await tx.order.updateMany({ where: { deliveryRouteId: id }, data: { deliveryRouteId: null } });
    return tx.deliveryRoute.delete({ where: { id } });
  });
}

export async function listCosts(from: string, to: string) {
  return requirePrisma().transportCost.findMany({
    where: { date: { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) } },
    orderBy: { date: "desc" },
    include: { vehicle: true, createdBy: { select: { fullName: true } } },
  });
}

export async function createCost(input: {
  vehicleId: string;
  date: string;
  category: TransportCostCategory;
  amount: number;
  notes?: string;
  userId: string;
}) {
  return requirePrisma().transportCost.create({
    data: {
      vehicleId: input.vehicleId,
      date: parseBogotaDate(input.date),
      category: input.category,
      amount: Math.round(input.amount),
      notes: input.notes || null,
      createdById: input.userId,
    },
  });
}

export async function deleteCost(id: string) {
  return requirePrisma().transportCost.delete({ where: { id } });
}

export async function listIncidents(from: string, to: string) {
  return requirePrisma().transportIncident.findMany({
    where: { date: { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) } },
    orderBy: [{ status: "asc" }, { date: "desc" }],
    include: { vehicle: true, driver: true, createdBy: { select: { fullName: true } } },
  });
}

export async function createIncident(input: {
  vehicleId?: string;
  driverId?: string;
  date: string;
  type: string;
  description: string;
  correctiveAction?: string;
  userId: string;
}) {
  return requirePrisma().transportIncident.create({
    data: {
      vehicleId: input.vehicleId || null,
      driverId: input.driverId || null,
      date: parseBogotaDate(input.date),
      type: input.type.trim(),
      description: input.description.trim(),
      correctiveAction: input.correctiveAction?.trim() || null,
      createdById: input.userId,
    },
  });
}

export async function updateIncident(
  id: string,
  data: { status?: TransportIncidentStatus; correctiveAction?: string | null },
) {
  return requirePrisma().transportIncident.update({ where: { id }, data });
}

export async function getLogisticsKpis(from: string, to: string) {
  const db = requirePrisma();
  const range = { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) };
  const [routes, orderStats, costByVehicle, openIncidents] = await Promise.all([
    db.deliveryRoute.groupBy({ by: ["status"], where: { date: range }, _count: { _all: true } }),
    db.order.groupBy({
      by: ["shippingStatus"],
      where: { deliveryRoute: { date: range } },
      _count: { _all: true },
    }),
    db.transportCost.groupBy({ by: ["vehicleId"], where: { date: range }, _sum: { amount: true } }),
    db.transportIncident.count({ where: { status: "OPEN" } }),
  ]);

  const routesTotal = routes.reduce((acc, r) => acc + r._count._all, 0);
  const routesDone = routes.find((r) => r.status === "DONE")?._count._all ?? 0;
  const ordersTotal = orderStats.reduce((acc, o) => acc + o._count._all, 0);
  const ordersDelivered = orderStats.find((o) => o.shippingStatus === "DELIVERED")?._count._all ?? 0;
  const costTotal = costByVehicle.reduce((acc, c) => acc + (c._sum.amount ?? 0), 0);

  return {
    routesTotal,
    routesDone,
    ordersTotal,
    ordersDelivered,
    costTotal,
    costByVehicle: costByVehicle.map((c) => ({ vehicleId: c.vehicleId, amount: c._sum.amount ?? 0 })),
    openIncidents,
  };
}
