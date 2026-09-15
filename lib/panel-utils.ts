// Pure calculation helpers — no server/Node.js imports, safe for client components

export function calcROAS(sales: number, investment: number): number {
  if (investment <= 0) return 0;
  return sales / investment;
}

export function calcCompliance(sales: number, investment: number, target = 10): number {
  if (investment <= 0) return 0;
  const roas = calcROAS(sales, investment);
  return Math.min(200, Math.round((roas / target) * 100));
}

export type CampaignStatus = "excellent" | "acceptable" | "risk" | "bad" | "pending";

export function getCampaignStatus(roas: number): CampaignStatus {
  if (roas === 0) return "pending";
  if (roas >= 10) return "excellent";
  if (roas >= 7) return "acceptable";
  if (roas >= 4) return "risk";
  return "bad";
}

export const STATUS_META: Record<CampaignStatus, { label: string; color: string; bg: string }> = {
  excellent:  { label: "Excelente",     color: "#16A34A", bg: "#DCFCE7" },
  acceptable: { label: "Aceptable",     color: "#D97706", bg: "#FEF3C7" },
  risk:       { label: "Riesgo",        color: "#EA580C", bg: "#FFEDD5" },
  bad:        { label: "Mala campaña",  color: "#DC2626", bg: "#FEE2E2" },
  pending:    { label: "Sin datos",     color: "#6B7280", bg: "#F3F4F6" },
};

// ─── Matriz diaria de campaña (replica "matriz diaria plataforma.xlsx") ────

export type CampaignDailyInput = {
  id: string;
  fecha: string; // ISO date
  mensajes: number;
  transacciones: number;
  presupuestoPublicidad: number; // USD
  ventaDelDia: number; // COP
  trm: number; // COP por USD vigente la fecha
};

export type CampaignDailyRow = CampaignDailyInput & {
  kpiMensajes: number;    // transacciones / mensajes
  presupuestoCOP: number; // presupuestoPublicidad * trm
  kpiConversion: number;  // ventaDelDia (COP) / presupuestoCOP — TOTAL VENDIDO / TOTAL INVERTIDO
  metaDiaria: number;     // presupuestoCOP * 10
  ventaAcumulada: number; // venta del día (columna "Venta acumulada" muestra el total en el pie)
};

export type CampaignDailyTotals = {
  totalMensajes: number;
  totalTransacciones: number;
  totalInversionUSD: number; // suma de presupuestos en USD
  totalInversion: number;    // suma de presupuestos convertida a COP
  totalVentas: number;       // suma de ventas en COP
  conversionGeneral: number; // totalTransacciones / totalMensajes
  kpiGeneral: number;        // totalVentas / totalInversion (misma moneda)
};

function safeDiv(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

export function calcKpiMensajes(transacciones: number, mensajes: number): number {
  return safeDiv(transacciones, mensajes);
}

/** Convierte el presupuesto en USD a pesos con la TRM de la fecha. */
export function calcPresupuestoCOP(presupuestoPublicidad: number, trm: number): number {
  return Math.max(0, presupuestoPublicidad || 0) * Math.max(0, trm || 0);
}

/** KPI = TOTAL VENDIDO / TOTAL INVERTIDO (ambos deben estar en la misma moneda). */
export function calcKpiConversion(ventaDelDia: number, presupuestoCOP: number): number {
  return safeDiv(ventaDelDia, presupuestoCOP);
}

export function calcMetaDiaria(presupuestoCOP: number): number {
  return Math.max(0, presupuestoCOP) * 10;
}

/** Ordena por fecha asc y calcula KPIs por fila. No persiste nada. */
export function buildCampaignDailyRows(entries: CampaignDailyInput[]): CampaignDailyRow[] {
  const sorted = [...entries].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  return sorted.map((e) => {
    const presupuestoCOP = calcPresupuestoCOP(e.presupuestoPublicidad, e.trm);
    return {
      ...e,
      kpiMensajes: calcKpiMensajes(e.transacciones, e.mensajes),
      presupuestoCOP,
      kpiConversion: calcKpiConversion(e.ventaDelDia, presupuestoCOP),
      metaDiaria: calcMetaDiaria(presupuestoCOP),
      ventaAcumulada: e.ventaDelDia,
    };
  });
}

export function calcCampaignDailyTotals(entries: CampaignDailyInput[]): CampaignDailyTotals {
  const totalMensajes = entries.reduce((s, e) => s + (e.mensajes || 0), 0);
  const totalTransacciones = entries.reduce((s, e) => s + (e.transacciones || 0), 0);
  const totalInversionUSD = entries.reduce((s, e) => s + (e.presupuestoPublicidad || 0), 0);
  const totalInversion = entries.reduce((s, e) => s + calcPresupuestoCOP(e.presupuestoPublicidad, e.trm), 0);
  const totalVentas = entries.reduce((s, e) => s + (e.ventaDelDia || 0), 0);

  return {
    totalMensajes,
    totalTransacciones,
    totalInversionUSD,
    totalInversion,
    totalVentas,
    conversionGeneral: safeDiv(totalTransacciones, totalMensajes),
    kpiGeneral: safeDiv(totalVentas, totalInversion),
  };
}
