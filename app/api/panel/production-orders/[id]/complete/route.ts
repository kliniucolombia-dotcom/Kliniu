import { requirePermission } from "@/lib/permissions";
import { completeProductionOrder } from "@/lib/panel";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;

  try {
    const updated = await completeProductionOrder(id);
    return Response.json(updated);
  } catch (e) {
    if (e instanceof Error && e.message === "NOT_FOUND") {
      return Response.json({ error: "Orden no encontrada" }, { status: 404 });
    }
    if (e instanceof Error && e.message === "INVALID_TRANSITION") {
      return Response.json({ error: "Solo se puede completar desde en producción" }, { status: 409 });
    }
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
