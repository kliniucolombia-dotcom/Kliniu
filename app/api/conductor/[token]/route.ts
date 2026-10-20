import { prisma } from "@/lib/prisma";
import { STOP_ORDER_BY, bogotaToday, checklistTemplateFor, parseBogotaDate, DRIVER_INCIDENT_TYPES } from "@/lib/logistics";

// Público por token: solo expone lo que el conductor necesita ver.
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!prisma) return Response.json({ error: "No disponible" }, { status: 503 });
  const { token } = await params;
  const route = await prisma.deliveryRoute.findUnique({
    where: { trackToken: token },
    select: {
      status: true,
      startedAt: true,
      driver: { select: { fullName: true } },
      vehicle: { select: { id: true, plate: true, type: true } },
      orders: {
        select: {
          id: true,
          customerName: true,
          customerPhone: true,
          addressLine1: true,
          city: true,
          lat: true,
          lng: true,
          shippingStatus: true,
          deliveryAttempts: { orderBy: { recordedAt: "desc" }, take: 1, select: { outcome: true, reason: true } },
        },
        orderBy: [...STOP_ORDER_BY],
      },
    },
  });
  if (!route) return Response.json({ error: "Enlace inválido" }, { status: 404 });
  // Checklist pre-operacional del día: si ya existe para este vehículo no se vuelve a pedir.
  const done = !!(await prisma.vehicleChecklistEntry.findUnique({
    where: { vehicleId_date: { vehicleId: route.vehicle.id, date: parseBogotaDate(bogotaToday()) } },
    select: { id: true },
  }));
  return Response.json({
    checklist: { done, items: checklistTemplateFor(route.vehicle.type) },
    incidentTypes: DRIVER_INCIDENT_TYPES,
    status: route.status,
    startedAt: route.startedAt,
    driver: route.driver.fullName,
    plate: route.vehicle.plate,
    stops: route.orders.map((o) => {
      const last = o.deliveryAttempts[0];
      return {
        id: o.id,
        name: o.customerName,
        phone: o.customerPhone,
        address: `${o.addressLine1}, ${o.city}`,
        lat: o.lat,
        lng: o.lng,
        // Una entrega ya hecha por otra vía (panel) también cuenta como atendida.
        result: o.shippingStatus === "DELIVERED" ? "DELIVERED" : (last?.outcome ?? null),
        reason: last?.outcome === "FAILED" ? last.reason : null,
      };
    }),
  });
}
