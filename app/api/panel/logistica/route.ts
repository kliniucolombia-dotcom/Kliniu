import { requirePermission, getEffectivePermission } from "@/lib/permissions";
import {
  getLogisticsKpis,
  listAssignableOrders,
  listCosts,
  listDrivers,
  listIncidents,
  listRoutes,
  listVehicles,
} from "@/lib/logistics";
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

  const [drivers, vehicles, routes, assignableOrders, costs, incidents, kpis, permission] = await Promise.all([
    listDrivers(),
    listVehicles(),
    listRoutes(from, to),
    listAssignableOrders(),
    listCosts(from, to),
    listIncidents(from, to),
    getLogisticsKpis(from, to),
    getEffectivePermission(access.user, "MODULE_LOGISTICA"),
  ]);

  return Response.json({
    drivers,
    vehicles,
    routes,
    assignableOrders,
    costs,
    incidents,
    kpis,
    permission,
  });
}
