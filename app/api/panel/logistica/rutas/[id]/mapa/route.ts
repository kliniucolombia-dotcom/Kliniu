import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { geocodePendingOrders } from "@/lib/logistics";
import { trackDistanceKm } from "@/lib/tracking";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no configurada" }, { status: 503 });
  const db = prisma;
  const { id } = await ctx.params;

  // ponytail: sin retención; si crece mucho, purgar posiciones de rutas finalizadas hace >90 días.
  const positions = await db.vehiclePosition.findMany({
    where: { routeId: id },
    orderBy: { recordedAt: "asc" },
    select: { lat: true, lng: true, accuracy: true, speed: true, recordedAt: true },
    take: 5000,
  });
  const route = await db.deliveryRoute.findUnique({ where: { id }, select: { startedAt: true, finishedAt: true } });
  const live = {
    track: positions.map((p) => ({ lat: p.lat, lng: p.lng })),
    last: positions.length ? { ...positions[positions.length - 1] } : null,
    distanceKm: trackDistanceKm(positions),
    startedAt: route?.startedAt ?? null,
    finishedAt: route?.finishedAt ?? null,
  };
  // Repetición del recorrido: todas las posiciones con hora y velocidad + intentos de entrega.
  if (new URL(req.url).searchParams.get("replay") === "1") {
    const [points, attempts] = await Promise.all([
      db.vehiclePosition.findMany({ where: { routeId: id }, orderBy: { recordedAt: "asc" }, select: { lat: true, lng: true, speed: true, recordedAt: true }, take: 5000 }),
      db.deliveryAttempt.findMany({ where: { routeId: id }, orderBy: { recordedAt: "asc" }, select: { outcome: true, reason: true, lat: true, lng: true, recordedAt: true, order: { select: { customerName: true } } } }),
    ]);
    return Response.json({
      points,
      deliveries: attempts.map((a) => ({ outcome: a.outcome, reason: a.reason, lat: a.lat, lng: a.lng, recordedAt: a.recordedAt, name: a.order.customerName })),
    });
  }

  // Modo en vivo: solo posiciones, sin geocodificar (el mapa lo consulta cada 15 s).
  if (new URL(req.url).searchParams.get("live") === "1") return Response.json({ live });

  const stops = await geocodePendingOrders(id, 25);
  return Response.json({ stops, live });
}
