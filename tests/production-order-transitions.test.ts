import assert from "node:assert/strict";
import test from "node:test";
import { assertProductionCanComplete, netAcceptedUnits } from "../lib/production-order-policy";

test("netAcceptedUnits descuenta dañadas y no conformes sin producir negativos", () => {
  assert.equal(netAcceptedUnits([{ produced: 100, damaged: 4, nonConforming: 6 }]), 90);
  assert.equal(netAcceptedUnits([{ produced: 3, damaged: 4, nonConforming: 2 }]), 0);
});

test("una orden no se completa sin corridas asociadas", () => {
  assert.throws(() => assertProductionCanComplete(10, []), /NO_PRODUCTION_RUNS/);
});

test("una orden no se completa con producción neta insuficiente", () => {
  assert.throws(() => assertProductionCanComplete(10, [{ produced: 12, damaged: 2, nonConforming: 1 }]), /INSUFFICIENT_PRODUCTION/);
});

test("una orden se puede completar con producción neta suficiente", () => {
  assert.doesNotThrow(() => assertProductionCanComplete(10, [{ produced: 12, damaged: 1, nonConforming: 1 }]));
});
