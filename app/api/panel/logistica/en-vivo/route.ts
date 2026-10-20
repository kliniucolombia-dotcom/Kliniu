import { requirePermission } from "@/lib/permissions";
import { listLiveRoutes } from "@/lib/logistics";

// Todas las rutas en curso (posición, paradas, alertas) para la pestaña "En vivo".
export async function GET() {
  const access = await requirePermission("MODULE_LOGISTICA", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  return Response.json({ routes: await listLiveRoutes() }, { headers: { "Cache-Control": "no-store" } });
}
