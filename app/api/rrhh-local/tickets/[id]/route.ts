import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createNotification } from "@/lib/notifications";
import { computeTicketDueDate } from "@/lib/tickets";
import { canManageTicket, canManageTicketAssignment } from "@/lib/ticket-access";

const TICKET_INCLUDE = {
  category: { select: { name: true, icon: true } },
  employee: { include: { user: { select: { fullName: true } } } },
  responsible: { select: { id: true, fullName: true } },
  attachments: true,
  comments: { include: { user: { select: { fullName: true } } }, orderBy: { createdAt: "asc" as const } },
} as const;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({ where: { id }, include: TICKET_INCLUDE });
  if (!ticket) return Response.json({ error: "Ticket no encontrado" }, { status: 404 });

  if (!(await canManageTicket(access.user, ticket))) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  return Response.json(ticket);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const existing = await prisma.ticket.findUnique({
    where: { id },
    include: { employee: { select: { userId: true } } },
  });
  if (!existing) return Response.json({ error: "Ticket no encontrado" }, { status: 404 });

  const canManage = await canManageTicket(access.user, existing);
  let ownerCancelOnly = false;
  if (!canManage) {
    const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
    if (!employee || existing.employeeId !== employee.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    ownerCancelOnly = true;
  }

  const body = await request.json();
  const { status, priority, responsibleId } = body as {
    status?: string;
    priority?: string;
    responsibleId?: string | null;
  };

  if (ownerCancelOnly) {
    if (status !== "CANCELADO" || existing.status !== "PENDIENTE" || priority !== undefined || responsibleId !== undefined) {
      return Response.json({ error: "Solo puedes cancelar una solicitud pendiente" }, { status: 400 });
    }
  }

  const privileged = canManageTicketAssignment(access.user);
  if (!privileged && (priority !== undefined || responsibleId !== undefined)) {
    return Response.json({ error: "Solo RRHH o Admin pueden cambiar la prioridad o el responsable" }, { status: 403 });
  }

  const validStatus = ["PENDIENTE", "EN_PROCESO", "ESPERANDO_RESPUESTA", "FINALIZADO", "CANCELADO"];
  const validPriority = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      status: status && validStatus.includes(status) ? (status as never) : undefined,
      priority: priority && validPriority.includes(priority) ? (priority as never) : undefined,
      dueDate: priority && validPriority.includes(priority) && priority !== existing.priority
        ? computeTicketDueDate(priority, existing.createdAt)
        : undefined,
      responsibleId: responsibleId !== undefined ? responsibleId : undefined,
      resolvedAt: status === "FINALIZADO" ? new Date() : status && status !== "FINALIZADO" ? null : undefined,
    },
    include: TICKET_INCLUDE,
  });
  await broadcastPanelUpdate("tickets");

  const ownerUserId = existing.employee?.userId;
  if (ownerUserId && ownerUserId !== access.user.id) {
    if (responsibleId !== undefined && responsibleId !== existing.responsibleId) {
      createNotification({
        eventKey: "ticket.assigned",
        title: `Ticket ${updated.code} asignado`,
        detail: `${updated.category.name}: ${updated.subject}`,
        href: "/panel/tickets",
        targetUserId: ownerUserId,
        createdById: access.user.id,
        metadata: { ticketId: updated.id, code: updated.code },
      }).catch(() => {});
    } else if (status && status !== existing.status) {
      createNotification({
        eventKey: status === "FINALIZADO" ? "ticket.resolved" : "ticket.assigned",
        title: `Ticket ${updated.code}: ${status}`,
        detail: `${updated.category.name}: ${updated.subject}`,
        href: "/panel/tickets",
        targetUserId: ownerUserId,
        createdById: access.user.id,
        metadata: { ticketId: updated.id, code: updated.code, status },
      }).catch(() => {});
    }
  }

  if (responsibleId && responsibleId !== existing.responsibleId && responsibleId !== access.user.id) {
    createNotification({
      eventKey: "ticket.assigned",
      title: `Te asignaron la solicitud ${updated.code}`,
      detail: `${updated.category.name}: ${updated.subject} · ${access.user.fullName}`,
      href: "/panel/tickets",
      targetUserId: responsibleId,
      createdById: access.user.id,
      metadata: { ticketId: updated.id, code: updated.code },
    }).catch(() => {});
  }

  return Response.json(updated);
}
