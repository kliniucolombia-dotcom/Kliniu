// Fórmulas basadas en "Planillas Diarias de Inyecciones.xlsx" (hoja PLANILLA DIRIA).
// Se corrigió una inconsistencia de digitación manual detectada en la fila 15 del original (ver specs/production.md).

export const CYCLE_UNITS = ["seconds", "minutes"] as const;
export type CycleUnit = (typeof CYCLE_UNITS)[number];

export const TEMPERATURE_TYPES = ["simple", "zones"] as const;
export type TemperatureType = (typeof TEMPERATURE_TYPES)[number];

export const COUPLING_STATUSES = ["completed", "na"] as const;
export type CouplingStatus = (typeof COUPLING_STATUSES)[number];

export type TemperatureZone = { label: string; value: number };

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
  return Math.max(input.produced - input.damaged - input.nonConforming, 0);
}

export function calcQualityPercentage(input: ProductionRunInput): number {
  if (input.produced === 0) return 0;
  const goodPieces = calcGoodPieces(input);
  const pct = (goodPieces / input.produced) * 100;
  if (!Number.isFinite(pct)) return 0;
  return pct;
}

export function buildProductionSummary(input: ProductionRunInput): ProductionSummary {
  return {
    goodPieces: calcGoodPieces(input),
    qualityPercentage: calcQualityPercentage(input),
  };
}

export type ProductionEfficiency = {
  /** Minutos transcurridos entre hora de inicio y hora final. */
  durationMinutes: number;
  /** Piezas que deberían salir en ese tiempo según el ciclo (sin paradas). */
  expectedPieces: number;
  /** Producidas / esperadas × 100. `null` si no hay ciclo válido. */
  efficiencyPercentage: number | null;
};

/**
 * Eficiencia teórica de una corrida: con el ciclo por pieza y el tiempo
 * transcurrido, estima cuántas piezas debieron salir y qué tan cerca estuvo el
 * operario de ese objetivo. Es una referencia, no incluye paradas reales.
 */
export function calcProductionEfficiency(input: {
  produced: number;
  startTime: string | Date;
  endTime: string | Date;
  cycle: number;
  cycleUnit: string;
}): ProductionEfficiency {
  const durationMs = new Date(input.endTime).getTime() - new Date(input.startTime).getTime();
  const durationSeconds = Number.isFinite(durationMs) ? Math.max(durationMs / 1000, 0) : 0;
  const cycleSeconds = input.cycleUnit === "minutes" ? input.cycle * 60 : input.cycle;
  const expectedPieces = cycleSeconds > 0 ? Math.floor(durationSeconds / cycleSeconds) : 0;
  const efficiencyPercentage = expectedPieces > 0 ? (input.produced / expectedPieces) * 100 : null;
  return { durationMinutes: durationSeconds / 60, expectedPieces, efficiencyPercentage };
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
