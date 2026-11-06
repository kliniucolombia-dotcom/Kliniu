import { sellerHasFullAccess } from "@/lib/campaign-access";
import { listCarrierEvents } from "@/lib/coordinadora-eventos";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** Historial de la guía de Coordinadora del pedido (generada, estados, novedades, anulada). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await requirePermission("MODULE_PEDIDOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json([]);
  const order = await prisma.order.findUnique({ where: { id }, select: { assignedSellerId: true } });
  if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (access.session.role === "SELLER" && order.assignedSellerId !== access.session.userId && !sellerHasFullAccess(access.session.userId)) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }
  return Response.json(await listCarrierEvents(id));
}
