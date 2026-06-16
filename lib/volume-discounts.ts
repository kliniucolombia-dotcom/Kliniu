export const VOLUME_DISCOUNT_TIERS = [
  { min: 100, pct: 12 },
  { min: 48, pct: 10 },
  { min: 12, pct: 8 },
  { min: 1, pct: 0 },
];

export const PRODUCT_VOLUME_PRICES: Record<
  string,
  { unit: number; tiers: { min: number; unitPrice: number }[] }
> = {
  "dispensador-de-espuma-en-acero-inoxidable-1200-ml": { unit: 139435, tiers: [{ min: 100, unitPrice: 107728.5 }, { min: 48, unitPrice: 113533.125 }, { min: 12, unitPrice: 119636 }] },
  "dispensador-de-jabon-en-acero-inoxidable-500-ml": { unit: 95898.85, tiers: [{ min: 100, unitPrice: 72028.5 }, { min: 48, unitPrice: 74263.125 }, { min: 12, unitPrice: 77986 }] },
  "dispensador-de-jabon-en-brass-500-ml": { unit: 151335, tiers: [{ min: 100, unitPrice: 119628.5 }, { min: 48, unitPrice: 125433.125 }, { min: 12, unitPrice: 131536 }] },
  "dispensador-de-liquidos-1000-ml-automatico": { unit: 139899.1, tiers: [{ min: 100, unitPrice: 104910 }, { min: 48, unitPrice: 109725.125 }, { min: 12, unitPrice: 114400 }] },
  "dispensador-de-jabon-1-litro-automatico": { unit: 139899, tiers: [{ min: 100, unitPrice: 104910 }, { min: 48, unitPrice: 109725 }, { min: 12, unitPrice: 114400 }] },
  "dispensador-de-toallas-en-rollo-autocorte": { unit: 288591, tiers: [{ min: 100, unitPrice: 253981 }, { min: 48, unitPrice: 264446.4 }, { min: 12, unitPrice: 270491 }] },
  "dispensador-de-toallas-en-rollo-automatico-con-sensor": { unit: 326671, tiers: [{ min: 100, unitPrice: 295631 }, { min: 48, unitPrice: 300551 }, { min: 12, unitPrice: 303335 }] },
  "dispensador-de-toallas-luxury": { unit: 123310.5, tiers: [{ min: 100, unitPrice: 97956 }, { min: 48, unitPrice: 99852.083333 }, { min: 12, unitPrice: 105435 }] },
  "dispensador-antigoteo-de-liquidos-1000-ml": { unit: 58899.37, tiers: [{ min: 100, unitPrice: 30378.5 }, { min: 48, unitPrice: 35469.125 }, { min: 12, unitPrice: 39430 }] },
  "dispensador-antigoteo-de-liquidos-500ml": { unit: 49908.92, tiers: [{ min: 100, unitPrice: 22762.5 }, { min: 48, unitPrice: 27139.125 }, { min: 12, unitPrice: 31576 }] },
  "dispensador-antigoteo-de-liquidos-600ml": { unit: 49909, tiers: [{ min: 100, unitPrice: 22762.5 }, { min: 48, unitPrice: 27139.125 }, { min: 12, unitPrice: 31576 }] },
  "dispensador-antigoteo-doble-800-ml": { unit: 53898.99, tiers: [{ min: 100, unitPrice: 30378.5 }, { min: 48, unitPrice: 34993.125 }, { min: 12, unitPrice: 36931 }] },
  "dispensador-de-crema-dental-4-cepillos": { unit: 49899.4, tiers: [{ min: 100, unitPrice: 24038 }, { min: 48, unitPrice: 26775 }, { min: 12, unitPrice: 33321 }] },
  "dispensador-de-crema-dental-5-cepillos": { unit: 49899.4, tiers: [{ min: 100, unitPrice: 24038 }, { min: 48, unitPrice: 26775 }, { min: 12, unitPrice: 33321 }] },
  "dispensador-de-crema-dental-kids-2-cepillos": { unit: 44863.32, tiers: [{ min: 100, unitPrice: 18478.5 }, { min: 48, unitPrice: 23001.708333 }, { min: 12, unitPrice: 26916.833333 }] },
  "dispensador-de-crema-dental-plus-2-cepillos": { unit: 44863.32, tiers: [{ min: 100, unitPrice: 23238.5 }, { min: 48, unitPrice: 23001.708333 }, { min: 12, unitPrice: 26916.833333 }] },
  "dispensador-de-jabon-codo-elbow-1000-ml": { unit: 127713.5, tiers: [{ min: 100, unitPrice: 96509 }, { min: 48, unitPrice: 102109.125 }, { min: 12, unitPrice: 106070 }] },
  "dispensador-de-jabon-en-acero-inoxidable-1000-ml": { unit: 124441, tiers: [{ min: 100, unitPrice: 89878.5 }, { min: 48, unitPrice: 96397.125 }, { min: 12, unitPrice: 102500 }] },
  "dispensador-de-jabon-en-acero-inoxidable-1300-ml": { unit: 139435, tiers: [{ min: 100, unitPrice: 102459 }, { min: 48, unitPrice: 113533.125 }, { min: 12, unitPrice: 119636 }] },
  "dispensador-de-liquidos-1000-ml-abs": { unit: 59898.97, tiers: [{ min: 100, unitPrice: 33948.5 }, { min: 48, unitPrice: 36659.125 }, { min: 12, unitPrice: 40620 }] },
  "dispensador-de-papel-en-acero-inoxidable": { unit: 115899.18, tiers: [{ min: 100, unitPrice: 86156 }, { min: 48, unitPrice: 90866.416667 }, { min: 12, unitPrice: 97462 }] },
  "dispensador-de-papel-higienico-hogar": { unit: 49899.4, tiers: [{ min: 100, unitPrice: 24038 }, { min: 48, unitPrice: 28332.291667 }, { min: 12, unitPrice: 32131 }] },
  "dispensador-de-papel-higienico-institucional": { unit: 59898.97, tiers: [{ min: 100, unitPrice: 38913 }, { min: 48, unitPrice: 39716.25 }, { min: 12, unitPrice: 44091 }] },
  "dispensador-de-servilletas-napklin-blanco": { unit: 49899.4, tiers: [{ min: 100, unitPrice: 31178 }, { min: 48, unitPrice: 31773.4 }, { min: 12, unitPrice: 33797 }] },
  "dispensador-de-toalla-en-acero-inoxidable": { unit: 115899.18, tiers: [{ min: 100, unitPrice: 86056 }, { min: 48, unitPrice: 90808.083333 }, { min: 12, unitPrice: 97462 }] },
  "dispensador-de-toalla-institucional": { unit: 56898.98, tiers: [{ min: 100, unitPrice: 34272 }, { min: 48, unitPrice: 37812.25 }, { min: 12, unitPrice: 41711 }] },
  "dispensador-de-toallas-center-pull": { unit: 99900.82, tiers: [{ min: 100, unitPrice: 76279 }, { min: 48, unitPrice: 80691.916667 }, { min: 12, unitPrice: 85801.666667 }] },
  "dispensador-de-toallas-ecotowel": { unit: 97011.5, tiers: [{ min: 100, unitPrice: 74156 }, { min: 48, unitPrice: 76052.083333 }, { min: 12, unitPrice: 79612 }] },
  "dispensador-de-toallas-en-rollo-de-palanca": { unit: 202911, tiers: [{ min: 100, unitPrice: 182581 }, { min: 48, unitPrice: 178399.88 }, { min: 12, unitPrice: 187191 }] },
  "dispensador-racklin-soporte-negro": { unit: 59898.97, tiers: [{ min: 100, unitPrice: 34424.5 }, { min: 48, unitPrice: 34633.75 }, { min: 12, unitPrice: 38583 }] },
  "dispensador-racklin-soporte-plateado": { unit: 54899.78, tiers: [{ min: 100, unitPrice: 32044.5 }, { min: 48, unitPrice: 34395.75 }, { min: 12, unitPrice: 36203 }] },
  "dispensador-xpert-professional-para-jabon-espuma": { unit: 109899.2, tiers: [{ min: 100, unitPrice: 69258 }, { min: 48, unitPrice: 78788.291667 }, { min: 12, unitPrice: 83301 }] },
  "dispensador-xpert-professional-para-jabon-espuma--frasco": { unit: 109899.2, tiers: [{ min: 100, unitPrice: 72828 }, { min: 48, unitPrice: 78788.291667 }, { min: 12, unitPrice: 83301 }] },
  "dispensador-xpert-professional-para-jabon-liquido": { unit: 109899.2, tiers: [{ min: 100, unitPrice: 72828 }, { min: 48, unitPrice: 78788.291667 }, { min: 12, unitPrice: 84491 }] },
  "dispensador-xpert-professional-para-jabon-liquido--frasco": { unit: 109899.2, tiers: [{ min: 100, unitPrice: 71638 }, { min: 48, unitPrice: 78788.291667 }, { min: 12, unitPrice: 84491 }] },
  "organizador-de-maquinas-y-cepillos": { unit: 34001, tiers: [{ min: 100, unitPrice: 14696.5 }, { min: 48, unitPrice: 15817.083333 }, { min: 12, unitPrice: 17891 }] },
  "secador-de-manos-ak2618": { unit: 1089104, tiers: [{ min: 100, unitPrice: 1021650 }, { min: 48, unitPrice: 1048704 }, { min: 12, unitPrice: 1063031 }] },
};

const XPERT_IMG_FRASCO = "https://yotsdpjfnsrejtoufkuu.supabase.co/storage/v1/object/public/product-images/products/17816203903N-xpert-frasco-contenedor.jpeg";
const XPERT_IMG_BOLSA  = "https://yotsdpjfnsrejtoufkuu.supabase.co/storage/v1/object/public/product-images/products/17816203903N-xpert-bolsa.jpeg";

export const TIPO_VARIANTES: Record<string, { label: string; slugSuffix: string; image?: string }[]> = {
  "dispensador-xpert-professional-para-jabon-espuma": [
    { label: "Bolsa", slugSuffix: "", image: XPERT_IMG_BOLSA },
    { label: "Frasco", slugSuffix: "--frasco", image: XPERT_IMG_FRASCO },
  ],
  "dispensador-xpert-professional-para-jabon-liquido": [
    { label: "Bolsa", slugSuffix: "", image: XPERT_IMG_BOLSA },
    { label: "Frasco", slugSuffix: "--frasco", image: XPERT_IMG_FRASCO },
  ],
};

export function parsePriceValue(price: string): number {
  return parseInt(price.replace(/[^\d]/g, ""), 10) || 0;
}

export function formatPrice(value: number): string {
  return "$ " + Math.round(value).toLocaleString("es-CO");
}

export function getVolumeDiscount(quantity: number) {
  return VOLUME_DISCOUNT_TIERS.find((tier) => quantity >= tier.min) ?? VOLUME_DISCOUNT_TIERS.at(-1)!;
}

export function getVolumePricing(
  price: string,
  quantity: number,
  productSlug?: string,
  preciosPorCantidad?: { cantidad: number; precioUnitario: number }[],
) {
  // Primary source: preciosPorCantidad from catalog
  if (preciosPorCantidad && preciosPorCantidad.length > 0) {
    const x1 = preciosPorCantidad.find((t) => t.cantidad === 1);
    const baseUnitPrice = x1?.precioUnitario ?? parsePriceValue(price);
    // Find the highest matching tier (exact match on cantidad for pack buttons)
    const match = [...preciosPorCantidad]
      .sort((a, b) => b.cantidad - a.cantidad)
      .find((t) => quantity >= t.cantidad);

    if (match) {
      const discountedUnitPrice = match.precioUnitario;
      const total = discountedUnitPrice * quantity;
      const pct = Math.max(
        0,
        Math.round(((baseUnitPrice - discountedUnitPrice) / baseUnitPrice) * 100),
      );
      return {
        tier: { min: match.cantidad, pct },
        baseUnitPrice,
        discountedUnitPrice,
        unitPriceLabel: formatPrice(discountedUnitPrice),
        totalLabel: formatPrice(total),
        hasDiscount: match.cantidad > 1,
      };
    }
  }

  // Fallback: PRODUCT_VOLUME_PRICES (legacy slugs)
  const exactPricing = productSlug ? PRODUCT_VOLUME_PRICES[productSlug] : undefined;
  const baseUnitPrice = exactPricing?.unit ?? parsePriceValue(price);
  const exactTier = exactPricing?.tiers.find((item) => quantity >= item.min);

  if (exactTier) {
    const discountedUnitPrice = exactTier.unitPrice;
    const total = discountedUnitPrice * quantity;
    const pct = Math.max(
      0,
      Math.round(((baseUnitPrice - discountedUnitPrice) / baseUnitPrice) * 100),
    );
    return {
      tier: { min: exactTier.min, pct },
      baseUnitPrice,
      discountedUnitPrice,
      unitPriceLabel: formatPrice(discountedUnitPrice),
      totalLabel: formatPrice(total),
      hasDiscount: true,
    };
  }

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
