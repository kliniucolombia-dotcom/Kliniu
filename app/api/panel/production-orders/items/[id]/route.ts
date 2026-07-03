import { requirePermission } from "@/lib/permissions";
import { deleteProductionOrderItem, updateProductionOrderItem } from "@/lib/panel";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const body = await request.json() as {
    productId?: string; quantity?: number; destination?: string | null; notes?: string | null;
  };

  try {
    const updated = await updateProductionOrderItem(id, body);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Ítem no encontrado" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "NOT_EDITABLE") {
      return Response.json({ error: "Solo se puede editar en borrador" }, { status: 409 });
    }
    if (e instanceof Error && e.message === "PRODUCT_NOT_FOUND") {
      return Response.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;

  try {
    await deleteProductionOrderItem(id);
    return Response.json({ ok: true });
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Ítem no encontrado" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "NOT_EDITABLE") {
      return Response.json({ error: "Solo se puede editar en borrador" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
