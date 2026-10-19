import { requirePermission } from "@/lib/permissions";
import { getFleetReport } from "@/lib/logistics";
import { parseDateRange } from "@/lib/operations-validation";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  try { parseDateRange(from, to); } catch {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }
  return Response.json(await getFleetReport(from, to));
}
