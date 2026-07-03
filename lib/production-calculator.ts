// Fórmulas basadas en "Planillas Diarias de Inyecciones.xlsx" (hoja PLANILLA DIRIA).
// Se corrigió una inconsistencia de digitación manual detectada en la fila 15 del original (ver specs/production.md).

export type ProductionRunInput = {
  produced: number;
  damaged: number;
  nonConforming: number;
};

export type ProductionSummary = {
  goodPieces: number;
  qualityPercentage: number;
};

export function calcGoodPieces(input: ProductionRunInput): number {
  return Math.max(input.produced - input.damaged, 0);
}

export function calcQualityPercentage(input: ProductionRunInput): number {
  if (input.produced === 0) return 0;
  const goodPieces = calcGoodPieces(input);
  const pct = ((goodPieces - input.nonConforming) / input.produced) * 100;
  if (!Number.isFinite(pct)) return 0;
  return pct;
}

export function buildProductionSummary(input: ProductionRunInput): ProductionSummary {
  return {
    goodPieces: calcGoodPieces(input),
    qualityPercentage: calcQualityPercentage(input),
  };
}

export function sanitizeProductionNumber(value: number, opts?: { min?: number; max?: number; integer?: boolean }): number {
  const min = opts?.min ?? 0;
  const max = opts?.max ?? 999_999_999;
  if (!Number.isFinite(value)) return min;
  let n = opts?.integer ? Math.round(value) : value;
  if (n < min) n = min;
  if (n > max) n = max;
  return n;
}
