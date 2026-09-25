// Calendario de actividad comercial — lógica pura (sin DB), segura para cliente y servidor.
// Todas las fechas son "YYYY-MM-DD" en calendario de Bogotá (UTC-5, sin DST).

export const BOGOTA_OFFSET_MS = 5 * 3600 * 1000;
export const DEFAULT_DEADLINE_MINUTES = 20 * 60; // 8:00 pm
export const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5, 6]; // lun-sáb (0 = domingo)

export type DayStatus = "GREEN" | "YELLOW" | "RED" | "GRAY" | "PENDING" | "FUTURE";
export type GrayReason = "holiday" | "nonworking" | "inactive" | "untracked";

export function bogotaNow(now = Date.now()) {
  const d = new Date(now - BOGOTA_OFFSET_MS);
  return { key: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}

/** Fecha guardada (05:00Z = medianoche Bogotá) → "YYYY-MM-DD". */
export function dateToKey(d: Date): string {
  return new Date(d.getTime() - BOGOTA_OFFSET_MS).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → instante de medianoche Bogotá (así se guardan las fechas). */
export function keyToDate(key: string): Date {
  return new Date(`${key}T05:00:00Z`);
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weekday(key: string): number {
  return new Date(`${key}T12:00:00Z`).getUTCDay();
}

export function monthKeys(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

export function prevMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return d.toISOString().slice(0, 7);
}

export type DayInput = {
  date: string;
  todayKey: string;
  nowMinutes: number;
  deadlineMinutes: number;
  trackingStart: string;
  workDays: number[];
  isHoliday: boolean;
  active: boolean;
  hasClose: boolean;
  salesTotal: number;
  rowsCount: number;
  firstReportAt: number | null; // ms epoch del primer reporte con venta > 0 o cierre
};

export type DayResult = { status: DayStatus; late: boolean; reason?: GrayReason };

export function computeDayStatus(i: DayInput): DayResult {
  const reported = i.hasClose || i.salesTotal > 0;
  const workday = i.workDays.includes(weekday(i.date));

  if (!i.active) return { status: "GRAY", late: false, reason: "inactive" };
  const untracked = i.date < i.trackingStart;
  // Antes del seguimiento no hay log de eventos: lo vendido se ve en verde, pero sin exigir ni medir retraso.
  if (reported && untracked) return { status: "GREEN", late: false, reason: "untracked" };
  if (untracked) return { status: "GRAY", late: false, reason: "untracked" };
  if (reported) {
    const deadline = keyToDate(i.date).getTime() + i.deadlineMinutes * 60000;
    return { status: "GREEN", late: i.firstReportAt !== null && i.firstReportAt > deadline };
  }
  if (i.isHoliday) return { status: "GRAY", late: false, reason: "holiday" };
  if (!workday) return { status: "GRAY", late: false, reason: "nonworking" };
  if (i.date > i.todayKey) return { status: "FUTURE", late: false };
  if (i.date === i.todayKey && i.nowMinutes < i.deadlineMinutes) {
    return { status: i.rowsCount > 0 ? "YELLOW" : "PENDING", late: false };
  }
  return { status: "RED", late: false };
}

// ─── Tipos que viajan del API a la UI ───────────────────────────

export type CellRow = {
  campaignId: string;
  name: string;
  platform: string;
  venta: number;
  presupuestoUsd: number;
  mensajes: number;
  transacciones: number;
};

export type CellNewCampaign = {
  id: string;
  name: string;
  platform: string;
  status: string;
  createdAt: string;
  initialUsd: number | null;
};

export type CellEvent = { kind: string; value: number; at: string; actor: string };

export type Cell = {
  date: string;
  status: DayStatus;
  late: boolean;
  reason?: GrayReason;
  total: number;
  campaignsWithSales: number;
  rows: CellRow[];
  newCampaigns: CellNewCampaign[];
  closed: boolean;
  noSales: boolean;
  lastUpdate: string | null;
  events: CellEvent[];
};

export type SellerCalendar = {
  id: string;
  name: string;
  workDays: number[];
  cells: Record<string, Cell>;
};

/** Cumplimiento = verdes / (verdes + rojos) sobre días laborables exigibles. */
export function compliance(cells: Cell[], workDaysOf: (date: string) => boolean) {
  let done = 0;
  let expected = 0;
  for (const c of cells) {
    if (c.reason === "untracked" || !workDaysOf(c.date)) continue;
    if (c.status === "GREEN") { done++; expected++; }
    else if (c.status === "RED") expected++;
  }
  return { done, expected, pct: expected ? Math.round((done / expected) * 100) : null };
}

// Auto-chequeo: `npx tsx lib/commercial-calendar.ts`
export function demo() {
  const base: DayInput = {
    date: "2026-09-22", todayKey: "2026-09-25", nowMinutes: 600, deadlineMinutes: 1200,
    trackingStart: "2026-09-01", workDays: DEFAULT_WORK_DAYS, isHoliday: false, active: true,
    hasClose: false, salesTotal: 0, rowsCount: 0, firstReportAt: null,
  };
  const s = (o: Partial<DayInput>) => computeDayStatus({ ...base, ...o });
  const eq = (a: unknown, b: unknown) => { if (a !== b) throw new Error(`esperado ${b}, salió ${a}`); };

  eq(s({}).status, "RED");                                             // pasado sin reporte
  eq(s({ rowsCount: 2 }).status, "RED");                               // filas en 0 no son confirmación
  eq(s({ salesTotal: 500 }).status, "GREEN");
  eq(s({ hasClose: true }).status, "GREEN");                           // cero ventas confirmado
  eq(s({ date: "2026-09-27" }).status, "GRAY");                        // domingo
  eq(s({ date: "2026-09-26" }).status, "FUTURE");                      // sábado futuro
  eq(s({ date: "2026-09-25" }).status, "PENDING");                     // hoy antes del límite
  eq(s({ date: "2026-09-25", rowsCount: 1 }).status, "YELLOW");
  eq(s({ date: "2026-09-25", nowMinutes: 1300 }).status, "RED");       // hoy pasado el límite
  eq(s({ date: "2026-08-31" }).reason, "untracked");
  eq(s({ date: "2026-08-31", salesTotal: 9 }).status, "GREEN");       // historia con ventas: verde, no exigible
  eq(s({ date: "2026-08-31", salesTotal: 9 }).reason, "untracked");
  eq(s({ isHoliday: true }).reason, "holiday");
  eq(s({ active: false }).reason, "inactive");
  const late = s({ salesTotal: 1, firstReportAt: keyToDate("2026-09-24").getTime() + 3600000 });
  eq(late.late, true);                                                 // lunes reportado el miércoles
  eq(s({ salesTotal: 1, firstReportAt: keyToDate("2026-09-22").getTime() + 3600000 }).late, false);
  eq(dateToKey(keyToDate("2026-09-22")), "2026-09-22");
  eq(prevMonth("2026-01"), "2025-12");
  return "ok";
}

if (typeof process !== "undefined" && process.argv[1]?.endsWith("commercial-calendar.ts")) console.log(demo());
