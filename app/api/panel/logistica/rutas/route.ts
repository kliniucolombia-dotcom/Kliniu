import { requirePermission } from "@/lib/permissions";
import { createRoute, type NewStop } from "@/lib/logistics";
import { createNotification } from "@/lib/notifications";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    date?: string;
    vehicleId?: string;
    driverId?: string;
    notes?: string;
    orderIds?: string[];
    newStops?: Partial<NewStop>[];
    sequence?: string[];
  };
  if (!body.date || !body.vehicleId || !body.driverId) {
    return Response.json({ error: "Faltan datos (date, vehicleId, driverId)" }, { status: 400 });
  }

  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const newStops: NewStop[] = (Array.isArray(body.newStops) ? body.newStops : []).slice(0, 50).map((s) => ({
    name: str(s.name, 120),
    phone: str(s.phone, 30),
    department: str(s.department, 60),
    city: str(s.city, 80),
    address: str(s.address, 200),
    address2: str(s.address2, 120),
    notes: str(s.notes, 300),
    lat: num(s.lat),
    lng: num(s.lng),
  }));
  if (newStops.some((s) => !s.name || !s.address || !s.city || !s.department)) {
    return Response.json({ error: "Cada parada nueva necesita nombre, dirección, ciudad y departamento" }, { status: 400 });
  }

  const route = await createRoute({
    date: body.date,
    vehicleId: body.vehicleId,
    driverId: body.driverId,
    notes: body.notes,
    orderIds: Array.isArray(body.orderIds) ? body.orderIds.filter((id) => typeof id === "string") : [],
    newStops,
    sequence: Array.isArray(body.sequence) ? body.sequence.filter((k) => typeof k === "string") : undefined,
    userId: access.user.id,
  });
  broadcastPanelUpdate("logistics").catch(() => {});

  createNotification({
    eventKey: "logistics.route_assigned",
    title: `Ruta asignada · ${route.driver?.fullName ?? "conductor"}`,
    detail: `${route.vehicle?.plate ?? "Vehículo"} · ${(body.orderIds?.length ?? 0) + newStops.length} paradas · ${access.user.fullName}`,
    href: "/panel/logistica",
    createdById: access.user.id,
    metadata: { routeId: route.id, driverId: route.driverId },
  }).catch(() => {});

  return Response.json({ route });
}
