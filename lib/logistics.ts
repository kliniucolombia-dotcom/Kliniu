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

export function endOfBogotaDay(value: string): Date {
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

export async function updateVehicle(
  id: string,
  data: {
    plate?: string;
    type?: VehicleType;
    active?: boolean;
    soatDue?: string | null;
    technicalReviewDue?: string | null;
    policyDue?: string | null;
    operationCardDue?: string | null;
    extinguisherDue?: string | null;
  },
) {
  const { soatDue, technicalReviewDue, policyDue, operationCardDue, extinguisherDue, ...rest } = data;
  return requirePrisma().vehicle.update({
    where: { id },
    data: {
      ...rest,
      plate: data.plate ? data.plate.trim().toUpperCase() : undefined,
      soatDue: soatDue === undefined ? undefined : soatDue ? parseBogotaDate(soatDue) : null,
      technicalReviewDue: technicalReviewDue === undefined ? undefined : technicalReviewDue ? parseBogotaDate(technicalReviewDue) : null,
      policyDue: policyDue === undefined ? undefined : policyDue ? parseBogotaDate(policyDue) : null,
      operationCardDue: operationCardDue === undefined ? undefined : operationCardDue ? parseBogotaDate(operationCardDue) : null,
      extinguisherDue: extinguisherDue === undefined ? undefined : extinguisherDue ? parseBogotaDate(extinguisherDue) : null,
    },
  });
}

// Ítems fijos del formato KL-SG-F21 "Revisión Diaria Pre-Operacional".
export type ChecklistItem = { key: string; category: string; label: string };
export const CHECKLIST_TEMPLATE_MOTO: ChecklistItem[] = [
  { key: "frenos_funcionamiento", category: "Frenos y llantas", label: "Funcionamiento adecuado de frenos" },
  { key: "llantas_presion", category: "Frenos y llantas", label: "Presión, estado general de llantas" },
  { key: "luces", category: "Frenos y llantas", label: "Luces delanteras/traseras" },
  { key: "direccion_manillar", category: "Dirección y espejos", label: "Dirección/manillar y espejos" },
  { key: "niveles_fluidos", category: "Dirección y espejos", label: "Niveles de fluidos" },
  { key: "cadena_transmision", category: "Dirección y espejos", label: "Cadena/transmisión" },
  { key: "suspension", category: "Suspensión", label: "Suspensión delantera y trasera" },
  { key: "casco", category: "Protección conductor", label: "Casco de seguridad" },
  { key: "elementos_prevencion", category: "Protección conductor", label: "Elementos de prevención" },
  { key: "carga_asegurada", category: "Carga", label: "Carga asegurada" },
];
export const CHECKLIST_TEMPLATE_VEHICULO: ChecklistItem[] = [
  { key: "frenos_liquido", category: "Frenos", label: "Nivel y líquido de frenos" },
  { key: "frenos_pastillas", category: "Frenos", label: "Grosor de pastillas / bandas" },
  { key: "llantas_presion", category: "Llantas y ruedas", label: "Presión de aire" },
  { key: "llantas_labrado", category: "Llantas y ruedas", label: "Profundidad de labrado" },
  { key: "llantas_rines", category: "Llantas y ruedas", label: "Estado de rines" },
  { key: "aceite", category: "Fluidos y motor", label: "Nivel y estado de aceite" },
  { key: "fugas_carter", category: "Fluidos y motor", label: "Fugas en cárter o empaques" },
  { key: "refrigerante", category: "Fluidos y motor", label: "Nivel de refrigerante" },
  { key: "luces_altas_bajas", category: "Sistema eléctrico", label: "Luces altas/bajas y direccionales" },
  { key: "luz_freno", category: "Sistema eléctrico", label: "Luz de freno" },
  { key: "pito", category: "Sistema eléctrico", label: "Pito / bocina" },
  { key: "bateria", category: "Sistema eléctrico", label: "Batería (bornes y sulfatación)" },
  { key: "fugas_barras", category: "Suspensión y dirección", label: "Fugas de aceite en barras" },
  { key: "copa_direccion", category: "Suspensión y dirección", label: "Juego en la copa de dirección" },
  { key: "amortiguacion", category: "Suspensión y dirección", label: "Amortiguación trasera" },
  { key: "acelerador", category: "Comandos y cables", label: "Juego libre del acelerador" },
  { key: "embrague", category: "Comandos y cables", label: "Recorrido del embrague" },
  { key: "guayas", category: "Comandos y cables", label: "Estado general de guayas" },
  { key: "botiquin", category: "Equipo de carretera", label: "Botiquín y linterna" },
  { key: "herramientas", category: "Equipo de carretera", label: "Herramientas" },
  { key: "kit_carretera", category: "Equipo de carretera", label: "Kit de carretera / señales" },
  { key: "extintor", category: "Equipo de carretera", label: "Extintor" },
  { key: "espejos", category: "Espejos y otros", label: "Espejos laterales y retrovisor" },
  { key: "filtros", category: "Espejos y otros", label: "Filtros (aire / combustible)" },
];
export function checklistTemplateFor(type: VehicleType): ChecklistItem[] {
  return type === "MOTO" ? CHECKLIST_TEMPLATE_MOTO : CHECKLIST_TEMPLATE_VEHICULO;
}

export async function listChecklistEntries(vehicleId: string, month: string) {
  const start = parseBogotaDate(`${month}-01`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return requirePrisma().vehicleChecklistEntry.findMany({
    where: { vehicleId, date: { gte: start, lt: end } },
    orderBy: { date: "asc" },
    include: { driver: true },
  });
}

export async function upsertChecklistEntry(input: {
  vehicleId: string;
  driverId: string;
  date: string;
  items: Record<string, "B" | "M" | "NA">;
  initials?: string;
  notes?: string;
  userId: string;
}) {
  const day = parseBogotaDate(input.date);
  return requirePrisma().vehicleChecklistEntry.upsert({
    where: { vehicleId_date: { vehicleId: input.vehicleId, date: day } },
    create: {
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      date: day,
      items: input.items,
      initials: input.initials || null,
      notes: input.notes || null,
      createdById: input.userId,
    },
    update: {
      driverId: input.driverId,
      items: input.items,
      initials: input.initials || null,
      notes: input.notes || null,
      createdById: input.userId,
    },
  });
}

export async function deleteVehicle(id: string) {
  return requirePrisma().vehicle.delete({ where: { id } });
}

export async function deleteDriver(id: string) {
  return requirePrisma().driver.delete({ where: { id } });
}

export async function listCustomers() {
  const db = requirePrisma();
  const [manual, orderCustomers] = await Promise.all([
    db.logisticsCustomer.findMany({ orderBy: { name: "asc" } }),
    db.order.findMany({
      distinct: ["customerName", "addressLine1"],
      select: { id: true, customerName: true, customerPhone: true, addressLine1: true, city: true },
    }),
  ]);

  const fromOrders = orderCustomers.map((o) => ({
    id: `order:${o.id}`,
    name: o.customerName,
    phone: o.customerPhone as string | null,
    address: o.addressLine1,
    city: o.city,
    source: "orders" as const,
  }));
  const fromManual = manual.map((c) => ({ ...c, source: "manual" as const }));

  return [...fromManual, ...fromOrders].sort((a, b) => a.name.localeCompare(b.name));
}

export async function createCustomer(data: { name: string; phone?: string; address: string; city: string }) {
  return requirePrisma().logisticsCustomer.create({ data });
}

export async function deleteCustomer(id: string) {
  if (id.startsWith("order:")) throw new Error("Cliente derivado de pedidos, no se puede eliminar aquí.");
  return requirePrisma().logisticsCustomer.delete({ where: { id } });
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
