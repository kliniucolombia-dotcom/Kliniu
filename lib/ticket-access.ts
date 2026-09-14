import { getEffectivePermission } from "@/lib/permissions";
import { isAdmin, isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import type { PublicUser } from "@/lib/users";

export type TicketAccessContext = {
  employeeId: string;
  responsibleId: string | null;
  categoryId: string;
};

/** Solo RRHH, Admin y SuperAdmin pueden reasignar responsable o cambiar prioridad. */
export function canManageTicketAssignment(user: { role: PublicUser["role"] }): boolean {
  return isRRHH(user) || isAdmin(user);
}

/**
 * Autoriza a gestionar un ticket (ver detalle, comentar, adjuntar, resolver):
 * RRHH/Admin, el responsable asignado, el solicitante, o un miembro del
 * departamento habilitado para la categoría con acceso al módulo de tickets.
 */
export async function canManageTicket(user: PublicUser, ticket: TicketAccessContext): Promise<boolean> {
  if (isRRHH(user) || isAdmin(user)) return true;
  if (ticket.responsibleId && ticket.responsibleId === user.id) return true;
  if (!prisma) return false;

  const employee = await prisma.employee.findUnique({
    where: { userId: user.id },
    select: { id: true, departmentId: true },
  });
  if (!employee) return false;
  if (ticket.employeeId === employee.id) return true;
  if (!employee.departmentId) return false;

  const permission = await getEffectivePermission(user, "MODULE_TICKETS");
  if (!permission.canView && !permission.canCreate && !permission.canEdit) return false;

  const category = await prisma.requestCategory.findUnique({
    where: { id: ticket.categoryId },
    select: { allowedDepartmentIds: true },
  });
  return Boolean(category && category.allowedDepartmentIds.includes(employee.departmentId));
}
