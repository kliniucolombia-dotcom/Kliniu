export const VOLUME_DISCOUNT_TIERS = [
  { min: 1000, pct: 15 },
  { min: 100, pct: 8 },
  { min: 50, pct: 6 },
  { min: 12, pct: 5 },
  { min: 1, pct: 0 },
];

export function parsePriceValue(price: string): number {
  return parseInt(price.replace(/[^\d]/g, ""), 10) || 0;
}

export function formatPrice(value: number): string {
  return "$ " + Math.round(value).toLocaleString("es-CO");
}

export function getVolumeDiscount(quantity: number) {
  return VOLUME_DISCOUNT_TIERS.find((tier) => quantity >= tier.min) ?? VOLUME_DISCOUNT_TIERS.at(-1)!;
}

export function getVolumePricing(price: string, quantity: number) {
  const baseUnitPrice = parsePriceValue(price);
  const tier = getVolumeDiscount(quantity);
  const discountedUnitPrice = baseUnitPrice * (1 - tier.pct / 100);
  const total = discountedUnitPrice * quantity;

  return {
    tier,
    baseUnitPrice,
    discountedUnitPrice,
    unitPriceLabel: formatPrice(discountedUnitPrice),
    totalLabel: formatPrice(total),
    hasDiscount: tier.pct > 0,
  };
}
