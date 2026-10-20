import { requirePermission } from "@/lib/permissions";
import { proposeStopOrder } from "@/lib/route-optimize";

const ERRORS: Record<string, [string, number]> = {
  ROUTE_NOT_FOUND: ["Ruta no encontrada", 404],
  ROUTE_DONE: ["La ruta ya finalizó", 409],
  NOT_ENOUGH_STOPS: ["Se necesitan al menos 2 paradas pendientes con dirección ubicada en el mapa", 400],
  TOO_MANY_STOPS: ["Máximo 25 paradas pendientes por optimización", 400],
  ROUTES_API_DISABLED: ["La optimización no está activa: habilita \"Routes API\" para la clave de Google del servidor", 503],
  ROUTES_API_FAILED: ["Google no pudo calcular la ruta. Intenta de nuevo", 502],
};

// Propone el orden óptimo de paradas (no guarda): el panel lo muestra y se aplica con el PATCH de la ruta.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  try {
    return Response.json(await proposeStopOrder(id));
  } catch (e) {
    const [error, status] = ERRORS[e instanceof Error ? e.message : ""] ?? ["No se pudo optimizar la ruta", 500];
    if (status === 500) console.error("ROUTE_OPTIMIZE_FAILED", e);
    return Response.json({ error }, { status });
  }
}
