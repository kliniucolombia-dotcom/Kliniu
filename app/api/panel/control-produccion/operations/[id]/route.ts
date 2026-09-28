import { requirePermission } from "@/lib/permissions";
import { deleteOperation, parseOperationInput, updateOperation } from "@/lib/production-control";
import { productionControlErrorResponse } from "@/lib/production-control-errors";
import { readJsonRecord } from "@/lib/operations-validation";
import { broadcastPanelUpdate } from "@/lib/realtime";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_CONTROL_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const { id } = await params;
    const operation = await updateOperation(id, parseOperationInput(await readJsonRecord(request), true));
    broadcastPanelUpdate("production-control").catch(() => {});
    return Response.json(operation);
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_CONTROL_PRODUCCION", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const { id } = await params;
    await deleteOperation(id);
    broadcastPanelUpdate("production-control").catch(() => {});
    return Response.json({ ok: true });
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}
