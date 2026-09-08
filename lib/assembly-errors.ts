/** Traduce los errores de dominio del módulo de ensamble a respuestas HTTP. */
const MESSAGES: Record<string, { error: string; status: number }> = {
  INVALID_QUANTITY: { error: "Cantidades inválidas", status: 400 },
  SCRAP_EXCEEDS_ASSEMBLED: { error: "Los defectuosos y no conformes no pueden superar lo ensamblado", status: 400 },
  REWORK_EXCEEDS_ASSEMBLED: { error: "El reproceso no puede superar lo ensamblado", status: 400 },
  INVALID_WORKER_COUNT: { error: "Debe haber al menos un operario", status: 400 },
  INVALID_LABOR_HOURS: { error: "Las horas trabajadas deben ser mayores a cero", status: 400 },
  INVALID_TIME_RANGE: { error: "La hora final debe ser posterior a la de inicio", status: 400 },
  PRODUCT_CHANGE_NOT_ALLOWED: { error: "No se puede cambiar el producto de una corrida registrada", status: 400 },
  INSUFFICIENT_STOCK: { error: "No hay stock suficiente en producto terminado para revertir la corrida", status: 409 },
  STATION_HAS_RUNS: { error: "El puesto tiene corridas registradas: desactívalo en vez de borrarlo", status: 409 },
  INVALID_CODE: { error: "Código de puesto inválido", status: 400 },
  INVALID_NAME: { error: "Nombre de puesto requerido", status: 400 },
  NOT_FOUND: { error: "Corrida no encontrada", status: 404 },
};

export function assemblyErrorResponse(e: unknown): Response {
  const key = e instanceof Error ? e.message.split(":")[0] : "";
  const known = MESSAGES[key];
  if (known) return Response.json({ error: known.error }, { status: known.status });
  return Response.json({ error: "Error interno" }, { status: 500 });
}
