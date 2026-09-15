export const TICKET_SLA_HOURS: Record<string, number> = {
  URGENTE: 12,
  ALTA: 24,
  MEDIA: 72,
  BAJA: 120,
};

export const TICKET_SLA_LABELS: Record<string, string> = {
  URGENTE: "Medio día",
  ALTA: "1 día",
  MEDIA: "3 días",
  BAJA: "5 días",
};

export function computeTicketDueDate(priority: string, from: Date = new Date()) {
  const hours = TICKET_SLA_HOURS[priority] ?? TICKET_SLA_HOURS.MEDIA;
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export type ResponsibleOption = { id: string; fullName: string };

type EmployeeWithDepartment = {
  userId: string;
  departmentId: string | null;
  user: { fullName: string };
};

/** Agrupa empleados activos por departamento para el selector "Asignar a". */
export function groupResponsiblesByDepartment(
  employees: EmployeeWithDepartment[],
): Record<string, ResponsibleOption[]> {
  const byDepartment: Record<string, ResponsibleOption[]> = {};
  for (const e of employees) {
    if (!e.departmentId) continue;
    (byDepartment[e.departmentId] ??= []).push({ id: e.userId, fullName: e.user.fullName });
  }
  return byDepartment;
}

/**
 * Candidatos para una categoría: solo se elige responsable cuando la categoría
 * está ligada a un único departamento (ej. PQRS Diseño / PQRS Venta).
 */
export function responsiblesForCategory(
  byDepartment: Record<string, ResponsibleOption[]>,
  allowedDepartmentIds: string[],
): ResponsibleOption[] {
  if (allowedDepartmentIds.length !== 1) return [];
  return byDepartment[allowedDepartmentIds[0]] ?? [];
}

/** Valida que el responsable elegido pertenezca a los departamentos de la categoría. */
export function isAssigneeAllowed(
  byDepartment: Record<string, ResponsibleOption[]>,
  allowedDepartmentIds: string[],
  responsibleId: string,
): boolean {
  if (allowedDepartmentIds.length === 0) {
    return Object.values(byDepartment).some((list) => list.some((r) => r.id === responsibleId));
  }
  return allowedDepartmentIds.some((dept) =>
    (byDepartment[dept] ?? []).some((r) => r.id === responsibleId),
  );
}

/** Estados en los que un ticket ya no debe marcarse como vencido. */
const CLOSED_TICKET_STATUSES = new Set(["FINALIZADO", "CANCELADO"]);

/** Un ticket está vencido si tiene fecha límite pasada y sigue abierto. */
export function isTicketOverdue(
  ticket: { dueDate: string | Date | null; status: string },
  now: Date = new Date(),
): boolean {
  if (!ticket.dueDate || CLOSED_TICKET_STATUSES.has(ticket.status)) return false;
  return new Date(ticket.dueDate).getTime() < now.getTime();
}

/** Rango [inicio, fin) del mes de `date` en hora de Bogotá (UTC-5). */
export function bogotaMonthRange(date: Date = new Date(), offsetMonths = 0) {
  const bogota = new Date(date.getTime() - 5 * 3600 * 1000);
  const start = new Date(Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth() + offsetMonths, 1, 5, 0, 0));
  const end = new Date(Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth() + offsetMonths + 1, 1, 5, 0, 0));
  return { start, end };
}

/** Variación porcentual redondeada respecto a un valor anterior. `null` si no es calculable. */
export function growthPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Definición de un campo dinámico configurable por categoría. */
export type TicketFieldDef = {
  key: string;
  label: string;
  type: "text" | "select" | "boolean";
  options?: string[];
  required?: boolean;
};

export const TICKET_LOCATIONS = ["Oficina", "Bodega", "Producción", "Planta", "Comercial", "Otro"];

function parseFieldsSchema(schema: unknown): TicketFieldDef[] {
  if (!Array.isArray(schema)) return [];
  return schema.filter((f): f is TicketFieldDef => Boolean(f) && typeof (f as TicketFieldDef).key === "string");
}

const FIELD_TYPES = new Set(["text", "select", "boolean"]);

/** Normaliza el schema de campos dinámicos recibido desde el panel admin. */
export function sanitizeFieldsSchema(input: unknown): TicketFieldDef[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((raw) => {
      const f = raw as Partial<TicketFieldDef>;
      const key = String(f.key ?? "").trim().replace(/\s+/g, "_").toLowerCase();
      const label = String(f.label ?? "").trim();
      const type = FIELD_TYPES.has(String(f.type)) ? (f.type as TicketFieldDef["type"]) : "text";
      const options = Array.isArray(f.options) ? f.options.map((o) => String(o).trim()).filter(Boolean) : undefined;
      return { key, label, type, options, required: Boolean(f.required) };
    })
    .filter((f) => f.key && f.label);
}

/**
 * Valida que los campos obligatorios definidos en `fieldsSchema` estén presentes.
 * Devuelve el mensaje de error o `null` si todo está bien.
 */
export function validateTicketExtraFields(
  fieldsSchema: unknown,
  extraFields: Record<string, unknown> | null | undefined,
): string | null {
  const fields = parseFieldsSchema(fieldsSchema);
  const values = extraFields ?? {};
  for (const field of fields) {
    if (!field.required) continue;
    const value = values[field.key];
    if (value === undefined || value === null || String(value).trim() === "") {
      return `El campo "${field.label}" es obligatorio`;
    }
  }
  return null;
}

/** Normaliza los campos dinámicos enviados, conservando solo los definidos en el schema. */
export function sanitizeTicketExtraFields(
  fieldsSchema: unknown,
  extraFields: Record<string, unknown> | null | undefined,
): Record<string, string> {
  const fields = parseFieldsSchema(fieldsSchema);
  const values = extraFields ?? {};
  const result: Record<string, string> = {};
  for (const field of fields) {
    const value = values[field.key];
    if (value === undefined || value === null) continue;
    result[field.key] = String(value);
  }
  return result;
}

