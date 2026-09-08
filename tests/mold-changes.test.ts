import assert from "node:assert/strict";
import test from "node:test";
import { assertDirectMoldStatusChange } from "../lib/mold-policy";

test("IN_USE no puede asignarse desde la edición genérica", () => {
  assert.throws(() => assertDirectMoldStatusChange("AVAILABLE", "IN_USE", false), /MOUNT_REQUIRED/);
});

test("un molde montado no puede entrar a mantenimiento", () => {
  assert.throws(() => assertDirectMoldStatusChange("IN_USE", "MAINTENANCE", true), /MOLD_MOUNTED/);
});

test("disponible y mantenimiento pueden alternarse sin montaje abierto", () => {
  assert.doesNotThrow(() => assertDirectMoldStatusChange("AVAILABLE", "MAINTENANCE", false));
  assert.doesNotThrow(() => assertDirectMoldStatusChange("MAINTENANCE", "AVAILABLE", false));
});
