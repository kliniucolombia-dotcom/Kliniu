import { getSessionFromCookies } from "@/lib/auth";
import { startProductionOrder } from "@/lib/panel";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const updated = await startProductionOrder(id);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "INVALID_TRANSITION") {
      return Response.json({ error: "Solo se puede iniciar desde aprobada" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
