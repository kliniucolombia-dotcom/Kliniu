import { requirePermission } from "@/lib/permissions";
import { approveProductionOrder } from "@/lib/panel";
import { createNotification } from "@/lib/notifications";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const { id } = await params;

  try {
    const updated = await approveProductionOrder(id, session.userId);
    broadcastPanelUpdate("production").catch(() => {});

    createNotification({
      eventKey: "production.order_approved",
      title: `Orden de producción aprobada ${updated.number}`,
      detail: `Área ${updated.area === "ENSAMBLE" ? "Ensamble" : "Inyección"} · lista para producir`,
      href: "/panel/produccion/ordenes",
      createdById: session.userId,
      metadata: { orderId: updated.id, number: updated.number, area: updated.area },
    }).catch(() => {});

    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "INVALID_TRANSITION") {
      return Response.json({ error: "Solo se puede aprobar desde borrador" }, { status: 409 });
    }
    if (e instanceof Error && e.message === "NO_ITEMS") {
      return Response.json({ error: "La orden debe tener al menos un producto" }, { status: 400 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
