// Verifica que toda ciudad de la tienda tenga código DANE. Correr: npx tsx scripts/check-dane.ts
import assert from "node:assert";
import { ciudadesPorDepartamento } from "../lib/colombia-locations";
import { getCoordinadoraCityCode, getDaneCode } from "../lib/dane";

const missing: string[] = [];
for (const [dep, cities] of Object.entries(ciudadesPorDepartamento))
  for (const city of cities) if (!getDaneCode(dep, city)) missing.push(`${dep} / ${city}`);
assert.deepStrictEqual(missing, [], "ciudades sin código DANE");

assert.strictEqual(getCoordinadoraCityCode("Cundinamarca", "Bogotá"), "11001000");
assert.strictEqual(getDaneCode("antioquia", "MEDELLIN"), "05001");
assert.strictEqual(getDaneCode("Valle del Cauca", "Cali"), "76001");
assert.strictEqual(getDaneCode("Atlántico", "Ciudad Inventada"), null);
console.log("OK: todas las ciudades de la tienda tienen código DANE");
