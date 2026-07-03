import { getSessionFromCookies } from "@/lib/auth";
import { createProductionOrderItem } from "@/lib/panel";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json() as {
    productId?: string; quantity?: number; destination?: string | null; notes?: string | null;
  };

  if (!body.productId) {
    return Response.json({ error: "Producto requerido" }, { status: 400 });
  }

  try {
    const created = await createProductionOrderItem(id, {
      productId: body.productId,
      quantity: body.quantity,
      destination: body.destination,
      notes: body.notes,
    });
    return Response.json(created);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Orden no encontrada" }, { status: 404 });
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
