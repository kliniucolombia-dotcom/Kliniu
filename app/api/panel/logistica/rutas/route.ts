import { requirePermission } from "@/lib/permissions";
import { createRoute } from "@/lib/logistics";
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
  };
  if (!body.date || !body.vehicleId || !body.driverId) {
    return Response.json({ error: "Faltan datos (date, vehicleId, driverId)" }, { status: 400 });
  }

  const route = await createRoute({
    date: body.date,
    vehicleId: body.vehicleId,
    driverId: body.driverId,
    notes: body.notes,
    orderIds: Array.isArray(body.orderIds) ? body.orderIds.filter((id) => typeof id === "string") : [],
    userId: access.user.id,
  });
  broadcastPanelUpdate("logistics").catch(() => {});

  createNotification({
    eventKey: "logistics.route_assigned",
    title: `Ruta asignada · ${route.driver?.fullName ?? "conductor"}`,
    detail: `${route.vehicle?.plate ?? "Vehículo"} · ${body.orderIds?.length ?? 0} pedidos · ${access.user.fullName}`,
    href: "/panel/logistica",
    createdById: access.user.id,
    metadata: { routeId: route.id, driverId: route.driverId },
  }).catch(() => {});

  return Response.json({ route });
}
