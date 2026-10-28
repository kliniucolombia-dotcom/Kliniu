import { requirePermission } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { cancelProductionOrder } from "@/lib/panel";
import { createNotification } from "@/lib/notifications";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;

  try {
    const updated = await cancelProductionOrder(id);
    await logAudit({
      actorId: access.user.id, actorEmail: access.user.email, action: "production.order_cancel", entity: "production", entityId: id,
      meta: { name: updated.number, area: updated.area }, ip: getClientIp(request),
    });
    broadcastPanelUpdate("production").catch(() => {});

    createNotification({
      eventKey: "production.order_cancelled",
      title: `Producción cancelada ${updated.number}`,
      detail: `Área ${updated.area === "ENSAMBLE" ? "Ensamble" : "Inyección"} · ${access.user.fullName}`,
      href: "/panel/produccion/ordenes",
      createdById: access.user.id,
      metadata: { orderId: updated.id, number: updated.number, area: updated.area },
    }).catch(() => {});

    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "INVALID_TRANSITION") {
      return Response.json({ error: "No se puede cancelar en este estado" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
