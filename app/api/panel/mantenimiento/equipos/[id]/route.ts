import { requirePermission } from "@/lib/permissions";
import { getEquipmentHistory, updateEquipment } from "@/lib/maintenance";
import type { EquipmentStatus } from "@/generated/prisma/client";

const STATUSES: EquipmentStatus[] = ["OPERATIVE", "DOWN", "MAINTENANCE"];

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  return Response.json({ history: await getEquipmentHistory(id) });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { name?: string; location?: string | null; status?: EquipmentStatus };
  if (body.status && !STATUSES.includes(body.status)) return Response.json({ error: "Estado inválido" }, { status: 400 });

  const equipment = await updateEquipment(id, body);
  return Response.json({ equipment });
}
