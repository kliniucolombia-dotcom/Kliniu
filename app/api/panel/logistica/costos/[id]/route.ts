import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { deleteCost } from "@/lib/logistics";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const before = await prisma?.transportCost.findUnique({ where: { id }, select: { category: true, amount: true } });
  await deleteCost(id);
  await logAudit({
    actorId: access.user.id, actorEmail: access.user.email, action: "logistics.cost_delete", entity: "cost", entityId: id,
    meta: { name: before?.category, amount: before?.amount }, ip: getClientIp(request),
  });
  broadcastPanelUpdate("logistics").catch(() => {});
  return Response.json({ ok: true });
}
