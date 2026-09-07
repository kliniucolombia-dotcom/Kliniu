import { requirePermission } from "@/lib/permissions";
import { createOrder } from "@/lib/maintenance";
import type { MaintenancePriority, MaintenanceType } from "@/generated/prisma/client";

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
  return Response.json({ order });
}
