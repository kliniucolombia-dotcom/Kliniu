/**
 * Formatea una fecha "de calendario" (sin hora, ej. startDate/hireDate) evitando
 * el corrimiento de un día que produce toLocaleDateString al convertir el UTC
 * medianoche a la zona horaria local (Bogotá va detrás de UTC).
 */
export function fmtDateOnly(d: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString("es-CO", { ...options, timeZone: "UTC" });
}

/**
 * Formatea la hora de un instante guardado en UTC (ej. startTime/endTime de las
 * corridas). Se lee en UTC para que la hora de reloj no se corra en Bogotá.
 */
export function fmtTimeOnly(d: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC", ...options });
}

/**
 * ¿Una fecha "de calendario" (startDate, date, hireDate…) cae en el mes actual?
 *
 * El campo se guarda como UTC medianoche, así que hay que leerlo en UTC: con
 * getMonth() local, un registro del día 1 se corre al mes anterior en Bogotá y
 * el KPI de "este mes" lo deja por fuera. `ref` sí es un instante real, por eso
 * se lee en hora local.
 *
 * No usar con createdAt/updatedAt: esos llevan hora real y se comparan en local.
 */
export function isSameMonthDateOnly(d: string | Date, ref: Date = new Date()) {
  const date = new Date(d);
  return date.getUTCMonth() === ref.getMonth() && date.getUTCFullYear() === ref.getFullYear();
}

/** Días entre la fecha de calendario trabajada y el día (Bogotá, UTC-5) en que se cargó el registro. */
export function loadLagDays(workDate: string | Date, createdAt: string | Date) {
  const loaded = new Date(new Date(createdAt).getTime() - 5 * 3600_000).toISOString().slice(0, 10);
  const worked = new Date(workDate).toISOString().slice(0, 10);
  return Math.round((Date.parse(loaded) - Date.parse(worked)) / 86_400_000);
}

/** "14 oct" del instante de carga, en hora Bogotá. */
export function fmtLoadedDate(createdAt: string | Date) {
  return new Date(createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", timeZone: "America/Bogota" });
}
