import { requirePermission } from "@/lib/permissions";
import { deleteCost } from "@/lib/logistics";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  await deleteCost(id);
  return Response.json({ ok: true });
}
