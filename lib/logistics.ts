import { prisma } from "@/lib/prisma";
import type {
  DeliveryRouteStatus,
  TransportCostCategory,
  TransportIncidentStatus,
  VehicleType,
} from "@/generated/prisma/client";
import { parseBogotaCivilDate } from "@/lib/operations-validation";
import { randomBytes } from "node:crypto";
import { geocodeAddress } from "@/lib/geocode";
import { haversineKm, routeAlerts, summarizeRoute, type RouteAlert } from "@/lib/tracking";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

// Fechas "YYYY-MM-DD" se interpretan en hora Bogotá para evitar el corrimiento de un día por TZ.
export function parseBogotaDate(value: string): Date {
  return parseBogotaCivilDate(value);
}

// Hoy en Bogotá como "YYYY-MM-DD".
export const bogotaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

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
  stopOrder: true,
  lat: true,
  lng: true,
  enRouteNotifiedAt: true,
  nearNotifiedAt: true,
  deliveryAttempts: {
    orderBy: { recordedAt: "desc" },
    take: 1,
    select: { id: true, outcome: true, reason: true, note: true, photoPath: true, accuracy: true, distanceM: true, recordedAt: true },
  },
} as const;

// Motivos de entrega fallida (código -> etiqueta). El conductor solo manda el código.
export const FAIL_REASONS = {
  CLIENTE_AUSENTE: "Cliente ausente",
  DIRECCION_INCORRECTA: "Dirección incorrecta",
  RECHAZADO: "Pedido rechazado",
  SIN_ACCESO: "Sin acceso",
  OTRO: "Otro",
} as const;
export type FailReason = keyof typeof FAIL_REASONS;

export const STOP_ORDER_BY = [{ stopOrder: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }] as const;

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
      orderBy: { createdAt: "desc" },
      take: 1000,
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
  const db = requirePrisma();
  const routes = await db.deliveryRoute.findMany({
    where: { date: { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      vehicle: true,
      driver: true,
      createdBy: { select: { fullName: true } },
      orders: { select: orderSelect, orderBy: [...STOP_ORDER_BY] },
    },
  });
  // Alertas solo para rutas en curso: últimas posiciones (≈15 min) + paradas pendientes.
  const now = new Date();
  return Promise.all(
    routes.map(async (r) => {
      if (r.status !== "IN_PROGRESS") return { ...r, alerts: [] as RouteAlert[], lastPositionAt: null as Date | null };
      const recent = (
        await db.vehiclePosition.findMany({ where: { routeId: r.id }, orderBy: { recordedAt: "desc" }, take: 60, select: { lat: true, lng: true, recordedAt: true } })
      ).reverse();
      const pending = r.orders.filter((o) => o.shippingStatus !== "DELIVERED" && o.shippingStatus !== "CANCELLED" && o.deliveryAttempts.length === 0);
      return { ...r, alerts: routeAlerts(recent, pending, r.startedAt, now), lastPositionAt: recent.length ? recent[recent.length - 1].recordedAt : null };
    }),
  );
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
      include: {
        driver: { select: { fullName: true } },
        vehicle: { select: { plate: true } },
      },
    });
    if (input.orderIds.length > 0) {
      await assignWithStopOrder(tx, route.id, input.orderIds, 0);
    }
    return route;
  });
}

const POSITION_RETENTION_DAYS = 90;

export async function updateRoute(
  id: string,
  data: { status?: DeliveryRouteStatus; notes?: string | null; vehicleId?: string; driverId?: string; date?: string },
) {
  const db = requirePrisma();
  const now = new Date();
  const finishing = data.status === "DONE";

  // Al finalizar se guarda el resumen (km, duración) una sola vez: el reporte no recalcula miles de posiciones.
  let summary: ReturnType<typeof summarizeRoute> | undefined;
  if (finishing) {
    const [positions, current] = await Promise.all([
      db.vehiclePosition.findMany({ where: { routeId: id }, orderBy: { recordedAt: "asc" }, select: { lat: true, lng: true, accuracy: true, recordedAt: true }, take: 5000 }),
      db.deliveryRoute.findUnique({ where: { id }, select: { startedAt: true } }),
    ]);
    summary = summarizeRoute(positions, current?.startedAt ?? null, now);
  }

  const route = await db.deliveryRoute.update({
    where: { id },
    data: {
      ...data,
      date: data.date ? parseBogotaDate(data.date) : undefined,
      // Un viaje = una ruta: inicio al pasar a EN CURSO, fin al FINALIZAR.
      ...(data.status === "IN_PROGRESS" && { startedAt: now, finishedAt: null, distanceKm: null, durationMin: null }),
      ...(finishing && { finishedAt: now, ...summary }),
    },
  });

  // Retención: posiciones crudas de rutas finalizadas hace más de 90 días (el resumen queda).
  // ponytail: limpieza oportunista al finalizar rutas; si no se finalizan rutas no corre (mover a cron cuando exista).
  if (finishing) {
    const cutoff = new Date(now.getTime() - POSITION_RETENTION_DAYS * 86_400_000);
    await db.vehiclePosition.deleteMany({ where: { route: { finishedAt: { lt: cutoff } } } }).catch(() => {});
  }
  return route;
}

type Tx = Parameters<Parameters<ReturnType<typeof requirePrisma>["$transaction"]>[0]>[0];

// Asigna pedidos libres a la ruta numerando las paradas a partir de `start` (en el orden recibido).
async function assignWithStopOrder(tx: Tx, routeId: string, orderIds: string[], start: number) {
  const free = await tx.order.findMany({ where: { id: { in: orderIds }, deliveryRouteId: null }, select: { id: true } });
  const freeIds = new Set(free.map((o) => o.id));
  let n = start;
  for (const id of orderIds) {
    if (!freeIds.has(id)) continue;
    await tx.order.update({ where: { id }, data: { deliveryRouteId: routeId, stopOrder: ++n } });
  }
}

export async function addOrdersToRoute(routeId: string, orderIds: string[]) {
  return requirePrisma().$transaction(async (tx) => {
    const last = await tx.order.aggregate({ where: { deliveryRouteId: routeId }, _max: { stopOrder: true } });
    await assignWithStopOrder(tx, routeId, orderIds, last._max.stopOrder ?? 0);
  });
}

export async function removeOrderFromRoute(routeId: string, orderId: string) {
  return requirePrisma().order.updateMany({
    where: { id: orderId, deliveryRouteId: routeId },
    data: { deliveryRouteId: null, stopOrder: null },
  });
}

// Reordena las paradas: `orderIds` es el orden completo deseado (solo cuentan pedidos de la ruta).
export async function setStopOrder(routeId: string, orderIds: string[]) {
  return requirePrisma().$transaction(async (tx) => {
    const inRoute = new Set((await tx.order.findMany({ where: { deliveryRouteId: routeId }, select: { id: true } })).map((o) => o.id));
    let n = 0;
    for (const id of orderIds) {
      if (!inRoute.has(id)) continue;
      await tx.order.update({ where: { id }, data: { stopOrder: ++n } });
    }
  });
}

type DeliveryInput = {
  routeId: string;
  orderId: string;
  outcome: "DELIVERED" | "FAILED";
  reason?: FailReason;
  note?: string;
  photoPath?: string;
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  idempotencyKey: string;
};

// Registra un intento de entrega. Idempotente por `idempotencyKey` (reintentos no duplican).
// Si es DELIVERED solo toca shippingStatus/deliveredAt: updateOrderShipping borraría carrier, tracking y notas.
export async function recordDelivery(input: DeliveryInput) {
  const db = requirePrisma();
  const prior = await db.deliveryAttempt.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (prior) return { attempt: prior, duplicate: true as const };

  return db.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: input.orderId, deliveryRouteId: input.routeId },
      select: { shippingStatus: true, lat: true, lng: true },
    });
    if (!order) throw new Error("ORDER_NOT_IN_ROUTE");
    if (order.shippingStatus === "DELIVERED") throw new Error("ALREADY_DELIVERED");
    if (order.shippingStatus === "CANCELLED") throw new Error("ORDER_CANCELLED");

    const distanceM =
      input.lat != null && input.lng != null && order.lat != null && order.lng != null
        ? Math.round(haversineKm({ lat: input.lat, lng: input.lng }, { lat: order.lat, lng: order.lng }) * 1000)
        : null;

    const attempt = await tx.deliveryAttempt.create({
      data: {
        orderId: input.orderId,
        routeId: input.routeId,
        outcome: input.outcome,
        reason: input.reason ?? null,
        note: input.note ?? null,
        photoPath: input.photoPath ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        accuracy: input.accuracy ?? null,
        distanceM,
        idempotencyKey: input.idempotencyKey,
      },
    });
    if (input.outcome === "DELIVERED") {
      await tx.order.update({ where: { id: input.orderId }, data: { shippingStatus: "DELIVERED", deliveredAt: new Date() } });
    }
    return { attempt, duplicate: false as const };
  });
}

export async function deleteRoute(id: string) {
  const db = requirePrisma();
  return db.$transaction(async (tx) => {
    await tx.order.updateMany({ where: { deliveryRouteId: id }, data: { deliveryRouteId: null, stopOrder: null } });
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
    include: {
      driver: { select: { fullName: true } },
      vehicle: { select: { plate: true } },
    },
  });
}

// Novedades que el conductor reporta desde su enlace (sin cuenta): tipo de una lista fija.
export const DRIVER_INCIDENT_TYPES = {
  LLANTA: "Llanta ponchada",
  FALLA_MECANICA: "Falla mecánica",
  ACCIDENTE: "Accidente",
  TRAFICO: "Tráfico o vía bloqueada",
  MERCANCIA: "Mercancía dañada",
  OTRO: "Otro",
} as const;
export type DriverIncidentType = keyof typeof DRIVER_INCIDENT_TYPES;

// Sin usuario: queda a nombre de quien creó la ruta (createdById es obligatorio) y marcada fromDriverApp.
export async function createDriverIncident(input: { routeId: string; type: DriverIncidentType; description?: string; photoPath?: string }) {
  const db = requirePrisma();
  const route = await db.deliveryRoute.findUnique({ where: { id: input.routeId }, select: { vehicleId: true, driverId: true, createdById: true } });
  if (!route) throw new Error("ROUTE_NOT_FOUND");
  return db.transportIncident.create({
    data: {
      vehicleId: route.vehicleId,
      driverId: route.driverId,
      date: parseBogotaDate(bogotaToday()),
      type: DRIVER_INCIDENT_TYPES[input.type],
      description: input.description?.trim() || "Sin detalle",
      photoPath: input.photoPath ?? null,
      fromDriverApp: true,
      createdById: route.createdById,
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

// Geocodifica los pedidos de la ruta que aún no tienen coordenadas y las guarda (caché en la fila).
// Tope por llamada para acotar el costo de Google; el resto se geocodifica en la siguiente.
// ponytail: si se edita la dirección del pedido, las coordenadas no se recalculan.
// ponytail: los fallos no se cachean, se reintentan en cada llamada (agregar geocodeFailed si molesta el costo).
export async function geocodePendingOrders(routeId: string, budget: number) {
  const db = requirePrisma();
  const orders = await db.order.findMany({
    where: { deliveryRouteId: routeId },
    select: { id: true, customerName: true, department: true, city: true, addressLine1: true, lat: true, lng: true },
    orderBy: [...STOP_ORDER_BY],
  });
  return Promise.all(
    orders.map(async (o) => {
      let { lat, lng } = o;
      if ((lat == null || lng == null) && budget-- > 0) {
        const g = await geocodeAddress({ address: o.addressLine1, city: o.city, department: o.department });
        if (g) {
          lat = g.lat;
          lng = g.lng;
          await db.order.update({ where: { id: o.id }, data: { lat, lng } });
        }
      }
      return { id: o.id, name: o.customerName, address: `${o.addressLine1}, ${o.city}`, lat, lng };
    }),
  );
}

// Token propio del pedido para el enlace del cliente (el de la ruta expondría las demás paradas).
export async function ensureOrderTrackToken(orderId: string) {
  const db = requirePrisma();
  const order = await db.order.findUnique({ where: { id: orderId }, select: { trackToken: true } });
  if (order?.trackToken) return order.trackToken;
  const token = randomBytes(24).toString("base64url");
  await db.order.update({ where: { id: orderId }, data: { trackToken: token } });
  return token;
}

const bogotaMonth = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Bogota" }).slice(0, 7);
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Reporte de flota sobre rutas FINALIZADAS del rango. Los km salen solo de rutas con GPS (`distanceKm` no nulo);
 * `coverage` dice cuántas rutas lo tienen, y costo/km es null cuando no hay km (no se inventa un número).
 */
export async function getFleetReport(from: string, to: string) {
  const db = requirePrisma();
  const range = { gte: parseBogotaDate(from), lte: endOfBogotaDay(to) };
  const routes = await db.deliveryRoute.findMany({
    where: { status: "DONE", date: range },
    select: { id: true, date: true, vehicleId: true, driverId: true, distanceKm: true, durationMin: true, vehicle: { select: { plate: true, type: true } }, driver: { select: { fullName: true } } },
  });
  const routeIds = routes.map((r) => r.id);
  const [delivered, failedAttempts, costs] = await Promise.all([
    db.order.groupBy({ by: ["deliveryRouteId"], where: { deliveryRouteId: { in: routeIds }, shippingStatus: "DELIVERED" }, _count: { _all: true } }),
    db.deliveryAttempt.findMany({ where: { routeId: { in: routeIds }, outcome: "FAILED" }, select: { routeId: true, reason: true } }),
    db.transportCost.findMany({ where: { date: range }, select: { vehicleId: true, date: true, category: true, amount: true, vehicle: { select: { plate: true, type: true } } } }),
  ]);
  const deliveredBy = new Map(delivered.map((d) => [d.deliveryRouteId, d._count._all]));
  const failedBy = new Map<string, number>();
  const failReasons = new Map<string, number>();
  for (const a of failedAttempts) {
    failedBy.set(a.routeId, (failedBy.get(a.routeId) ?? 0) + 1);
    const key = a.reason ?? "OTRO";
    failReasons.set(key, (failReasons.get(key) ?? 0) + 1);
  }

  const vehicles = new Map<string, { vehicleId: string; plate: string; type: string; routes: number; deliveries: number; failed: number; km: number; gpsRoutes: number; minutes: number; cost: number; costByCategory: Record<string, number> }>();
  const drivers = new Map<string, { driverId: string; name: string; routes: number; deliveries: number; failed: number; km: number }>();
  const months = new Map<string, { month: string; routes: number; km: number; cost: number }>();
  const vehicleRow = (id: string, plate: string, type: string) => {
    if (!vehicles.has(id)) vehicles.set(id, { vehicleId: id, plate, type, routes: 0, deliveries: 0, failed: 0, km: 0, gpsRoutes: 0, minutes: 0, cost: 0, costByCategory: {} });
    return vehicles.get(id)!;
  };
  const monthRow = (m: string) => {
    if (!months.has(m)) months.set(m, { month: m, routes: 0, km: 0, cost: 0 });
    return months.get(m)!;
  };

  for (const r of routes) {
    const v = vehicleRow(r.vehicleId, r.vehicle.plate, r.vehicle.type);
    const d = drivers.get(r.driverId) ?? { driverId: r.driverId, name: r.driver.fullName, routes: 0, deliveries: 0, failed: 0, km: 0 };
    const ok = deliveredBy.get(r.id) ?? 0;
    const bad = failedBy.get(r.id) ?? 0;
    v.routes++; v.deliveries += ok; v.failed += bad; v.minutes += r.durationMin ?? 0;
    d.routes++; d.deliveries += ok; d.failed += bad;
    if (r.distanceKm != null) { v.km += r.distanceKm; v.gpsRoutes++; d.km += r.distanceKm; }
    drivers.set(r.driverId, d);
    const m = monthRow(bogotaMonth(r.date));
    m.routes++; m.km += r.distanceKm ?? 0;
  }
  for (const c of costs) {
    const v = vehicleRow(c.vehicleId, c.vehicle.plate, c.vehicle.type);
    v.cost += c.amount;
    v.costByCategory[c.category] = (v.costByCategory[c.category] ?? 0) + c.amount;
    monthRow(bogotaMonth(c.date)).cost += c.amount;
  }

  const vehicleList = [...vehicles.values()].map((v) => ({ ...v, km: round1(v.km), hours: round1(v.minutes / 60), costPerKm: v.km > 0 ? Math.round(v.cost / v.km) : null })).sort((a, b) => a.plate.localeCompare(b.plate));
  const driverList = [...drivers.values()].map((d) => ({ ...d, km: round1(d.km), successRate: d.deliveries + d.failed > 0 ? Math.round((d.deliveries / (d.deliveries + d.failed)) * 100) : null })).sort((a, b) => a.name.localeCompare(b.name));
  const totalKm = round1(vehicleList.reduce((a, v) => a + v.km, 0));
  const totalCost = vehicleList.reduce((a, v) => a + v.cost, 0);
  const deliveries = vehicleList.reduce((a, v) => a + v.deliveries, 0);
  const failed = vehicleList.reduce((a, v) => a + v.failed, 0);
  return {
    totals: {
      routes: routes.length,
      km: totalKm,
      hours: round1(vehicleList.reduce((a, v) => a + v.minutes, 0) / 60),
      deliveries,
      failed,
      successRate: deliveries + failed > 0 ? Math.round((deliveries / (deliveries + failed)) * 100) : null,
      cost: totalCost,
      costPerKm: totalKm > 0 ? Math.round(totalCost / totalKm) : null,
    },
    coverage: { gpsRoutes: routes.filter((r) => r.distanceKm != null).length, routes: routes.length },
    vehicles: vehicleList,
    drivers: driverList,
    months: [...months.values()].map((m) => ({ ...m, km: round1(m.km) })).sort((a, b) => a.month.localeCompare(b.month)),
    failReasons: [...failReasons.entries()].map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count),
  };
}
