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

