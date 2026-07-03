export type SaleCalcItemInput = {
  id: string;
  cantidad: number;
  costoUnitario: number;
};

export type SaleCalcConfig = {
  envio: number;
  picking: number;
  comisionPct: number;
  margenPct: number;
  campanaPct: number;
};

export type SaleCalcSummary = {
  subtotal: number;
  precioBase: number;
  comision: number;
  campana: number;
  envio: number;
  picking: number;
  total: number;
  precioFinal: number;
};

const MAX_PCT = 99.99;

export function calcItemTotal(item: SaleCalcItemInput): number {
  return item.cantidad * item.costoUnitario;
}

export function calcSubtotal(items: SaleCalcItemInput[]): number {
  return items.reduce((sum, item) => sum + calcItemTotal(item), 0);
}

// Fuente única de verdad: usada por rutas API (servidor) y por el editor (cliente)
// para que el resumen mostrado siempre coincida con lo calculado en backend.
export function buildSaleCalculatorSummary(items: SaleCalcItemInput[], cfg: SaleCalcConfig): SaleCalcSummary {
  const subtotal = calcSubtotal(items);
  const margenFrac = Math.min(Math.max(cfg.margenPct, 0), MAX_PCT) / 100;
  const precioBase = subtotal / (1 - margenFrac);
  const comision = precioBase * (cfg.comisionPct / 100);
  const campana = precioBase * (cfg.campanaPct / 100);
  const total = precioBase + cfg.envio + cfg.picking + comision;
  const precioFinal = total + campana;
  return { subtotal, precioBase, comision, campana, envio: cfg.envio, picking: cfg.picking, total, precioFinal };
}

export function sanitizeSaleCalcNumber(value: number, opts?: { min?: number; max?: number; integer?: boolean }): number {
  const min = opts?.min ?? 0;
  const max = opts?.max ?? 999_999_999;
  if (!Number.isFinite(value)) return min;
  let n = opts?.integer ? Math.round(value) : value;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}

export function sanitizePct(value: number): number {
  return sanitizeSaleCalcNumber(value, { min: 0, max: MAX_PCT });
}
