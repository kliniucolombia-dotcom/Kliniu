import assert from "node:assert/strict";
import test from "node:test";
import {
  assertAssemblyEffort,
  assertAssemblyQuantities,
  buildAssemblySummary,
  calcGoodUnits,
  calcQualityPercentage,
  calcUnitsPerLaborHour,
} from "../lib/assembly-calculator";

test("las unidades buenas descuentan defectuosas y no conformes", () => {
  assert.equal(calcGoodUnits({ assembled: 100, defective: 5, nonConforming: 3 }), 92);
  assert.equal(calcGoodUnits({ assembled: 10, defective: 8, nonConforming: 5 }), 0);
});

test("el porcentaje de calidad no divide por cero", () => {
  assert.equal(calcQualityPercentage({ assembled: 200, defective: 10, nonConforming: 10 }), 90);
  assert.equal(calcQualityPercentage({ assembled: 0, defective: 0, nonConforming: 0 }), 0);
});

test("la productividad usa horas-hombre y tolera cero esfuerzo", () => {
  assert.equal(calcUnitsPerLaborHour({ assembled: 120, defective: 0, nonConforming: 0, workerCount: 3, laborHours: 8 }), 5);
  assert.equal(calcUnitsPerLaborHour({ assembled: 120, defective: 0, nonConforming: 0, workerCount: 0, laborHours: 8 }), 0);
  assert.equal(calcUnitsPerLaborHour({ assembled: 120, defective: 0, nonConforming: 0, workerCount: 3, laborHours: 0 }), 0);
});

test("buildAssemblySummary arma el resumen completo", () => {
  assert.deepEqual(
    buildAssemblySummary({ assembled: 100, defective: 10, nonConforming: 10, workerCount: 2, laborHours: 4 }),
    { goodUnits: 80, qualityPercentage: 80, unitsPerLaborHour: 10 },
  );
});

test("las cantidades rechazan descarte mayor que lo ensamblado", () => {
  assert.doesNotThrow(() => assertAssemblyQuantities({ assembled: 50, defective: 5, nonConforming: 5, reworked: 2 }));
  assert.throws(() => assertAssemblyQuantities({ assembled: 10, defective: 6, nonConforming: 6, reworked: 0 }), /SCRAP_EXCEEDS_ASSEMBLED/);
  assert.throws(() => assertAssemblyQuantities({ assembled: 10, defective: 0, nonConforming: 0, reworked: 11 }), /REWORK_EXCEEDS_ASSEMBLED/);
  assert.throws(() => assertAssemblyQuantities({ assembled: 0, defective: 0, nonConforming: 0, reworked: 0 }), /INVALID_QUANTITY/);
  assert.throws(() => assertAssemblyQuantities({ assembled: 10.5, defective: 0, nonConforming: 0, reworked: 0 }), /INVALID_QUANTITY/);
  assert.throws(() => assertAssemblyQuantities({ assembled: 10, defective: -1, nonConforming: 0, reworked: 0 }), /INVALID_QUANTITY/);
});

test("el esfuerzo exige al menos un operario y horas positivas", () => {
  assert.doesNotThrow(() => assertAssemblyEffort({ workerCount: 1, laborHours: 0.5 }));
  assert.throws(() => assertAssemblyEffort({ workerCount: 0, laborHours: 8 }), /INVALID_WORKER_COUNT/);
  assert.throws(() => assertAssemblyEffort({ workerCount: 2, laborHours: 0 }), /INVALID_LABOR_HOURS/);
  assert.throws(() => assertAssemblyEffort({ workerCount: 2, laborHours: Number.NaN }), /INVALID_LABOR_HOURS/);
});
