// Fórmulas de la planta de ensamble. Espejo de lib/production-calculator.ts, pero
// aquí el descuento de no conformes entra en las unidades buenas: son las unidades
// que se suman a la bodega de producto terminado, así que no puede sobrar ninguna.

export type AssemblyRunInput = {
  assembled: number;
  defective: number;
  nonConforming: number;
};

export type AssemblyEffortInput = {
  workerCount: number;
  laborHours: number;
};

export type AssemblySummary = {
  goodUnits: number;
  qualityPercentage: number;
  unitsPerLaborHour: number;
};

/** Unidades aptas para bodega: ensambladas menos defectuosas y no conformes. */
export function calcGoodUnits(input: AssemblyRunInput): number {
  return Math.max(input.assembled - input.defective - input.nonConforming, 0);
}

export function calcQualityPercentage(input: AssemblyRunInput): number {
  if (input.assembled <= 0) return 0;
  const pct = (calcGoodUnits(input) / input.assembled) * 100;
  return Number.isFinite(pct) ? pct : 0;
}

/** Productividad: unidades buenas por hora-hombre (operarios × horas). */
export function calcUnitsPerLaborHour(input: AssemblyRunInput & AssemblyEffortInput): number {
  const laborHours = input.workerCount * input.laborHours;
  if (laborHours <= 0) return 0;
  const rate = calcGoodUnits(input) / laborHours;
  return Number.isFinite(rate) ? rate : 0;
}

export function buildAssemblySummary(input: AssemblyRunInput & AssemblyEffortInput): AssemblySummary {
  return {
    goodUnits: calcGoodUnits(input),
    qualityPercentage: calcQualityPercentage(input),
    unitsPerLaborHour: calcUnitsPerLaborHour(input),
  };
}

/** Invariante de negocio: no se puede reportar más descarte que unidades ensambladas. */
export function assertAssemblyQuantities(input: AssemblyRunInput & { reworked: number }): void {
  const { assembled, defective, nonConforming, reworked } = input;
  for (const value of [assembled, defective, nonConforming, reworked]) {
    if (!Number.isInteger(value) || value < 0) throw new Error("INVALID_QUANTITY");
  }
  if (assembled <= 0) throw new Error("INVALID_QUANTITY");
  if (defective + nonConforming > assembled) throw new Error("SCRAP_EXCEEDS_ASSEMBLED");
  if (reworked > assembled) throw new Error("REWORK_EXCEEDS_ASSEMBLED");
}

export function assertAssemblyEffort(input: AssemblyEffortInput): void {
  if (!Number.isInteger(input.workerCount) || input.workerCount < 1) throw new Error("INVALID_WORKER_COUNT");
  if (!Number.isFinite(input.laborHours) || input.laborHours <= 0) throw new Error("INVALID_LABOR_HOURS");
}
