import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { getShippingForLocation, getShippingOverride, formatShippingPrice, SHIPPING_RATES } from "../lib/shipping-rates";
import { verifyWompiEventSignature } from "../lib/wompi";
import { parsePriceValue, formatPrice } from "../lib/volume-discounts";
import { computeComboSavings } from "../lib/combos";

test("envío: Bogotá gratis y resto del país 12.000", () => {
  assert.equal(getShippingForLocation("Cundinamarca", "Bogotá").price, 0);
  assert.equal(getShippingForLocation("Cundinamarca", "Bogotá").zone, "bogota");
  assert.equal(getShippingForLocation("Antioquia", "Medellín").price, 12000);
  assert.equal(getShippingForLocation("Cundinamarca", "Soacha").price, 12000);
  assert.equal(SHIPPING_RATES.nacional.price, 12000);
});

test("envío: override por SKU+cantidad de packs", () => {
  assert.equal(getShippingOverride([{ sku: "TJER - 131", cantidad: 6 }]), 20000);
  assert.equal(getShippingOverride([{ sku: "TJER - 131", cantidad: 12 }]), 35000);
  assert.equal(getShippingOverride([{ sku: "TJER - 131", cantidad: 3 }]), null);
  assert.equal(getShippingOverride([{ sku: undefined, cantidad: 6 }]), null);
  assert.equal(
    getShippingOverride([{ sku: "TJER - 131", cantidad: 6 }, { sku: "RPFC - 055", cantidad: 12 }]),
    35000,
  );
});

test("formatShippingPrice distingue gratis de tarifa", () => {
  assert.equal(formatShippingPrice(0), "Gratis 🎉");
  assert.equal(formatShippingPrice(12000), "$ 12.000");
});

test("totales: parsePriceValue y formatPrice", () => {
  assert.equal(parsePriceValue("$ 12.000"), 12000);
  assert.equal(parsePriceValue(""), 0);
  assert.equal(parsePriceValue("1.234.567"), 1234567);
  assert.equal(formatPrice(12000), "$ 12.000");
});

test("combo: el ahorro nunca es negativo", () => {
  assert.deepEqual(computeComboSavings(100000, 80000), {
    normalTotal: 100000,
    comboPrice: 80000,
    savings: 20000,
    savingsPct: 20,
  });
  assert.equal(computeComboSavings(50000, 60000).savings, 0);
});

test("firma de Wompi: acepta la válida y rechaza la manipulada", () => {
  process.env.WOMPI_EVENTS_SECRET = "qa_events_secret";
  const payload = {
    event: "transaction.updated",
    data: { transaction: { id: "t1", status: "APPROVED", reference: "ref1", amount_in_cents: 2560000 } },
    signature: {
      checksum: "",
      properties: ["transaction.id", "transaction.status", "transaction.amount_in_cents"],
    },
    timestamp: 1700000000,
  };
  // Las propiedades son relativas a `data` (docs Wompi).
  const values = payload.signature.properties
    .map((p) =>
      p.split(".").reduce<unknown>((acc, k) => (acc as Record<string, unknown>)[k], payload.data),
    )
    .join("");
  // Wompi puede enviar el checksum en mayúsculas.
  payload.signature.checksum = createHash("sha256")
    .update(`${values}${payload.timestamp}${process.env.WOMPI_EVENTS_SECRET}`)
    .digest("hex")
    .toUpperCase();

  assert.equal(verifyWompiEventSignature(payload), true);
  payload.data.transaction.amount_in_cents = 1;
  assert.equal(verifyWompiEventSignature(payload), false);
});
