import { getSessionFromCookies } from "@/lib/auth";
import { deleteProductionOrder, getProductionOrderWithItems, updateProductionOrder } from "@/lib/panel";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const detail = await getProductionOrderWithItems(id);
  if (!detail) return Response.json({ error: "Orden no encontrada" }, { status: 404 });
  return Response.json(detail);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json() as { productionDate?: string; notes?: string | null };

  try {
    const updated = await updateProductionOrder(id, {
      productionDate: body.productionDate ? new Date(body.productionDate) : undefined,
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
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
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
