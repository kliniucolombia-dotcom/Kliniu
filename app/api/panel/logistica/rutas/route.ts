import { requirePermission } from "@/lib/permissions";
import { createRoute } from "@/lib/logistics";

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
  return Response.json({ route });
}
