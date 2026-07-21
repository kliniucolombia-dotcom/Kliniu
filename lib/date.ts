/**
 * Formatea una fecha "de calendario" (sin hora, ej. startDate/hireDate) evitando
 * el corrimiento de un día que produce toLocaleDateString al convertir el UTC
 * medianoche a la zona horaria local (Bogotá va detrás de UTC).
 */
export function fmtDateOnly(d: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Date(d).toLocaleDateString("es-CO", { ...options, timeZone: "UTC" });
}
