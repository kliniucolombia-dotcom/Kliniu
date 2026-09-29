import { getEffectivePermission, requirePermission } from "@/lib/permissions";
import { deleteEntry, parseEntryInput, updateEntry } from "@/lib/production-control";
import { productionControlErrorResponse } from "@/lib/production-control-errors";
import { readJsonRecord } from "@/lib/operations-validation";
import { broadcastPanelUpdate } from "@/lib/realtime";

type Ctx = { params: Promise<{ id: string }> };

// Se exige `create` y el dominio decide: propio dentro de la ventana, o ajeno con edit/delete.
export async function PATCH(request: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_ENSAMBLE", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const { id } = await params;
    const permission = await getEffectivePermission(access.user, "MODULE_ENSAMBLE");
    const entry = await updateEntry(id, parseEntryInput(await readJsonRecord(request), true), { id: access.user.id, permission });
    broadcastPanelUpdate("production-control").catch(() => {});
    return Response.json(entry);
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_ENSAMBLE", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const { id } = await params;
    const permission = await getEffectivePermission(access.user, "MODULE_ENSAMBLE");
    await deleteEntry(id, { id: access.user.id, permission });
    broadcastPanelUpdate("production-control").catch(() => {});
    return Response.json({ ok: true });
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}
