import { requirePermission } from "@/lib/permissions";
import { updateMold } from "@/lib/molds";
import type { MoldStatus } from "@/generated/prisma/client";

const STATUSES: MoldStatus[] = ["AVAILABLE", "IN_USE", "MAINTENANCE"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { name?: string; status?: MoldStatus };
  if (body.status && !STATUSES.includes(body.status)) return Response.json({ error: "Estado inválido" }, { status: 400 });

  const mold = await updateMold(id, body);
  return Response.json({ mold });
}
