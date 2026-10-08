import { requirePermission } from "@/lib/permissions";
import { createOrder, ensureMoldEquipment } from "@/lib/maintenance";
import { normalizeAttachments } from "@/lib/maintenance-upload";
import { createNotification } from "@/lib/notifications";
import type { MaintenancePriority, MaintenanceType } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { prisma } from "@/lib/prisma";

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
    attachments?: unknown;
  };
  if (!body.equipmentId || !body.type || !TYPES.includes(body.type) || !body.description?.trim()) {
    return Response.json({ error: "Faltan datos (equipmentId, type, description)" }, { status: 400 });
  }
  const priority = body.priority && PRIORITIES.includes(body.priority) ? body.priority : "MEDIUM";

  // "mold:<id>": molde de Producción aún sin equipo en Mantenimiento.
  const equipmentId = body.equipmentId.startsWith("mold:")
    ? (await ensureMoldEquipment(body.equipmentId.slice(5))).equipment.id
    : body.equipmentId;

  const order = await createOrder({
    equipmentId,
    type: body.type,
    priority,
    description: body.description,
    assignedToId: body.assignedToId,
    reportedById: access.user.id,
    attachments: normalizeAttachments(body.attachments),
  });
  // Un molde con orden abierta queda "En mantenimiento" en Producción (si no está montado).
  const eq = await prisma?.equipment.findUnique({ where: { id: equipmentId }, select: { moldId: true } });
  if (eq?.moldId) {
    await prisma?.mold.updateMany({ where: { id: eq.moldId, status: "AVAILABLE" }, data: { status: "MAINTENANCE" } });
    broadcastPanelUpdate("production").catch(() => {});
  }
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
