import { requirePermission } from "@/lib/permissions";
import { deleteMoldChange, finishMoldChange, updateMoldChange } from "@/lib/molds";
import { parseIsoDateTime } from "@/lib/operations-validation";
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

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (access.user.role !== "JEFE_OPERACIONES" && access.user.role !== "SUPERADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as { startedAt?: string; finishedAt?: string; notes?: string | null };
  if (!body.startedAt || !body.finishedAt) {
    return Response.json({ error: "Faltan las fechas de montaje y desmontaje" }, { status: 400 });
  }

  try {
    const change = await updateMoldChange(id, {
      startedAt: parseIsoDateTime(body.startedAt),
      finishedAt: parseIsoDateTime(body.finishedAt),
      notes: body.notes,
    });
    broadcastPanelUpdate("production").catch(() => {});
    return Response.json({ change });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "INVALID_RANGE") {
      return Response.json({ error: "El desmontaje debe ser posterior al montaje." }, { status: 400 });
    }
    if (key === "OPEN_CHANGE") {
      return Response.json({ error: "Desmonta el molde antes de editar el cambio." }, { status: 409 });
    }
    if (key === "NOT_FOUND") return Response.json({ error: "Ese cambio ya no existe." }, { status: 404 });
    if (key === "INVALID_DATETIME") return Response.json({ error: "Fechas inválidas" }, { status: 400 });
    return Response.json({ error: "No fue posible actualizar el cambio" }, { status: 400 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  // Aunque el líder de inyección tenga canDelete en el módulo, borrar el
  // historial queda reservado al jefe de operaciones y a los superadmin.
  if (access.user.role !== "JEFE_OPERACIONES" && access.user.role !== "SUPERADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await deleteMoldChange(id);
    broadcastPanelUpdate("production").catch(() => {});
    return Response.json({ ok: true });
  } catch (error) {
    const key = error instanceof Error ? error.message : "";
    if (key === "OPEN_CHANGE") {
      return Response.json({ error: "Desmonta el molde antes de eliminar el cambio." }, { status: 409 });
    }
    if (key === "NOT_FOUND") return Response.json({ error: "Ese cambio ya no existe." }, { status: 404 });
    return Response.json({ error: "No fue posible eliminar el cambio" }, { status: 400 });
  }
}
