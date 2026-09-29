import { requirePermission } from "@/lib/permissions";
import {
  createWorkOrder,
  listWorkOrders,
  parseWorkOrderInput,
  parseWorkOrderStatus,
  type WorkOrderInput,
} from "@/lib/production-control";
import { productionControlErrorResponse } from "@/lib/production-control-errors";
import { readJsonRecord } from "@/lib/operations-validation";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const url = new URL(request.url);
    const status = parseWorkOrderStatus(url.searchParams.get("status"));
    const orders = await listWorkOrders({ status, q: url.searchParams.get("q") ?? undefined });
    return Response.json({ orders });
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}

// Crear ODT es gestión: exige `edit` (el operario tiene `create` solo para sus bloques).
export async function POST(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const input = { lot: null, producedQuantity: null, notes: null, ...parseWorkOrderInput(await readJsonRecord(request)) } as WorkOrderInput;
    const order = await createWorkOrder(input, access.user.id);
    broadcastPanelUpdate("production-control").catch(() => {});
    return Response.json(order, { status: 201 });
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}
