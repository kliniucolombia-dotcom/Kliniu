import { hasValidCronSecret } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { listRoutes } from "@/lib/logistics";
import { createNotification } from "@/lib/notifications";

export const maxDuration = 60;

const REPEAT_MIN = 30; // no repetir la misma alerta de la misma ruta antes de este tiempo
const bogotaDay = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });

// Avisa a logística cuando una ruta en curso queda "Sin señal" o "Detenido" (las mismas alertas que muestra el panel).
// ponytail: la ruta en curso se busca en los últimos 2 días; una ruta abierta más tiempo no genera alertas.
export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) return Response.json({ error: "No autorizado" }, { status: 401 });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 503 });

  const routes = (await listRoutes(bogotaDay(-2), bogotaDay(0))).filter((r) => r.alerts.length > 0);
  if (routes.length === 0) return Response.json({ checked: 0, notified: 0 });

  const recent = await prisma.notification.findMany({
    where: { category: "route_alert", createdAt: { gte: new Date(Date.now() - REPEAT_MIN * 60000) } },
    select: { metadata: true },
  });
  const sent = new Set(recent.map((n) => { const m = n.metadata as { routeId?: string; kind?: string } | null; return `${m?.routeId}:${m?.kind}`; }));

  let notified = 0;
  for (const r of routes) {
    for (const a of r.alerts) {
      if (sent.has(`${r.id}:${a.kind}`)) continue;
      const who = `${r.driver.fullName} · ${r.vehicle.plate}`;
      await createNotification({
        eventKey: "logistics.route_alert",
        title: a.kind === "NO_SIGNAL" ? `Ruta sin señal · ${who}` : `Vehículo detenido · ${who}`,
        detail: a.kind === "NO_SIGNAL" ? `Sin posición GPS hace ${a.sinceMin} min` : `Detenido hace ${a.sinceMin} min fuera de una parada`,
        href: "/panel/logistica",
        metadata: { routeId: r.id, kind: a.kind },
      });
      notified++;
    }
  }
  return Response.json({ checked: routes.length, notified });
}
