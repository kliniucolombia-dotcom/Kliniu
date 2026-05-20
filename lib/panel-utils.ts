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
