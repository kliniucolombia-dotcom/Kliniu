/**
 * Formatea una fecha "de calendario" (sin hora, ej. startDate/hireDate) evitando
 * el corrimiento de un día que produce toLocaleDateString al convertir el UTC
 * medianoche a la zona horaria local (Bogotá va detrás de UTC).
 */
export function fmtDateOnly(d: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString("es-CO", { ...options, timeZone: "UTC" });
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
