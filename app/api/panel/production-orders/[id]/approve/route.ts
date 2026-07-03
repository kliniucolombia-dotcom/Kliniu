import { getSessionFromCookies } from "@/lib/auth";
import { approveProductionOrder } from "@/lib/panel";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const updated = await approveProductionOrder(id, session.userId);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "INVALID_TRANSITION") {
      return Response.json({ error: "Solo se puede aprobar desde borrador" }, { status: 409 });
    }
    if (e instanceof Error && e.message === "NO_ITEMS") {
      return Response.json({ error: "La orden debe tener al menos un producto" }, { status: 400 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
