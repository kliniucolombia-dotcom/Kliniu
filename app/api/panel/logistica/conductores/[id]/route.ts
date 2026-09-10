import { requirePermission } from "@/lib/permissions";
import { updateDriver, deleteDriver } from "@/lib/logistics";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { fullName?: string; phone?: string | null; active?: boolean };
  const driver = await updateDriver(id, body);
  return Response.json({ driver });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  try {
    await deleteDriver(id);
    return Response.json({ ok: true });
  } catch (error) {
    const fk = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2003";
    return Response.json({ error: fk ? "No se puede eliminar: tiene rutas, novedades o checklists asociados" : "No fue posible eliminar el conductor" }, { status: 400 });
  }
}
