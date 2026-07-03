export type QuotationLineItem = {
  quantity: number;
  unitPrice: number;
};

export type QuotationTaxConfigInput = {
  reteIcaPct: number;
  reteFuentePct: number;
  ivaPct: number;
};

export type QuotationSummary = {
  subtotal: number;
  reteIca: number;
  reteFuente: number;
  iva: number;
  total: number;
};

export function calcLineTotal(item: QuotationLineItem): number {
  return item.quantity * item.unitPrice;
}

export function calcSubtotal(items: QuotationLineItem[]): number {
  return items.reduce((sum, item) => sum + calcLineTotal(item), 0);
}

export function calcReteIca(subtotal: number, cfg: QuotationTaxConfigInput): number {
  return subtotal * (cfg.reteIcaPct / 100);
}

export function calcReteFuente(subtotal: number, cfg: QuotationTaxConfigInput): number {
  return subtotal * (cfg.reteFuentePct / 100);
}

export function calcIVA(subtotal: number, cfg: QuotationTaxConfigInput): number {
  return subtotal * (cfg.ivaPct / 100);
}

export function calcTotal(subtotal: number, reteIca: number, reteFuente: number, iva: number): number {
  return subtotal - reteIca - reteFuente + iva;
}

// Fuente única de verdad: usada por API, frontend (preview en vivo) y PDF.
// Nunca se leen totales persistidos — todo se recalcula desde ítems + config vigente.
export function buildQuotationSummary(items: QuotationLineItem[], cfg: QuotationTaxConfigInput): QuotationSummary {
  const subtotal = calcSubtotal(items);
  const reteIca = calcReteIca(subtotal, cfg);
  const reteFuente = calcReteFuente(subtotal, cfg);
  const iva = calcIVA(subtotal, cfg);
  const total = calcTotal(subtotal, reteIca, reteFuente, iva);
  return { subtotal, reteIca, reteFuente, iva, total };
}
