import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { haversineKm } from "@/lib/tracking";
import { STOP_ORDER_BY } from "@/lib/logistics";

const STALE_MS = 10 * 60 * 1000;

// Público por token del pedido: solo lo que el cliente necesita. Nada de foto, teléfonos ni otros clientes.
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!prisma) return Response.json({ error: "No disponible" }, { status: 503 });
  if (!(await checkRateLimit(`seguimiento:${getClientIp(request)}`, 60, 60_000))) {
    return Response.json({ error: "Demasiadas consultas, espera un momento" }, { status: 429 });
  }

  const { token } = await params;
  const order = await prisma.order.findUnique({
    where: { trackToken: token },
    select: {
      id: true,
      shippingStatus: true,
      deliveredAt: true,
      lat: true,
      lng: true,
      deliveryRouteId: true,
      deliveryRoute: { select: { status: true, driver: { select: { fullName: true } }, vehicle: { select: { plate: true } } } },
      deliveryAttempts: { orderBy: { recordedAt: "desc" }, take: 1, select: { outcome: true } },
    },
  });
  if (!order) return Response.json({ error: "Enlace inválido" }, { status: 404 });

  const route = order.deliveryRoute;
  const delivered = order.shippingStatus === "DELIVERED";
  const failed = !delivered && order.deliveryAttempts[0]?.outcome === "FAILED";
  const enRoute = !!route && route.status === "IN_PROGRESS" && !delivered && !failed;
  const stage = delivered ? "DELIVERED" : failed ? "FAILED" : enRoute ? "EN_ROUTE" : "NOT_STARTED";

  let stopsAhead: number | null = null;
  let vehicle: { lat: number; lng: number; recordedAt: Date } | null = null;
  let distanceKm: number | null = null;

  if (enRoute && order.deliveryRouteId) {
    const pending = await prisma.order.findMany({
      where: { deliveryRouteId: order.deliveryRouteId, shippingStatus: { notIn: ["DELIVERED", "CANCELLED"] }, deliveryAttempts: { none: {} } },
      orderBy: [...STOP_ORDER_BY],
      select: { id: true },
    });
    const idx = pending.findIndex((p) => p.id === order.id);
    stopsAhead = idx >= 0 ? idx : null;

    const last = await prisma.vehiclePosition.findFirst({ where: { routeId: order.deliveryRouteId }, orderBy: { recordedAt: "desc" }, select: { lat: true, lng: true, recordedAt: true } });
    // Sin señal reciente no se muestra una posición vieja como si fuera actual.
    if (last && Date.now() - last.recordedAt.getTime() <= STALE_MS) {
      vehicle = last;
      if (order.lat != null && order.lng != null) distanceKm = Math.round(haversineKm(last, { lat: order.lat, lng: order.lng }) * 10) / 10;
    }
  }

  return Response.json(
    {
      stage,
      driver: enRoute ? route!.driver.fullName.trim().split(/\s+/)[0] : null,
      plate: enRoute ? route!.vehicle.plate : null,
      stopsAhead,
      destination: order.lat != null && order.lng != null ? { lat: order.lat, lng: order.lng } : null,
      vehicle: vehicle ? { lat: vehicle.lat, lng: vehicle.lng, recordedAt: vehicle.recordedAt } : null,
      distanceKm,
      deliveredAt: delivered ? order.deliveredAt : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
