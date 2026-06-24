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
  "dispensador-antigoteo-de-liquidos-500ml": { unit: 49900, tiers: [{ min: 100, unitPrice: 22799 }, { min: 48, unitPrice: 27100 }, { min: 12, unitPrice: 31599 }] },
  "dispensador-antigoteo-de-liquidos-600ml": { unit: 49900, tiers: [{ min: 100, unitPrice: 22799 }, { min: 48, unitPrice: 27100 }, { min: 12, unitPrice: 31599 }] },
  "dispensador-antigoteo-doble-800-ml": { unit: 53899, tiers: [{ min: 100, unitPrice: 30399 }, { min: 48, unitPrice: 34999 }, { min: 12, unitPrice: 36900 }] },
  "dispensador-de-liquidos-1000-ml-abs": { unit: 59899, tiers: [{ min: 100, unitPrice: 33900 }, { min: 48, unitPrice: 36699 }, { min: 12, unitPrice: 40600 }] },
  "dispensador-antigoteo-de-liquidos-1000-ml": { unit: 58899, tiers: [{ min: 100, unitPrice: 30399 }, { min: 48, unitPrice: 35499 }, { min: 12, unitPrice: 39400 }] },
  "dispensador-de-liquidos-1000-ml-automatico": { unit: 139899, tiers: [{ min: 100, unitPrice: 104900 }, { min: 48, unitPrice: 109700 }, { min: 12, unitPrice: 114400 }] },
  "dispensador-de-jabon-1-litro-automatico": { unit: 139899, tiers: [{ min: 100, unitPrice: 104900 }, { min: 48, unitPrice: 109700 }, { min: 12, unitPrice: 114400 }] },
  "dispensador-racklin-soporte-plateado": { unit: 54899, tiers: [{ min: 100, unitPrice: 32000 }, { min: 48, unitPrice: 34399 }, { min: 12, unitPrice: 36200 }] },
  "dispensador-racklin-soporte-negro": { unit: 59899, tiers: [{ min: 100, unitPrice: 34400 }, { min: 48, unitPrice: 35700 }, { min: 12, unitPrice: 38599 }] },
  "dispensador-xpert-professional-para-jabon-liquido": { unit: 109899, tiers: [{ min: 100, unitPrice: 72800 }, { min: 48, unitPrice: 78799 }, { min: 12, unitPrice: 84499 }] },
  "dispensador-xpert-professional-para-jabon-espuma": { unit: 109899, tiers: [{ min: 100, unitPrice: 69299 }, { min: 48, unitPrice: 78799 }, { min: 12, unitPrice: 83300 }] },
  "dispensador-xpert-professional-para-jabon-liquido--frasco": { unit: 109899, tiers: [{ min: 100, unitPrice: 71600 }, { min: 48, unitPrice: 78799 }, { min: 12, unitPrice: 84499 }] },
  "dispensador-xpert-professional-para-jabon-espuma--frasco": { unit: 109899, tiers: [{ min: 100, unitPrice: 72800 }, { min: 48, unitPrice: 78799 }, { min: 12, unitPrice: 83300 }] },
  "dispensador-de-servilletas-napklin-blanco": { unit: 49899, tiers: [{ min: 100, unitPrice: 31199 }, { min: 48, unitPrice: 31799 }, { min: 12, unitPrice: 33799 }] },
  "dispensador-de-papel-higienico-hogar": { unit: 49899, tiers: [{ min: 100, unitPrice: 24000 }, { min: 48, unitPrice: 28300 }, { min: 12, unitPrice: 32100 }] },
  "dispensador-de-papel-higienico-institucional": { unit: 59899, tiers: [{ min: 100, unitPrice: 38900 }, { min: 48, unitPrice: 39700 }, { min: 12, unitPrice: 44099 }] },
  "dispensador-papel-higienico-institucional--metalico": { unit: 69899, tiers: [{ min: 100, unitPrice: 52000 }, { min: 48, unitPrice: 52099 }, { min: 12, unitPrice: 55199 }] },
  "dispensador-de-papel-higienico-institucional--metalico": { unit: 69899, tiers: [{ min: 100, unitPrice: 52000 }, { min: 48, unitPrice: 52099 }, { min: 12, unitPrice: 55199 }] },
  "dispensador-de-toalla-institucional": { unit: 56899, tiers: [{ min: 100, unitPrice: 34299 }, { min: 48, unitPrice: 37800 }, { min: 12, unitPrice: 41700 }] },
  "dispensador-de-toalla-institucional--metalico": { unit: 69899, tiers: [{ min: 100, unitPrice: 39999 }, { min: 48, unitPrice: 40199 }, { min: 12, unitPrice: 53600 }] },
  "dispensador-de-toallas-center-pull": { unit: 99900, tiers: [{ min: 100, unitPrice: 76299 }, { min: 48, unitPrice: 80699 }, { min: 12, unitPrice: 85800 }] },
  "dispensador-de-crema-dental-5-cepillos": { unit: 49899, tiers: [{ min: 100, unitPrice: 24000 }, { min: 48, unitPrice: 26799 }, { min: 12, unitPrice: 33300 }] },
  "dispensador-de-crema-dental-4-cepillos": { unit: 49899, tiers: [{ min: 100, unitPrice: 24000 }, { min: 48, unitPrice: 26799 }, { min: 12, unitPrice: 33300 }] },
  "dispensador-de-crema-dental-kids-2-cepillos": { unit: 44899, tiers: [{ min: 100, unitPrice: 18499 }, { min: 48, unitPrice: 23000 }, { min: 12, unitPrice: 26900 }] },
  "dispensador-de-crema-dental-plus-2-cepillos": { unit: 44899, tiers: [{ min: 100, unitPrice: 22999 }, { min: 48, unitPrice: 23000 }, { min: 12, unitPrice: 26900 }] },
  "organizador-de-maquinas-y-cepillos": { unit: 34000, tiers: [{ min: 100, unitPrice: 14699 }, { min: 48, unitPrice: 15800 }, { min: 12, unitPrice: 17899 }] },
  "dispensador-de-papel-en-acero-inoxidable": { unit: 115899, tiers: [{ min: 100, unitPrice: 86199 }, { min: 48, unitPrice: 90899 }, { min: 12, unitPrice: 97499 }] },
  "dispensador-de-toalla-en-acero-inoxidable": { unit: 115899, tiers: [{ min: 100, unitPrice: 86099 }, { min: 48, unitPrice: 90800 }, { min: 12, unitPrice: 97499 }] },
  "dispensador-de-toallas-luxury": { unit: 123300, tiers: [{ min: 100, unitPrice: 97999 }, { min: 48, unitPrice: 99899 }, { min: 12, unitPrice: 105400 }] },
  "dispensador-de-toallas-ecotowel": { unit: 97000, tiers: [{ min: 100, unitPrice: 74199 }, { min: 48, unitPrice: 76099 }, { min: 12, unitPrice: 79600 }] },
  "dispensador-de-toallas-en-rollo-autocorte": { unit: 288599, tiers: [{ min: 100, unitPrice: 253999 }, { min: 48, unitPrice: 264400 }, { min: 12, unitPrice: 270499 }] },
  "dispensador-de-toallas-en-rollo-de-palanca": { unit: 202900, tiers: [{ min: 100, unitPrice: 177999 }, { min: 48, unitPrice: 178399 }, { min: 12, unitPrice: 187199 }] },
  "dispensador-de-toallas-en-rollo-automatico-con-sensor": { unit: 326699, tiers: [{ min: 100, unitPrice: 295600 }, { min: 48, unitPrice: 300599 }, { min: 12, unitPrice: 303300 }] },
  "dispensador-de-jabon-en-acero-inoxidable-500-ml": { unit: 95899, tiers: [{ min: 100, unitPrice: 72000 }, { min: 48, unitPrice: 74299 }, { min: 12, unitPrice: 77999 }] },
  "dispensador-de-jabon-en-brass-500-ml": { unit: 151300, tiers: [{ min: 100, unitPrice: 119600 }, { min: 48, unitPrice: 125400 }, { min: 12, unitPrice: 131500 }] },
  "dispensador-de-jabon-en-acero-inoxidable-1000-ml": { unit: 124400, tiers: [{ min: 100, unitPrice: 89899 }, { min: 48, unitPrice: 96399 }, { min: 12, unitPrice: 102500 }] },
  "dispensador-de-espuma-en-acero-inoxidable-1200-ml": { unit: 139400, tiers: [{ min: 100, unitPrice: 107700 }, { min: 48, unitPrice: 113500 }, { min: 12, unitPrice: 119600 }] },
  "dispensador-de-jabon-en-acero-inoxidable-1300-ml": { unit: 139400, tiers: [{ min: 100, unitPrice: 102499 }, { min: 48, unitPrice: 113500 }, { min: 12, unitPrice: 119600 }] },
  "dispensador-de-jabon-codo-elbow-1000-ml": { unit: 127700, tiers: [{ min: 100, unitPrice: 96500 }, { min: 48, unitPrice: 102100 }, { min: 12, unitPrice: 106099 }] },
  "secador-de-manos-ak2618": { unit: 1089100, tiers: [{ min: 100, unitPrice: 1021699 }, { min: 48, unitPrice: 1048700 }, { min: 12, unitPrice: 1063000 }] },
  "dispensador-deco-klin-flotante-antivandalico": { unit: 54899, tiers: [{ min: 100, unitPrice: 24400 }, { min: 48, unitPrice: 30599 }, { min: 12, unitPrice: 35000 }] },
  "dispensador-deco-klin-con-repisa-antivandalico": { unit: 57699, tiers: [{ min: 100, unitPrice: 26800 }, { min: 48, unitPrice: 30999 }, { min: 12, unitPrice: 31100 }] },
};

const BASE = "https://yotsdpjfnsrejtoufkuu.supabase.co/storage/v1/object/public/product-images/products";
const XPERT_IMG_FRASCO = `${BASE}/1782315480220-xpert-frasco-contenedor.webp`;
const XPERT_IMG_BOLSA  = `${BASE}/1782315480220-xpert-bolsa.webp`;

const PAPEL_INST_BLANCO_METALICO  = `${BASE}/papel-inst-blanco-metalico.png`;
const PAPEL_INST_NEGRO_METALICO   = `${BASE}/papel-inst-negro-metalico.png`;
const PAPEL_INST_BLANCO_PLASTICO  = `${BASE}/papel-inst-blanco-plastico.png`;
const TOALLA_CZ_BLANCO_METALICO   = `${BASE}/toalla-cz-blanco-metalico.png`;
const TOALLA_CZ_NEGRO_METALICO    = `${BASE}/toalla-cz-negro-metalico.png`;
const TOALLA_CZ_BLANCO_PLASTICO   = `${BASE}/toalla-cz-blanco-plastico.png`;

export const TIPO_VARIANTES: Record<string, { label: string; slugSuffix: string; image?: string }[]> = {
  "dispensador-xpert-professional-para-jabon-espuma": [
    { label: "Bolsa", slugSuffix: "", image: XPERT_IMG_BOLSA },
    { label: "Contenedor", slugSuffix: "--frasco", image: XPERT_IMG_FRASCO },
  ],
  "dispensador-xpert-professional-para-jabon-liquido": [
    { label: "Bolsa", slugSuffix: "", image: XPERT_IMG_BOLSA },
    { label: "Contenedor", slugSuffix: "--frasco", image: XPERT_IMG_FRASCO },
  ],
  "dispensador-papel-higienico-institucional": [
    { label: "Cierre Plástico", slugSuffix: "", image: PAPEL_INST_BLANCO_PLASTICO },
    { label: "Cierre Metálico", slugSuffix: "--metalico", image: PAPEL_INST_BLANCO_METALICO },
  ],
  "dispensador-de-papel-higienico-institucional": [
    { label: "Cierre Plástico", slugSuffix: "", image: PAPEL_INST_BLANCO_PLASTICO },
    { label: "Cierre Metálico", slugSuffix: "--metalico", image: PAPEL_INST_BLANCO_METALICO },
  ],
  "dispensador-de-toalla-institucional": [
    { label: "Cierre Plástico", slugSuffix: "", image: TOALLA_CZ_BLANCO_PLASTICO },
    { label: "Cierre Metálico", slugSuffix: "--metalico", image: TOALLA_CZ_BLANCO_METALICO },
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
