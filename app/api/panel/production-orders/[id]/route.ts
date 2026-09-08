import { requirePermission } from "@/lib/permissions";
import { deleteProductionOrder, getProductionOrderWithItems, updateProductionOrder } from "@/lib/panel";
import { parseBogotaCivilDate } from "@/lib/operations-validation";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const detail = await getProductionOrderWithItems(id);
  if (!detail) return Response.json({ error: "Orden no encontrada" }, { status: 404 });
  return Response.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const body = await request.json() as { productionDate?: string; notes?: string | null };

  try {
    const updated = await updateProductionOrder(id, {
      productionDate: body.productionDate ? parseBogotaCivilDate(body.productionDate) : undefined,
      notes: body.notes,
    });
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "NOT_EDITABLE") {
      return Response.json({ error: "Solo se puede editar en borrador" }, { status: 409 });
    }
    if (e instanceof Error && e.message === "INVALID_DATE") return Response.json({ error: "Fecha de producción inválida" }, { status: 400 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;

  try {
    await deleteProductionOrder(id);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "NOT_EDITABLE") {
      return Response.json({ error: "Solo se puede borrar en borrador" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
