import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { notifyIfNear } from "@/lib/delivery-notify";

const num = (v: unknown, min: number, max: number) => (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max ? v : null);

const MAX_BATCH = 100;
const MAX_AGE_MS = 6 * 3_600_000; // una cola más vieja que esto ya no sirve para el recorrido
const MAX_FUTURE_MS = 60_000;
const CLOCK_TOLERANCE_MS = 120_000;
const FRESH_FOR_NOTICE_MS = 2 * 60_000; // "Cerca" solo con lecturas recientes, nunca con una cola atrasada

// Acepta una posición suelta (formato original) o un lote { positions, sentAt } con `recordedAt` del teléfono.
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!prisma) return Response.json({ error: "No disponible" }, { status: 503 });
  const { token } = await params;
  if (!(await checkRateLimit(`conductor:${token}`, 20, 60_000))) {
    return Response.json({ error: "Demasiadas posiciones" }, { status: 429 });
  }

  const route = await prisma.deliveryRoute.findUnique({ where: { trackToken: token }, select: { id: true, status: true } });
  if (!route) return Response.json({ error: "Enlace inválido" }, { status: 404 });
  // Solo se registra mientras la ruta está en curso.
  if (route.status !== "IN_PROGRESS") return Response.json({ error: "La ruta no está en curso", status: route.status }, { status: 409 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const raw: Record<string, unknown>[] = Array.isArray(body?.positions)
    ? (body!.positions as unknown[]).slice(0, MAX_BATCH).filter((p): p is Record<string, unknown> => typeof p === "object" && p !== null)
    : body ? [body] : [];

  // El reloj del teléfono puede estar desfasado: se corrige con la diferencia entre "ahora" del servidor y `sentAt` del teléfono.
  const now = Date.now();
  const sentAt = num(body?.sentAt, 0, 8.64e15);
  // Reloj sano (< 2 min de desfase): se usa la hora tal cual, así un reintento del mismo lote cae en el mismo
  // instante y el índice único lo reconoce. Con desfase real se redondea a 10 s: la latencia de cada envío no
  // debe cambiar la hora guardada entre reintentos.
  const rawOffset = sentAt != null ? now - sentAt : 0;
  const offset = Math.abs(rawOffset) < CLOCK_TOLERANCE_MS ? 0 : Math.round(rawOffset / 10_000) * 10_000;

  const rows: { routeId: string; lat: number; lng: number; speed: number | null; accuracy: number | null; recordedAt: Date }[] = [];
  for (const p of raw) {
    const lat = num(p.lat, -90, 90);
    const lng = num(p.lng, -180, 180);
    if (lat == null || lng == null) continue;
    const at = num(p.recordedAt, 0, 8.64e15);
    const recordedAt = at != null ? at + offset : now;
    if (recordedAt > now + MAX_FUTURE_MS || recordedAt < now - MAX_AGE_MS) continue;
    rows.push({ routeId: route.id, lat, lng, speed: num(p.speed, 0, 400), accuracy: num(p.accuracy, 0, 100000), recordedAt: new Date(recordedAt) });
  }
  if (rows.length === 0) return Response.json({ error: "Coordenadas inválidas" }, { status: 400 });

  // skipDuplicates: reenviar un lote tras un corte de red no duplica posiciones (índice único routeId+recordedAt).
  const { count } = await prisma.vehiclePosition.createMany({ data: rows, skipDuplicates: true });
  broadcastPanelUpdate("logistics").catch(() => {});

  const newest = rows.reduce((a, b) => (b.recordedAt > a.recordedAt ? b : a));
  if (now - newest.recordedAt.getTime() <= FRESH_FOR_NOTICE_MS) {
    after(() => notifyIfNear(route.id, { lat: newest.lat, lng: newest.lng, accuracy: newest.accuracy }));
  }
  return Response.json({ ok: true, saved: count });
}
