export type Pos = { lat: number; lng: number; accuracy: number | null; recordedAt: Date | string };

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Km recorridos sumando tramos entre posiciones. Descarta lecturas imprecisas (>100 m) y saltos imposibles (>150 km/h). */
export function trackDistanceKm(positions: Pos[]) {
  const good = positions.filter((p) => p.accuracy == null || p.accuracy <= 100);
  let km = 0;
  for (let i = 1; i < good.length; i++) {
    const d = haversineKm(good[i - 1], good[i]);
    const hours = (new Date(good[i].recordedAt).getTime() - new Date(good[i - 1].recordedAt).getTime()) / 3_600_000;
    if (hours > 0 && d / hours <= 150) km += d;
  }
  return Math.round(km * 10) / 10;
}

// ── Alertas de ruta en curso (se calculan al leer; no hay cron) ──────────────────────────────
const NO_SIGNAL_MIN = 5; // última posición más vieja que esto = sin señal
const NO_SIGNAL_FROM_START_MIN = 10; // ruta iniciada y aún sin ninguna posición
const STOPPED_MIN = 8; // quieto dentro de STOPPED_RADIUS_M durante al menos esto
const STOPPED_RADIUS_M = 50;
const NEAR_STOP_M = 150; // parado junto a una parada pendiente es normal (está entregando)

export type RouteAlert = { kind: "NO_SIGNAL" | "STOPPED"; sinceMin: number };
type Stamped = { lat: number; lng: number; recordedAt: Date | string };

const minutes = (from: Date | string, to: Date) => Math.max(0, Math.round((to.getTime() - new Date(from).getTime()) / 60000));

/** `positions` en orden ascendente (las más recientes al final). */
export function routeAlerts(
  positions: Stamped[],
  pendingStops: { lat: number | null; lng: number | null }[],
  startedAt: Date | null,
  now: Date,
): RouteAlert[] {
  const last = positions[positions.length - 1];
  if (!last) {
    return startedAt && minutes(startedAt, now) >= NO_SIGNAL_FROM_START_MIN ? [{ kind: "NO_SIGNAL", sinceMin: minutes(startedAt, now) }] : [];
  }
  if (minutes(last.recordedAt, now) >= NO_SIGNAL_MIN) return [{ kind: "NO_SIGNAL", sinceMin: minutes(last.recordedAt, now) }];

  if (pendingStops.length === 0) return [];
  const nearStop = pendingStops.some((s) => s.lat != null && s.lng != null && haversineKm(last, { lat: s.lat, lng: s.lng }) * 1000 <= NEAR_STOP_M);
  if (nearStop) return [];

  // Racimo de posiciones consecutivas (hacia atrás) que siguen dentro del radio de la última.
  let first = positions.length - 1;
  while (first > 0 && haversineKm(positions[first - 1], last) * 1000 <= STOPPED_RADIUS_M) first--;
  const stoppedMin = minutes(positions[first].recordedAt, now);
  return first < positions.length - 1 && stoppedMin >= STOPPED_MIN ? [{ kind: "STOPPED", sinceMin: stoppedMin }] : [];
}

/** Resumen permanente de una ruta finalizada. `distanceKm` es null si no hubo GPS suficiente (no se inventa 0). */
export function summarizeRoute(positions: Pos[], startedAt: Date | null, finishedAt: Date) {
  return {
    distanceKm: positions.length >= 2 ? trackDistanceKm(positions) : null,
    durationMin: startedAt ? minutes(startedAt, finishedAt) : null,
  };
}
