// Chequeo de las funciones puras de alertas y resumen de ruta: npx tsx scripts/check-logistics.ts
import assert from "node:assert/strict";
import { routeAlerts, summarizeRoute } from "../lib/tracking";

const now = new Date("2026-10-19T15:00:00Z");
const ago = (min: number) => new Date(now.getTime() - min * 60000);
const P = { lat: 4.65, lng: -74.07 };
const north = (m: number) => ({ lat: P.lat + m / 111000, lng: P.lng });
const at = (p: { lat: number; lng: number }, min: number) => ({ ...p, recordedAt: ago(min) });

// Sin posiciones: alerta solo si la ruta lleva >= 10 min iniciada.
assert.deepEqual(routeAlerts([], [], ago(3), now), []);
assert.equal(routeAlerts([], [], ago(12), now)[0].kind, "NO_SIGNAL");

// Última posición vieja = sin señal; reciente = no.
assert.equal(routeAlerts([at(P, 9)], [], ago(30), now)[0].kind, "NO_SIGNAL");
assert.deepEqual(routeAlerts([at(P, 1)], [], ago(30), now), []);

const farStop = [{ lat: north(5000).lat, lng: P.lng }];
const nearStop = [{ lat: north(60).lat, lng: P.lng }];
const parked = [at(north(0), 12), at(north(10), 8), at(north(5), 4), at(north(8), 1)]; // quieto ~12 min, dentro de 50 m
// Parado lejos de toda parada pendiente = detenido.
assert.equal(routeAlerts(parked, farStop, ago(40), now)[0].kind, "STOPPED");
// Parado junto a una parada pendiente = entregando, sin alerta.
assert.deepEqual(routeAlerts(parked, nearStop, ago(40), now), []);
// Sin paradas pendientes (ruta casi terminada) = sin alerta.
assert.deepEqual(routeAlerts(parked, [], ago(40), now), []);
// En movimiento (cada lectura a >50 m de la anterior) = sin alerta.
const moving = [at(north(0), 12), at(north(300), 9), at(north(600), 6), at(north(900), 3), at(north(1200), 1)];
assert.deepEqual(routeAlerts(moving, farStop, ago(40), now), []);
// Parado hace solo 3 min = todavía no.
assert.deepEqual(routeAlerts([at(north(0), 3), at(north(5), 1)], farStop, ago(40), now), []);

// Resumen: km solo con >= 2 posiciones, null si no hay GPS (no se inventa 0); duración en minutos.
const t = (min: number) => new Date(now.getTime() + min * 60000);
const s = summarizeRoute(
  [{ ...north(0), accuracy: 10, recordedAt: t(0) }, { ...north(1110), accuracy: 10, recordedAt: t(3) }, { ...north(2220), accuracy: 10, recordedAt: t(6) }],
  t(-10), t(60),
);
assert.equal(s.distanceKm, 2.2);
assert.equal(s.durationMin, 70);
assert.equal(summarizeRoute([], t(0), t(30)).distanceKm, null);
assert.equal(summarizeRoute([{ ...P, accuracy: 10, recordedAt: t(0) }], t(0), t(30)).distanceKm, null);
assert.equal(summarizeRoute([], null, t(30)).durationMin, null);

console.log("check-logistics: OK");
