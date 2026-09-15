import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createNotification } from "@/lib/notifications";
import { recordTicketEvent } from "@/lib/ticket-events";
import { canManageTicket } from "@/lib/ticket-access";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { employee: { select: { userId: true } } },
  });
  if (!ticket) return Response.json({ error: "Ticket no encontrado" }, { status: 404 });

  if (!(await canManageTicket(access.user, ticket))) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const { message } = body as { message?: string };
  if (!message?.trim()) return Response.json({ error: "message es obligatorio" }, { status: 400 });

  const trimmed = message.trim();
  const comment = await prisma.ticketComment.create({
    data: { ticketId: id, userId: access.user.id, message: trimmed },
    include: { user: { select: { fullName: true } } },
  });

  await recordTicketEvent({ ticketId: id, actorId: access.user.id, type: "COMMENT", toValue: trimmed.length > 140 ? `${trimmed.slice(0, 140)}…` : trimmed });

  const priorComments = await prisma.ticketComment.findMany({
    where: { ticketId: id },
    select: { userId: true },
    distinct: ["userId"],
  });
  const recipients = new Set<string>();
  if (ticket.responsibleId) recipients.add(ticket.responsibleId);
  if (ticket.employee?.userId) recipients.add(ticket.employee.userId);
  priorComments.forEach((c) => recipients.add(c.userId));
  recipients.delete(access.user.id);

  const preview = trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;
  for (const userId of recipients) {
    createNotification({
      eventKey: "ticket.comment",
      title: `Nuevo mensaje en ${ticket.code}`,
      detail: `${access.user.fullName}: ${preview}`,
      href: "/panel/tickets",
      targetUserId: userId,
      createdById: access.user.id,
      metadata: { ticketId: id, code: ticket.code },
    }).catch(() => {});
  }

  await broadcastPanelUpdate("tickets");
  return Response.json(comment, { status: 201 });
}
