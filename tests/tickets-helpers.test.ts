import assert from "node:assert/strict";
import test from "node:test";
import {
  bogotaMonthRange,
  growthPct,
  isTicketOverdue,
  sanitizeFieldsSchema,
  validateTicketExtraFields,
} from "../lib/tickets";

test("isTicketOverdue marca solo tickets abiertos con fecha pasada", () => {
  const now = new Date("2026-09-15T12:00:00.000Z");
  assert.equal(isTicketOverdue({ dueDate: "2026-09-10T12:00:00.000Z", status: "PENDIENTE" }, now), true);
  assert.equal(isTicketOverdue({ dueDate: "2026-09-20T12:00:00.000Z", status: "PENDIENTE" }, now), false);
  assert.equal(isTicketOverdue({ dueDate: "2026-09-10T12:00:00.000Z", status: "FINALIZADO" }, now), false);
  assert.equal(isTicketOverdue({ dueDate: "2026-09-10T12:00:00.000Z", status: "CANCELADO" }, now), false);
  assert.equal(isTicketOverdue({ dueDate: null, status: "PENDIENTE" }, now), false);
});

test("bogotaMonthRange devuelve el rango del mes en hora de Bogotá", () => {
  const { start, end } = bogotaMonthRange(new Date("2026-09-15T12:00:00.000Z"), 0);
  assert.equal(start.toISOString(), "2026-09-01T05:00:00.000Z");
  assert.equal(end.toISOString(), "2026-10-01T05:00:00.000Z");
});

test("bogotaMonthRange maneja el cambio de año con offset", () => {
  const { start, end } = bogotaMonthRange(new Date("2026-01-15T12:00:00.000Z"), -1);
  assert.equal(start.toISOString(), "2025-12-01T05:00:00.000Z");
  assert.equal(end.toISOString(), "2026-01-01T05:00:00.000Z");
});

test("growthPct calcula la variación y evita división por cero", () => {
  assert.equal(growthPct(10, 5), 100);
  assert.equal(growthPct(5, 10), -50);
  assert.equal(growthPct(0, 0), 0);
  assert.equal(growthPct(3, 0), null);
});

test("validateTicketExtraFields exige los campos obligatorios", () => {
  const schema = [
    { key: "color", label: "Color", type: "text", required: true },
    { key: "nota", label: "Nota", type: "text", required: false },
  ];
  assert.equal(validateTicketExtraFields(schema, { color: "Rojo" }), null);
  assert.equal(validateTicketExtraFields(schema, {}), 'El campo "Color" es obligatorio');
  assert.equal(validateTicketExtraFields(schema, { color: "   " }), 'El campo "Color" es obligatorio');
  assert.equal(validateTicketExtraFields(null, {}), null);
});

test("sanitizeFieldsSchema normaliza claves y tipos", () => {
  const result = sanitizeFieldsSchema([
    { key: "  Mi Campo  ", label: "Mi campo", type: "select", options: [" A ", "B", ""], required: true },
    { label: "Sin clave", type: "text" },
    { key: "raro", label: "Raro", type: "inventado" },
  ]);
  assert.deepEqual(result, [
    { key: "mi_campo", label: "Mi campo", type: "select", options: ["A", "B"], required: true },
    { key: "raro", label: "Raro", type: "text", options: undefined, required: false },
  ]);
});
