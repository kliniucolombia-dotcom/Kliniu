import { requirePermission } from "@/lib/permissions";
import { createOperation, listOperations, parseOperationInput, type OperationInput } from "@/lib/production-control";
import { productionControlErrorResponse } from "@/lib/production-control-errors";
import { readJsonRecord } from "@/lib/operations-validation";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const onlyActive = new URL(request.url).searchParams.get("active") === "1";
    return Response.json({ operations: await listOperations(onlyActive) });
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const input = parseOperationInput(await readJsonRecord(request)) as OperationInput;
    const operation = await createOperation({ ...input, isActive: input.isActive ?? true });
    broadcastPanelUpdate("production-control").catch(() => {});
    return Response.json(operation, { status: 201 });
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}
