import { getEffectivePermission, requirePermission } from "@/lib/permissions";
import { controlScope, getControlOptions } from "@/lib/production-control";
import { productionControlErrorResponse } from "@/lib/production-control-errors";

export async function GET() {
  const access = await requirePermission("MODULE_CONTROL_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const permission = await getEffectivePermission(access.user, "MODULE_CONTROL_PRODUCCION");
    const scope = controlScope(permission) ?? "read";
    const options = await getControlOptions(scope);
    return Response.json({ ...options, permission, scope, me: { id: access.user.id, fullName: access.user.fullName } });
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}
