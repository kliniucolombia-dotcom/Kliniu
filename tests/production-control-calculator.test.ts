import assert from "node:assert/strict";
import test from "node:test";
import {
  blockEfficiencies,
  blockKey,
  overlapsPartially,
  standardMinutesOf,
  summarize,
  withinOwnWindow,
} from "../lib/production-control-calculator";

const at = (hhmm: string, day = "2026-05-15") => `${day}T${hhmm}:00.000Z`;
const entry = (start: string, end: string, standardSeconds: number, quantity: number, sharedBy = 1, operatorId = "op") => ({
  operatorId, startTime: at(start), endTime: at(end), standardSeconds, quantity, sharedBy,
});

test("fila real del Excel: ALEJANDRA 15-may 08:00–08:26 NAP-06 24 und → 1,046", () => {
  const s = summarize([entry("08:00", "08:26", 68, 24)]);
  assert.equal(s.registeredMinutes, 26);
  assert.ok(Math.abs(s.standardMinutes - 27.2) < 1e-9);
  assert.ok(Math.abs(s.efficiency! - 1.046153846) < 1e-6);
});

test("bloque multi-operación: HELVER JB5-04 + JB5-05 en el mismo rango cuenta los minutos una vez → 0,95", () => {
  const block = [entry("15:22", "16:20", 35, 57), entry("15:22", "16:20", 23, 57)];
  const s = summarize(block);
  assert.equal(s.registeredMinutes, 58);
  assert.equal(s.blocks, 1);
  assert.ok(Math.abs(s.efficiency! - 0.95) < 1e-9);
  // El Excel cargaba los 58 min a cada fila (0,57 y 0,38): aquí el bloque es uno solo.
  assert.equal(blockEfficiencies(block).size, 1);
});

test("dividir entre dos: sharedBy prorratea la cantidad", () => {
  assert.equal(standardMinutesOf({ standardSeconds: 60, quantity: 90, sharedBy: 2 }), 45);
  assert.equal(summarize([entry("14:00", "14:30", 60, 90, 2)]).efficiency, 1.5);
});

test("las indirectas (estándar 0) suman tiempo registrado pero no entran al indicador", () => {
  const s = summarize([entry("08:00", "09:00", 60, 60), entry("09:00", "09:30", 0, 0)]);
  assert.equal(s.registeredMinutes, 90);
  assert.equal(s.directMinutes, 60);
  assert.equal(s.efficiency, 1);
  assert.equal(summarize([entry("07:00", "07:30", 0, 0)]).efficiency, null);
  assert.equal(summarize([]).efficiency, null);
});

test("bloques de operarios distintos con la misma hora no se mezclan", () => {
  const a = entry("08:00", "09:00", 60, 60, 1, "a");
  const b = entry("08:00", "09:00", 60, 30, 1, "b");
  assert.notEqual(blockKey(a), blockKey(b));
  const s = summarize([a, b]);
  assert.equal(s.registeredMinutes, 120);
  assert.equal(s.efficiency, 0.75);
});

test("solapes: el borde que se toca y el mismo rango valen; el cruce parcial no", () => {
  const existing = [{ startTime: at("08:00"), endTime: at("08:26") }];
  assert.equal(overlapsPartially(existing, { startTime: at("08:26"), endTime: at("09:00") }), false);
  assert.equal(overlapsPartially(existing, { startTime: at("07:30"), endTime: at("08:00") }), false);
  assert.equal(overlapsPartially(existing, { startTime: at("08:00"), endTime: at("08:26") }), false);
  assert.equal(overlapsPartially(existing, { startTime: at("08:10"), endTime: at("08:40") }), true);
  assert.equal(overlapsPartially(existing, { startTime: at("07:00"), endTime: at("10:00") }), true);
  assert.equal(overlapsPartially(existing, { startTime: at("08:05"), endTime: at("08:20") }), true);
});

test("ventana del operario: hoy y 3 días atrás, nunca futuro", () => {
  assert.equal(withinOwnWindow("2026-09-28", "2026-09-28"), true);
  assert.equal(withinOwnWindow("2026-09-25", "2026-09-28"), true);
  assert.equal(withinOwnWindow("2026-09-24", "2026-09-28"), false);
  assert.equal(withinOwnWindow("2026-09-29", "2026-09-28"), false);
  assert.equal(withinOwnWindow("2026-02-27", "2026-03-02"), true);
});
