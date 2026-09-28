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
