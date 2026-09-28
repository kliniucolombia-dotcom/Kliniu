import { getEffectivePermission, requirePermission } from "@/lib/permissions";
import {
  closeWorkOrder,
  controlScope,
  deleteWorkOrder,
  getWorkOrderDetail,
  parseWorkOrderInput,
  reopenWorkOrder,
  updateWorkOrder,
} from "@/lib/production-control";
import { productionControlErrorResponse } from "@/lib/production-control-errors";
import { readJsonRecord } from "@/lib/operations-validation";
import { broadcastPanelUpdate } from "@/lib/realtime";

type Ctx = { params: Promise<{ id: string }> };

// El detalle expone lo que registraron otros operarios: no es para quien solo ve lo suyo.
export async function GET(_: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_CONTROL_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const permission = await getEffectivePermission(access.user, "MODULE_CONTROL_PRODUCCION");
  if (controlScope(permission) === "own") return Response.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { id } = await params;
    return Response.json(await getWorkOrderDetail(id));
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}

/** Editar campos, o `action: "close" | "reopen"`. */
export async function PATCH(request: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_CONTROL_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const { id } = await params;
    const body = await readJsonRecord(request);
    const input = parseWorkOrderInput(body, true);
    const order =
      body.action === "close"
        ? await closeWorkOrder(id, input.producedQuantity)
        : body.action === "reopen"
          ? await reopenWorkOrder(id)
          : await updateWorkOrder(id, input);
    broadcastPanelUpdate("production-control").catch(() => {});
    return Response.json(order);
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}

export async function DELETE(_: Request, { params }: Ctx) {
  const access = await requirePermission("MODULE_CONTROL_PRODUCCION", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const { id } = await params;
    await deleteWorkOrder(id);
    broadcastPanelUpdate("production-control").catch(() => {});
    return Response.json({ ok: true });
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}
