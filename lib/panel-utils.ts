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
  presupuestoPublicidad: number;
  ventaDelDia: number;
};

export type CampaignDailyRow = CampaignDailyInput & {
  kpiMensajes: number;   // transacciones / mensajes
  kpiConversion: number; // ventaDelDia / presupuestoPublicidad
  metaDiaria: number;    // presupuestoPublicidad * 10
  ventaAcumulada: number; // venta del día (columna "Venta acumulada" muestra el total en el pie)
};

export type CampaignDailyTotals = {
  totalMensajes: number;
  totalTransacciones: number;
  totalInversion: number;
  totalVentas: number;
  conversionGeneral: number; // totalTransacciones / totalMensajes
  roasPromedio: number;      // promedio kpiConversion de días con presupuesto > 0
};

function safeDiv(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : 0;
}

export function calcKpiMensajes(transacciones: number, mensajes: number): number {
  return safeDiv(transacciones, mensajes);
}

export function calcKpiConversion(ventaDelDia: number, presupuestoPublicidad: number): number {
  return safeDiv(ventaDelDia, presupuestoPublicidad);
}

export function calcMetaDiaria(presupuestoPublicidad: number): number {
  return Math.max(0, presupuestoPublicidad) * 10;
}

/** Ordena por fecha asc y calcula KPIs por fila. No persiste nada. */
export function buildCampaignDailyRows(entries: CampaignDailyInput[]): CampaignDailyRow[] {
  const sorted = [...entries].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
  return sorted.map((e) => ({
    ...e,
    kpiMensajes: calcKpiMensajes(e.transacciones, e.mensajes),
    kpiConversion: calcKpiConversion(e.ventaDelDia, e.presupuestoPublicidad),
    metaDiaria: calcMetaDiaria(e.presupuestoPublicidad),
    ventaAcumulada: e.ventaDelDia,
  }));
}

export function calcCampaignDailyTotals(entries: CampaignDailyInput[]): CampaignDailyTotals {
  const totalMensajes = entries.reduce((s, e) => s + (e.mensajes || 0), 0);
  const totalTransacciones = entries.reduce((s, e) => s + (e.transacciones || 0), 0);
  const totalInversion = entries.reduce((s, e) => s + (e.presupuestoPublicidad || 0), 0);
  const totalVentas = entries.reduce((s, e) => s + (e.ventaDelDia || 0), 0);
  const withBudget = entries.filter((e) => e.presupuestoPublicidad > 0);
  const roasPromedio = withBudget.length > 0
    ? withBudget.reduce((s, e) => s + calcKpiConversion(e.ventaDelDia, e.presupuestoPublicidad), 0) / withBudget.length
    : 0;

  return {
    totalMensajes,
    totalTransacciones,
    totalInversion,
    totalVentas,
    conversionGeneral: safeDiv(totalTransacciones, totalMensajes),
    roasPromedio,
  };
}
