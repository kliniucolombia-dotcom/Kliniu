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

  try {
    const mold = await updateMold(id, body);
    return Response.json({ mold });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "MOUNT_REQUIRED") return Response.json({ error: "El estado En uso solo se asigna al montar el molde" }, { status: 409 });
    if (key === "MOLD_MOUNTED") return Response.json({ error: "Desmonta el molde antes de cambiar su estado" }, { status: 409 });
    return Response.json({ error: "No fue posible actualizar el molde" }, { status: 400 });
  }
}
