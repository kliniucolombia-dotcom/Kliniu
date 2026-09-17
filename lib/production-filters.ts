/**
 * Filtros del historial de recorridas de inyección. Se aplican en el cliente
 * (tabla) y en el servidor (página imprimible del PDF) para que ambos usen
 * exactamente los mismos criterios.
 */
export type ProductionRunFilters = {
  search: string;
  machineId: string;
  brand: string;
  operatorId: string;
  /** `p:<productId>` para productos reales o `m:<nombre>` para producto manual. */
  product: string;
  orderNumber: string;
  from: string;
  to: string;
  producedMin: string;
  producedMax: string;
  damagedMin: string;
  damagedMax: string;
  nonConformingMin: string;
  nonConformingMax: string;
  goodMin: string;
  goodMax: string;
  qualityMin: string;
  qualityMax: string;
};

export function createEmptyProductionRunFilters(): ProductionRunFilters {
  return {
    search: "",
    machineId: "",
    brand: "",
    operatorId: "",
    product: "",
    orderNumber: "",
    from: "",
    to: "",
    producedMin: "",
    producedMax: "",
    damagedMin: "",
    damagedMax: "",
    nonConformingMin: "",
    nonConformingMax: "",
    goodMin: "",
    goodMax: "",
    qualityMin: "",
    qualityMax: "",
  };
}

export type FilterableProductionRun = {
  orderNumber: string;
  productionDate: string | Date;
  material: string;
  manualProductName: string | null;
  machine: { id: string; code: number; name: string; brand: string };
  operator: { id: string; fullName: string };
  product: { id: string; name: string } | null;
  produced: number;
  damaged: number;
  nonConforming: number;
  summary: { goodPieces: number; qualityPercentage: number };
};

export function productionRunProductLabel(run: Pick<FilterableProductionRun, "product" | "manualProductName">) {
  return run.product?.name ?? run.manualProductName ?? "—";
}

function withinRange(value: number, min: string, max: string) {
  const lo = min.trim() === "" ? null : Number(min);
  const hi = max.trim() === "" ? null : Number(max);
  if (lo !== null && Number.isFinite(lo) && value < lo) return false;
  if (hi !== null && Number.isFinite(hi) && value > hi) return false;
  return true;
}

function matchesProduct(run: FilterableProductionRun, product: string) {
  if (product.startsWith("p:")) return run.product?.id === product.slice(2);
  if (product.startsWith("m:")) return run.manualProductName === product.slice(2);
  return true;
}

export function filterProductionRuns<T extends FilterableProductionRun>(runs: T[], filters: ProductionRunFilters): T[] {
  const q = filters.search.trim().toLowerCase();
  const order = filters.orderNumber.trim().toLowerCase();

  return runs.filter((run) => {
    if (filters.machineId && run.machine.id !== filters.machineId) return false;
    if (filters.brand && run.machine.brand !== filters.brand) return false;
    if (filters.operatorId && run.operator.id !== filters.operatorId) return false;
    if (filters.product && !matchesProduct(run, filters.product)) return false;
    if (order && !run.orderNumber.toLowerCase().includes(order)) return false;

    if (filters.from || filters.to) {
      const day = new Date(run.productionDate).toISOString().slice(0, 10);
      if (filters.from && day < filters.from) return false;
      if (filters.to && day > filters.to) return false;
    }

    if (q) {
      const haystack = [
        run.orderNumber,
        run.machine.name,
        run.machine.brand,
        run.operator.fullName,
        productionRunProductLabel(run),
        run.material,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    if (!withinRange(run.produced, filters.producedMin, filters.producedMax)) return false;
    if (!withinRange(run.damaged, filters.damagedMin, filters.damagedMax)) return false;
    if (!withinRange(run.nonConforming, filters.nonConformingMin, filters.nonConformingMax)) return false;
    if (!withinRange(run.summary.goodPieces, filters.goodMin, filters.goodMax)) return false;
    if (!withinRange(run.summary.qualityPercentage, filters.qualityMin, filters.qualityMax)) return false;

    return true;
  });
}
