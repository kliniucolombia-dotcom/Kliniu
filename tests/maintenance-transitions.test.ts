import assert from "node:assert/strict";
import test from "node:test";
import { assertMaintenanceTransition, nextMaintenanceNumber } from "../lib/maintenance-policy";

test("nextMaintenanceNumber incrementa números MT", () => {
  assert.equal(nextMaintenanceNumber(null), "MT-0001");
  assert.equal(nextMaintenanceNumber("MT-0099"), "MT-0100");
});

test("mantenimiento solo permite transiciones válidas", () => {
  assert.doesNotThrow(() => assertMaintenanceTransition("PENDING", "IN_PROGRESS"));
  assert.doesNotThrow(() => assertMaintenanceTransition("IN_PROGRESS", "DONE"));
  assert.doesNotThrow(() => assertMaintenanceTransition("PENDING", "CANCELLED"));
  assert.throws(() => assertMaintenanceTransition("PENDING", "DONE"), /INVALID_TRANSITION/);
  assert.throws(() => assertMaintenanceTransition("DONE", "CANCELLED"), /INVALID_TRANSITION/);
});
