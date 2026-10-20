import { prisma } from "@/lib/prisma";
import { geocodePendingOrders } from "@/lib/logistics";

// Orden óptimo de paradas con Google Routes API (computeRoutes + optimizeWaypointOrder).
// Tarifa "Compute Routes Pro": 5.000 consultas gratis al mes; cada optimización hace 2 (orden actual y optimizado).
const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const MAX_STOPS = 25;
const GPS_FRESH_MS = 15 * 60_000;

type Waypoint = { location: { latLng: { latitude: number; longitude: number } } } | { address: string };
const at = (lat: number, lng: number): Waypoint => ({ location: { latLng: { latitude: lat, longitude: lng } } });

async function computeRoute(origin: Waypoint, intermediates: Waypoint[], optimize: boolean) {
  const res = await fetch(ROUTES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_MAPS_SERVER_KEY ?? "",
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.optimizedIntermediateWaypointIndex",
    },
    // Ida y vuelta al punto de salida: así el orden y el ahorro se comparan en igualdad de condiciones.
    body: JSON.stringify({ origin, destination: origin, intermediates, travelMode: "DRIVE", routingPreference: "TRAFFIC_UNAWARE", optimizeWaypointOrder: optimize, languageCode: "es-CO" }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as { routes?: { distanceMeters?: number; duration?: string; optimizedIntermediateWaypointIndex?: number[] }[]; error?: { message?: string; status?: string } };
  if (!res.ok || !json.routes?.[0]) {
    console.error("ROUTES_API_FAILED", res.status, json.error?.status, json.error?.message);
    throw new Error(json.error?.status === "PERMISSION_DENIED" ? "ROUTES_API_DISABLED" : "ROUTES_API_FAILED");
  }
  const r = json.routes[0];
  return { km: Math.round((r.distanceMeters ?? 0) / 100) / 10, min: Math.round(parseInt(r.duration ?? "0", 10) / 60), order: r.optimizedIntermediateWaypointIndex };
}

/** Propone (no guarda) el orden óptimo: lo ya atendido queda arriba y lo que no tiene ubicación al final. */
export async function proposeStopOrder(routeId: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!process.env.GOOGLE_MAPS_SERVER_KEY) throw new Error("ROUTES_API_DISABLED");
  const route = await prisma.deliveryRoute.findUnique({ where: { id: routeId }, select: { status: true } });
  if (!route) throw new Error("ROUTE_NOT_FOUND");
  if (route.status === "DONE") throw new Error("ROUTE_DONE");

  const stops = await geocodePendingOrders(routeId, 25);
  const done = stops.filter((s) => s.result);
  const pending = stops.filter((s) => !s.result && s.lat != null && s.lng != null);
  const unlocated = stops.filter((s) => !s.result && (s.lat == null || s.lng == null));

  // Punto de salida: GPS reciente del vehículo > dirección de bodega (variable de entorno) > primera parada pendiente.
  const last = route.status === "IN_PROGRESS"
    ? await prisma.vehiclePosition.findFirst({ where: { routeId }, orderBy: { recordedAt: "desc" }, select: { lat: true, lng: true, recordedAt: true } })
    : null;
  let origin: Waypoint;
  let originLabel: string;
  let fixedFirst: typeof pending = [];
  if (last && Date.now() - last.recordedAt.getTime() < GPS_FRESH_MS) {
    origin = at(last.lat, last.lng);
    originLabel = "posición actual del vehículo";
  } else if (process.env.LOGISTICA_BODEGA_DIRECCION) {
    origin = { address: process.env.LOGISTICA_BODEGA_DIRECCION };
    originLabel = "bodega";
  } else {
    fixedFirst = pending.slice(0, 1);
    origin = at(fixedFirst[0]?.lat ?? 0, fixedFirst[0]?.lng ?? 0);
    originLabel = "primera parada pendiente";
  }
  const movable = pending.filter((s) => !fixedFirst.includes(s));
  if (movable.length < 2) throw new Error("NOT_ENOUGH_STOPS");
  if (movable.length > MAX_STOPS) throw new Error("TOO_MANY_STOPS");

  const waypoints = movable.map((s) => at(s.lat as number, s.lng as number));
  const [before, after] = await Promise.all([computeRoute(origin, waypoints, false), computeRoute(origin, waypoints, true)]);
  const optimized = (after.order ?? movable.map((_, i) => i)).map((i) => movable[i]);
  const order = [...done, ...fixedFirst, ...optimized, ...unlocated];
  const changed = order.some((s, i) => s.id !== stops[i].id);
  return {
    originLabel,
    before: { km: before.km, min: before.min },
    after: { km: after.km, min: after.min },
    changed,
    order: order.map((s) => ({ id: s.id, name: s.name, address: s.address, located: s.lat != null && s.lng != null, done: !!s.result })),
  };
}
