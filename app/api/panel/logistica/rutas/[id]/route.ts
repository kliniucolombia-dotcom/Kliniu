import { requirePermission } from "@/lib/permissions";
import { addOrdersToRoute, deleteRoute, removeOrderFromRoute, updateRoute } from "@/lib/logistics";
import type { DeliveryRouteStatus } from "@/generated/prisma/client";

const STATUSES: DeliveryRouteStatus[] = ["PLANNED", "IN_PROGRESS", "DONE"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as {
    status?: DeliveryRouteStatus;
    notes?: string | null;
    vehicleId?: string;
    driverId?: string;
    date?: string;
    addOrderIds?: string[];
    removeOrderId?: string;
  };

  if (body.status && !STATUSES.includes(body.status)) {
    return Response.json({ error: "Estado inválido" }, { status: 400 });
  }

  if (body.addOrderIds?.length) await addOrdersToRoute(id, body.addOrderIds);
  if (body.removeOrderId) await removeOrderFromRoute(id, body.removeOrderId);

  const route = await updateRoute(id, {
    status: body.status,
    notes: body.notes,
    vehicleId: body.vehicleId,
    driverId: body.driverId,
    date: body.date,
  });
  return Response.json({ route });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  await deleteRoute(id);
  return Response.json({ ok: true });
}
