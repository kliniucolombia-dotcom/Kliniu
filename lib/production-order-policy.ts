type ProductionQuantity = { produced: number; damaged: number; nonConforming: number };

export function netAcceptedUnits(runs: ProductionQuantity[]): number {
  return runs.reduce((total, run) => total + Math.max(0, run.produced - run.damaged - run.nonConforming), 0);
}

export function assertProductionCanComplete(requiredUnits: number, runs: ProductionQuantity[]): void {
  if (runs.length === 0) throw new Error("NO_PRODUCTION_RUNS");
  if (netAcceptedUnits(runs) < requiredUnits) throw new Error("INSUFFICIENT_PRODUCTION");
}
