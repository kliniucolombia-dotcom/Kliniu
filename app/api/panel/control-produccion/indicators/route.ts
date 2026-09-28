import { getEffectivePermission, requirePermission } from "@/lib/permissions";
import { controlScope, getIndicators } from "@/lib/production-control";
import { productionControlErrorResponse } from "@/lib/production-control-errors";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_CONTROL_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  try {
    const permission = await getEffectivePermission(access.user, "MODULE_CONTROL_PRODUCCION");
    const url = new URL(request.url);
    const indicators = await getIndicators(
      { from: url.searchParams.get("from") ?? "", to: url.searchParams.get("to") ?? "", section: url.searchParams.get("section") || undefined },
      { id: access.user.id, permission },
      controlScope(permission) ?? "read",
    );
    return Response.json(indicators);
  } catch (e) {
    return productionControlErrorResponse(e);
  }
}
