/** Traduce los errores de dominio de Control de Producción a respuestas HTTP. */
const MESSAGES: Record<string, { error: string; status: number }> = {
  INVALID_BODY: { error: "Cuerpo inválido", status: 400 },
  INVALID_DATE: { error: "Fecha inválida", status: 400 },
  INVALID_DATE_RANGE: { error: "Rango de fechas inválido", status: 400 },
  INVALID_NUMBER: { error: "Número inválido", status: 400 },
  INVALID_STRING: { error: "Falta un campo obligatorio", status: 400 },
  INVALID_ENUM: { error: "Valor no permitido", status: 400 },
  INVALID_WORK_ORDER_NUMBER: { error: "El número de ODT debe ser un entero positivo", status: 400 },
  INVALID_QUANTITY: { error: "Las unidades deben ser un entero positivo", status: 400 },
  INVALID_PRODUCED_QUANTITY: { error: "Las unidades producidas deben ser un entero mayor o igual a cero", status: 400 },
  INVALID_LOT: { error: "El lote debe ser un entero positivo", status: 400 },
  INVALID_STANDARD_TIME: { error: "El tiempo estándar debe ser un número mayor o igual a cero", status: 400 },
  PRODUCED_QUANTITY_REQUIRED: { error: "Para cerrar la ODT indica las unidades producidas", status: 400 },
  WORK_ORDER_NUMBER_TAKEN: { error: "Ya existe una ODT con ese número", status: 409 },
  WORK_ORDER_NOT_OPEN: { error: "La ODT ya está cerrada", status: 409 },
  WORK_ORDER_NOT_CLOSED: { error: "La ODT ya está abierta", status: 409 },
  WORK_ORDER_HAS_ENTRIES: { error: "La ODT tiene registros de producción: no se puede eliminar", status: 409 },
  OPERATION_CODE_TAKEN: { error: "Ya existe una operación con ese código", status: 409 },
  OPERATION_HAS_ENTRIES: { error: "La operación tiene registros: desactívala en vez de eliminarla", status: 409 },
  NOT_FOUND: { error: "Registro no encontrado", status: 404 },
};

export function productionControlErrorResponse(e: unknown): Response {
  const key = e instanceof Error ? e.message.split(":")[0] : "";
  const known = MESSAGES[key];
  if (known) return Response.json({ error: known.error }, { status: known.status });
  if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
    return Response.json({ error: MESSAGES.NOT_FOUND.error }, { status: 404 });
  }
  console.error("[control-produccion]", e);
  return Response.json({ error: "Error interno" }, { status: 500 });
}
