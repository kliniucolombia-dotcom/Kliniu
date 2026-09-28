// Control de Producción — lógica pura (sin DB), segura para cliente y servidor.
// Horas guardadas como "hora de reloj en UTC" (`${d}T${HH:mm}:00.000Z`); la resta da minutos reales.
import { addDays } from "@/lib/commercial-calendar";

/** Días hacia atrás que un operario puede registrar/corregir lo suyo (cubre sábado → lunes festivo). */
export const OWN_WINDOW_DAYS = 3;

export type EntryLike = {
  operatorId: string;
  startTime: Date | string;
  endTime: Date | string;
  standardSeconds: number;
  quantity: number;
  sharedBy: number;
};

export type Summary = {
  /** Minutos registrados (cada bloque cuenta una vez, incluidos indirectos). */
  registeredMinutes: number;
  /** Minutos de bloques con al menos una operación con estándar > 0. */
  directMinutes: number;
  /** Minutos estándar ganados: To × cantidad / personas. */
  standardMinutes: number;
  /** standard / direct; null si no hay tiempo directo. Sin tope: puede pasar de 1. */
  efficiency: number | null;
  blocks: number;
};

const ms = (d: Date | string) => new Date(d).getTime();

export function minutesBetween(start: Date | string, end: Date | string): number {
  return (ms(end) - ms(start)) / 60_000;
}

/** Minutos estándar de un registro. "DIVIDIR ENTRE DOS" → sharedBy = 2. */
export function standardMinutesOf(e: Pick<EntryLike, "standardSeconds" | "quantity" | "sharedBy">): number {
  return ((e.standardSeconds / 60) * e.quantity) / Math.max(1, e.sharedBy);
}

/** Varios registros del mismo operario con el mismo inicio–fin son un solo bloque de tiempo. */
export function blockKey(e: Pick<EntryLike, "operatorId" | "startTime" | "endTime">): string {
  return `${e.operatorId}|${ms(e.startTime)}|${ms(e.endTime)}`;
}

export function summarize(entries: EntryLike[]): Summary {
  const blocks = new Map<string, { minutes: number; standard: number; direct: boolean }>();
  for (const e of entries) {
    const key = blockKey(e);
    const b = blocks.get(key) ?? { minutes: minutesBetween(e.startTime, e.endTime), standard: 0, direct: false };
    b.standard += standardMinutesOf(e);
    if (e.standardSeconds > 0) b.direct = true;
    blocks.set(key, b);
  }
  let registeredMinutes = 0;
  let directMinutes = 0;
  let standardMinutes = 0;
  for (const b of blocks.values()) {
    registeredMinutes += b.minutes;
    if (!b.direct) continue;
    directMinutes += b.minutes;
    standardMinutes += b.standard;
  }
  return {
    registeredMinutes,
    directMinutes,
    standardMinutes,
    efficiency: directMinutes > 0 ? standardMinutes / directMinutes : null,
    blocks: blocks.size,
  };
}

/** Indicador de cada bloque, indexado por blockKey. */
export function blockEfficiencies(entries: EntryLike[]): Map<string, Summary> {
  const groups = new Map<string, EntryLike[]>();
  for (const e of entries) groups.set(blockKey(e), [...(groups.get(blockKey(e)) ?? []), e]);
  return new Map([...groups].map(([k, list]) => [k, summarize(list)]));
}

/**
 * ¿El intervalo choca con alguno existente? Mismo inicio–fin exacto = mismo bloque (válido);
 * tocarse en el borde también es válido. Solo se rechazan los cruces parciales.
 */
export function overlapsPartially(
  existing: { startTime: Date | string; endTime: Date | string }[],
  candidate: { startTime: Date | string; endTime: Date | string },
): boolean {
  const cs = ms(candidate.startTime);
  const ce = ms(candidate.endTime);
  return existing.some((x) => {
    const xs = ms(x.startTime);
    const xe = ms(x.endTime);
    if (xs === cs && xe === ce) return false;
    return xs < ce && cs < xe;
  });
}

/** Fecha "YYYY-MM-DD" dentro de la ventana del operario (hoy y OWN_WINDOW_DAYS atrás). */
export function withinOwnWindow(dateKey: string, todayKey: string): boolean {
  return dateKey <= todayKey && dateKey >= addDays(todayKey, -OWN_WINDOW_DAYS);
}

// ─── Indicadores ─────────────────────────────────────────────────

export type IndicatorEntry = EntryLike & {
  id: string;
  operatorName: string;
  workDate: string;
  operation: { id: string; code: string; name: string; family: string };
  workOrder: { id: string; number: number; reference: string; productName: string; quantity: number; producedQuantity: number | null; status: string } | null;
};

/**
 * Minutos del bloque atribuidos a cada registro: en proporción a su estándar ganado
 * (o en partes iguales si el bloque es indirecto). Así un bloque con dos ODTs no cuenta doble.
 */
export function attributeMinutes(entries: EntryLike[]): number[] {
  const groups = new Map<string, number[]>();
  entries.forEach((e, i) => groups.set(blockKey(e), [...(groups.get(blockKey(e)) ?? []), i]));
  const out = new Array<number>(entries.length).fill(0);
  for (const idx of groups.values()) {
    const minutes = minutesBetween(entries[idx[0]].startTime, entries[idx[0]].endTime);
    const std = idx.map((i) => standardMinutesOf(entries[i]));
    const total = std.reduce((a, b) => a + b, 0);
    idx.forEach((i, k) => { out[i] = total > 0 ? (minutes * std[k]) / total : minutes / idx.length; });
  }
  return out;
}

const ratio = (a: number, b: number) => (b > 0 ? a / b : null);

export function buildIndicators(entries: IndicatorEntry[]) {
  const minutes = attributeMinutes(entries);

  const byOperatorMap = new Map<string, IndicatorEntry[]>();
  const byDayMap = new Map<string, IndicatorEntry[]>();
  for (const e of entries) {
    byOperatorMap.set(e.operatorId, [...(byOperatorMap.get(e.operatorId) ?? []), e]);
    byDayMap.set(e.workDate, [...(byDayMap.get(e.workDate) ?? []), e]);
  }
  const byOperator = [...byOperatorMap.values()]
    .map((list) => ({
      operatorId: list[0].operatorId,
      operatorName: list[0].operatorName,
      days: new Set(list.map((e) => e.workDate)).size,
      ...summarize(list),
    }))
    .sort((a, b) => a.operatorName.localeCompare(b.operatorName));
  const byDay = [...byDayMap.entries()]
    .map(([date, list]) => ({ date, operators: new Set(list.map((e) => e.operatorId)).size, ...summarize(list) }))
    .sort((a, b) => b.date.localeCompare(a.date));

  type Agg = { units: number; minutes: number; standard: number; entries: number };
  const add = (a: Agg, e: IndicatorEntry, i: number) => {
    a.units += e.quantity / Math.max(1, e.sharedBy);
    a.minutes += minutes[i];
    a.standard += standardMinutesOf(e);
    a.entries += 1;
  };
  const empty = (): Agg => ({ units: 0, minutes: 0, standard: 0, entries: 0 });

  const orders = new Map<string, { order: NonNullable<IndicatorEntry["workOrder"]>; total: Agg; ops: Map<string, Agg & { code: string; name: string }> }>();
  const operations = new Map<string, Agg & { operation: IndicatorEntry["operation"]; stdSecondsWeighted: number }>();
  entries.forEach((e, i) => {
    if (e.workOrder) {
      const o = orders.get(e.workOrder.id) ?? { order: e.workOrder, total: empty(), ops: new Map() };
      add(o.total, e, i);
      const op = o.ops.get(e.operation.id) ?? { ...empty(), code: e.operation.code, name: e.operation.name };
      add(op, e, i);
      o.ops.set(e.operation.id, op);
      orders.set(e.workOrder.id, o);
    }
    if (e.standardSeconds > 0) {
      const op = operations.get(e.operation.id) ?? { ...empty(), operation: e.operation, stdSecondsWeighted: 0 };
      add(op, e, i);
      op.stdSecondsWeighted += e.standardSeconds * (e.quantity / Math.max(1, e.sharedBy));
      operations.set(e.operation.id, op);
    }
  });

  const byWorkOrder = [...orders.values()]
    .map(({ order, total, ops }) => ({
      ...order,
      laborMinutes: total.minutes,
      standardMinutes: total.standard,
      efficiency: ratio(total.standard, total.minutes),
      entries: total.entries,
      operations: [...ops.values()].map((o) => ({ code: o.code, name: o.name, units: o.units })).sort((a, b) => a.code.localeCompare(b.code)),
    }))
    .sort((a, b) => b.number - a.number);

  // Tiempo real por unidad vs estándar: insumo para recalibrar la hoja TIEMPOS.
  const byOperation = [...operations.values()]
    .map((o) => {
      const standardSecondsPerUnit = ratio(o.stdSecondsWeighted, o.units);
      const realSecondsPerUnit = ratio(o.minutes * 60, o.units);
      return {
        ...o.operation,
        entries: o.entries,
        units: o.units,
        minutes: o.minutes,
        standardSecondsPerUnit,
        realSecondsPerUnit,
        deviation: standardSecondsPerUnit && realSecondsPerUnit !== null ? realSecondsPerUnit / standardSecondsPerUnit - 1 : null,
      };
    })
    .sort((a, b) => a.family.localeCompare(b.family) || a.code.localeCompare(b.code));

  return { totals: summarize(entries), byOperator, byDay, byWorkOrder, byOperation };
}
