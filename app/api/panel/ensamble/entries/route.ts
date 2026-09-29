import { getEffectivePermission, requirePermission } from "@/lib/permissions";
import { controlScope, createEntry, listEntries, parseEntryInput } from "@/lib/production-control";
import { productionControlErrorResponse } from "@/lib/production-control-errors";
import { readJsonRecord } from "@/lib/operations-validation";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const permission = await getEffectivePermission(access.user, "MODULE_ENSAMBLE");
    const url = new URL(request.url);
    const param = (k: string) => url.searchParams.get(k) || undefined;
    const result = await listEntries(
      { from: param("from") ?? "", to: param("to") ?? "", operatorId: param("operatorId"), workOrderId: param("workOrderId"), section: param("section") },
      { id: access.user.id, permission },
      controlScope(permission) ?? "read",
    );
    return Response.json(result);
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_ENSAMBLE", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const permission = await getEffectivePermission(access.user, "MODULE_ENSAMBLE");
    const entry = await createEntry(parseEntryInput(await readJsonRecord(request)), { id: access.user.id, permission });
    broadcastPanelUpdate("production-control").catch(() => {});
    return Response.json(entry, { status: 201 });
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}
