import assert from "node:assert/strict";
import test from "node:test";
import {
  isRecord,
  parseBogotaCivilDate,
  parseIsoDateTime,
  parseNonNegativeNumber,
  parsePositiveInteger,
  parseDateRange,
  parseEnum,
  parseRequiredString,
  readJsonRecord,
} from "../lib/operations-validation";

test("parseBogotaCivilDate acepta una fecha civil real en Bogotá", () => {
  assert.equal(parseBogotaCivilDate("2026-09-08").toISOString(), "2026-09-08T05:00:00.000Z");
});

test("parseDateRange valida existencia y orden cronológico", () => {
  assert.doesNotThrow(() => parseDateRange("2026-09-01", "2026-09-08"));
  assert.throws(() => parseDateRange("2026-09-08", "2026-09-01"), /INVALID_DATE_RANGE/);
  assert.throws(() => parseDateRange("2026-02-30", "2026-09-01"), /INVALID_DATE/);
});

test("parseEnum y parseRequiredString rechazan valores fuera del contrato", () => {
  assert.equal(parseEnum("DONE", ["OPEN", "DONE"] as const), "DONE");
  assert.throws(() => parseEnum("OTHER", ["OPEN", "DONE"] as const), /INVALID_ENUM/);
  assert.equal(parseRequiredString("  dato  "), "dato");
  assert.throws(() => parseRequiredString("  "), /INVALID_STRING/);
});

test("readJsonRecord rechaza JSON inválido y cuerpos que no sean objetos", async () => {
  await assert.rejects(readJsonRecord(new Request("http://test", { method: "POST", body: "{" })), /INVALID_BODY/);
  await assert.rejects(readJsonRecord(new Request("http://test", { method: "POST", body: "[]" })), /INVALID_BODY/);
  assert.deepEqual(await readJsonRecord(new Request("http://test", { method: "POST", body: '{"ok":true}' })), { ok: true });
});

test("parseBogotaCivilDate rechaza fechas imposibles y formatos ambiguos", () => {
  for (const value of ["2026-02-30", "2026-13-01", "08/09/2026", "", null]) {
    assert.throws(() => parseBogotaCivilDate(value), /INVALID_DATE/);
  }
});

test("parseIsoDateTime acepta timestamps válidos y rechaza Invalid Date", () => {
  assert.equal(parseIsoDateTime("2026-09-08T10:30:00-05:00").toISOString(), "2026-09-08T15:30:00.000Z");
  for (const value of ["not-a-date", "", null]) {
    assert.throws(() => parseIsoDateTime(value), /INVALID_DATETIME/);
  }
});

test("parsePositiveInteger exige enteros estrictamente positivos", () => {
  assert.equal(parsePositiveInteger(3), 3);
  for (const value of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY, "3", null]) {
    assert.throws(() => parsePositiveInteger(value), /INVALID_NUMBER/);
  }
});

test("parseNonNegativeNumber acepta cero y rechaza valores no finitos o negativos", () => {
  assert.equal(parseNonNegativeNumber(0), 0);
  assert.equal(parseNonNegativeNumber(2.5), 2.5);
  for (const value of [-1, Number.NaN, Number.POSITIVE_INFINITY, "2", null]) {
    assert.throws(() => parseNonNegativeNumber(value), /INVALID_NUMBER/);
  }
});

test("isRecord solo acepta objetos JSON no nulos y no arreglos", () => {
  assert.equal(isRecord({ module: "MODULE_LOGISTICA" }), true);
  assert.equal(isRecord([]), false);
  assert.equal(isRecord(null), false);
  assert.equal(isRecord("value"), false);
});
