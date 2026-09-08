import { requirePermission } from "@/lib/permissions";
import { cancelOrder, completeOrder, startOrder, updateOrder } from "@/lib/maintenance";
import type { MaintenancePriority } from "@/generated/prisma/client";

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
    if (body.action === "start") return Response.json({ order: await startOrder(id) });
    if (body.action === "cancel") return Response.json({ order: await cancelOrder(id) });
    if (body.action === "complete") {
      if (!body.resolution?.trim()) return Response.json({ error: "La resolución es obligatoria" }, { status: 400 });
      const downtime = typeof body.downtimeMinutes === "number" && body.downtimeMinutes >= 0 ? Math.round(body.downtimeMinutes) : undefined;
      return Response.json({ order: await completeOrder(id, { resolution: body.resolution, downtimeMinutes: downtime }) });
    }
    return Response.json({
      order: await updateOrder(id, { priority: body.priority, assignedToId: body.assignedToId, description: body.description }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_TRANSITION") return Response.json({ error: "La orden cambió de estado o la transición no es válida" }, { status: 409 });
    if (error instanceof Error && error.message === "NOT_FOUND") return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    return Response.json({ error: "No fue posible actualizar la orden" }, { status: 400 });
  }
}
