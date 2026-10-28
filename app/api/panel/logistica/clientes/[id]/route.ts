import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { deleteCustomer } from "@/lib/logistics";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const before = await prisma?.logisticsCustomer.findUnique({ where: { id }, select: { name: true, city: true } });
  try {
    await deleteCustomer(id);
    await logAudit({
      actorId: access.user.id, actorEmail: access.user.email, action: "logistics.customer_delete", entity: "customer", entityId: id,
      meta: { name: before?.name, city: before?.city }, ip: getClientIp(request),
    });
    broadcastPanelUpdate("logistics").catch(() => {});
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: "Este cliente viene de pedidos y no se puede eliminar aquí" }, { status: 400 });
  }
}
