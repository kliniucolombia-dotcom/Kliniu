import { requirePermission } from "@/lib/permissions";
import { finishMoldChange } from "@/lib/molds";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { notes?: string };

  try {
    const change = await finishMoldChange(id, body.notes);
    broadcastPanelUpdate("production").catch(() => {});
    return Response.json({ change });
  } catch (error) {
    const already = error instanceof Error && error.message === "ALREADY_FINISHED";
    return Response.json({ error: already ? "Ese cambio ya fue cerrado." : "No fue posible cerrar el cambio" }, { status: 400 });
  }
}
