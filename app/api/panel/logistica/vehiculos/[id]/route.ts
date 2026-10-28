import { requirePermission } from "@/lib/permissions";
import { logAudit, diffChanges } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { updateVehicle, deleteVehicle } from "@/lib/logistics";
import type { VehicleType } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as {
    plate?: string;
    type?: VehicleType;
    active?: boolean;
    soatDue?: string | null;
    technicalReviewDue?: string | null;
    policyDue?: string | null;
    operationCardDue?: string | null;
    extinguisherDue?: string | null;
  };
  const before = await prisma?.vehicle.findUnique({ where: { id }, select: { plate: true, type: true, active: true } });
  const vehicle = await updateVehicle(id, body);
  broadcastPanelUpdate("logistics").catch(() => {});
  const changes = before ? diffChanges(before, body, ["plate", "type", "active"]) : {};
  const alsoChanged = ["soatDue", "technicalReviewDue", "policyDue", "operationCardDue", "extinguisherDue"].filter((k) => k in body);
  if (Object.keys(changes).length || alsoChanged.length) {
    await logAudit({
      actorId: access.user.id, actorEmail: access.user.email, action: "logistics.vehicle_update", entity: "vehicle", entityId: id,
      meta: { name: before?.plate, changes, alsoChanged }, ip: getClientIp(request),
    });
  }
  return Response.json({ vehicle });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const before = await prisma?.vehicle.findUnique({ where: { id }, select: { plate: true } });
  try {
    await deleteVehicle(id);
    await logAudit({
      actorId: access.user.id, actorEmail: access.user.email, action: "logistics.vehicle_delete", entity: "vehicle", entityId: id,
      meta: { name: before?.plate }, ip: getClientIp(request),
    });
    broadcastPanelUpdate("logistics").catch(() => {});
    return Response.json({ ok: true });
  } catch (error) {
    const fk = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2003";
    return Response.json({ error: fk ? "No se puede eliminar: tiene rutas, costos o checklists asociados" : "No fue posible eliminar el vehículo" }, { status: 400 });
  }
}
