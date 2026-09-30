import { requirePermission } from "@/lib/permissions";
import { cancelOrder, completeOrder, startOrder, updateOrder } from "@/lib/maintenance";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import type { MaintenancePriority } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as {
    action?: "start" | "complete" | "cancel";
    resolution?: string;
    downtimeMinutes?: number;
    priority?: MaintenancePriority;
    assignedToId?: string | null;
    description?: string;
  };

  try {
    if (body.action === "start") {
      const order = await startOrder(id);
      broadcastPanelUpdate("maintenance").catch(() => {});
      return Response.json({ order });
    }
    if (body.action === "cancel") {
      const order = await cancelOrder(id);
      broadcastPanelUpdate("maintenance").catch(() => {});
      return Response.json({ order });
    }
    if (body.action === "complete") {
      if (!body.resolution?.trim()) return Response.json({ error: "La resolución es obligatoria" }, { status: 400 });
      const downtime = typeof body.downtimeMinutes === "number" && body.downtimeMinutes >= 0 ? Math.round(body.downtimeMinutes) : undefined;
      const order = await completeOrder(id, { resolution: body.resolution, downtimeMinutes: downtime });
      broadcastPanelUpdate("maintenance").catch(() => {});
      return Response.json({ order });
    }
    const previous = body.assignedToId !== undefined
      ? await prisma?.maintenanceOrder.findUnique({ where: { id }, select: { assignedToId: true } })
      : null;
    const order = await updateOrder(id, { priority: body.priority, assignedToId: body.assignedToId, description: body.description });
    broadcastPanelUpdate("maintenance").catch(() => {});

    // Reasignación: avisa al nuevo técnico y a las jefaturas si de verdad cambió.
    if (
      body.assignedToId &&
      body.assignedToId !== access.user.id &&
      body.assignedToId !== previous?.assignedToId
    ) {
      const equipmentName = order.equipment?.name ?? "Equipo";
      const assignee = await prisma?.user.findUnique({ where: { id: body.assignedToId }, select: { fullName: true } });

      // Directo al nuevo técnico.
      createNotification({
        eventKey: "maintenance.assigned",
        title: `Te asignaron la orden ${order.number}`,
        detail: `${equipmentName}: ${order.description} · ${access.user.fullName}`,
        href: "/panel/mantenimiento",
        targetUserId: body.assignedToId,
        createdById: access.user.id,
        metadata: { orderId: order.id, number: order.number, priority: order.priority },
      }).catch(() => {});

      // Al equipo y jefaturas: la orden cambió de responsable.
      createNotification({
        eventKey: "maintenance.reassigned",
        title: `Orden ${order.number} reasignada a ${assignee?.fullName ?? "otro técnico"}`,
        detail: `${equipmentName} · ${access.user.fullName}`,
        href: "/panel/mantenimiento",
        createdById: access.user.id,
        metadata: { orderId: order.id, number: order.number, assignedToId: body.assignedToId },
      }).catch(() => {});
    }

    return Response.json({ order });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TRANSITION") return Response.json({ error: "La orden cambió de estado o la transición no es válida" }, { status: 409 });
    if (error instanceof Error && error.message === "NOT_FOUND") return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    return Response.json({ error: "No fue posible actualizar la orden" }, { status: 400 });
  }
}
