import { requirePermission } from "@/lib/permissions";
import { logAudit, diffChanges } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { updateDriver, deleteDriver } from "@/lib/logistics";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { fullName?: string; phone?: string | null; active?: boolean };
  const before = await prisma?.driver.findUnique({ where: { id }, select: { fullName: true, phone: true, active: true } });
  const driver = await updateDriver(id, body);
  broadcastPanelUpdate("logistics").catch(() => {});
  const changes = before ? diffChanges(before, body, ["fullName", "phone", "active"]) : {};
  if (Object.keys(changes).length) {
    await logAudit({
      actorId: access.user.id, actorEmail: access.user.email, action: "logistics.driver_update", entity: "driver", entityId: id,
      meta: { name: before?.fullName, changes }, ip: getClientIp(request),
    });
  }
  return Response.json({ driver });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const before = await prisma?.driver.findUnique({ where: { id }, select: { fullName: true } });
  try {
    await deleteDriver(id);
    await logAudit({
      actorId: access.user.id, actorEmail: access.user.email, action: "logistics.driver_delete", entity: "driver", entityId: id,
      meta: { name: before?.fullName }, ip: getClientIp(request),
    });
    broadcastPanelUpdate("logistics").catch(() => {});
    return Response.json({ ok: true });
  } catch (error) {
    const fk = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2003";
    return Response.json({ error: fk ? "No se puede eliminar: tiene rutas, novedades o checklists asociados" : "No fue posible eliminar el conductor" }, { status: 400 });
  }
}
