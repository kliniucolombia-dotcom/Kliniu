import { requirePermission } from "@/lib/permissions";
import { createOrder } from "@/lib/maintenance";
import { createNotification } from "@/lib/notifications";
import type { MaintenancePriority, MaintenanceType } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";

const TYPES: MaintenanceType[] = ["PREVENTIVE", "CORRECTIVE"];
const PRIORITIES: MaintenancePriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    equipmentId?: string;
    type?: MaintenanceType;
    priority?: MaintenancePriority;
    description?: string;
    assignedToId?: string;
  };
  if (!body.equipmentId || !body.type || !TYPES.includes(body.type) || !body.description?.trim()) {
    return Response.json({ error: "Faltan datos (equipmentId, type, description)" }, { status: 400 });
  }
  const priority = body.priority && PRIORITIES.includes(body.priority) ? body.priority : "MEDIUM";

  const order = await createOrder({
    equipmentId: body.equipmentId,
    type: body.type,
    priority,
    description: body.description,
    assignedToId: body.assignedToId,
    reportedById: access.user.id,
  });
  broadcastPanelUpdate("maintenance").catch(() => {});

  const equipmentName = order.equipment?.name ?? "Equipo";
  const typeLabel = body.type === "PREVENTIVE" ? "Preventivo" : "Correctivo";

  // El equipo de mantenimiento y las jefaturas se enteran de toda orden nueva.
  createNotification({
    eventKey: priority === "URGENT" ? "maintenance.urgent" : "maintenance.scheduled",
    title: `Mantenimiento ${order.number}: ${equipmentName}`,
    detail: `${typeLabel} · prioridad ${priority} · ${access.user.fullName}`,
    href: "/panel/mantenimiento",
    createdById: access.user.id,
    metadata: { orderId: order.id, number: order.number, priority },
  }).catch(() => {});

  // Aviso directo al técnico asignado (además de las jefaturas del evento).
  if (body.assignedToId && body.assignedToId !== access.user.id) {
    createNotification({
      eventKey: "maintenance.assigned",
      title: `Te asignaron la orden ${order.number}`,
      detail: `${equipmentName}: ${body.description.trim()} · ${access.user.fullName}`,
      href: "/panel/mantenimiento",
      targetUserId: body.assignedToId,
      createdById: access.user.id,
      metadata: { orderId: order.id, number: order.number, priority },
    }).catch(() => {});
  }

  return Response.json({ order });
}
