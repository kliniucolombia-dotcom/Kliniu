import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createNotification } from "@/lib/notifications";
import { createSupabaseStorageClient } from "@/lib/supabase-storage";
import { recordTicketEvent } from "@/lib/ticket-events";
import { computeTicketDueDate } from "@/lib/tickets";
import { canManageTicket, canManageTicketAssignment } from "@/lib/ticket-access";

const BUCKET = "rrhh-soportes";

const TICKET_INCLUDE = {
  category: { select: { name: true, icon: true } },
  employee: { include: { user: { select: { id: true, fullName: true } } } },
  responsible: { select: { id: true, fullName: true } },
  attachments: true,
  comments: { include: { user: { select: { fullName: true } } }, orderBy: { createdAt: "asc" as const } },
  events: { include: { actor: { select: { fullName: true } } }, orderBy: { createdAt: "asc" as const } },
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
    include: { employee: { select: { userId: true } }, responsible: { select: { fullName: true } } },
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
  const { status, priority, responsibleId, subject, description } = body as {
    status?: string;
    priority?: string;
    responsibleId?: string | null;
    subject?: string;
    description?: string;
  };

  if (ownerCancelOnly) {
    if (status !== "CANCELADO" || existing.status !== "PENDIENTE" || priority !== undefined || responsibleId !== undefined || subject !== undefined || description !== undefined) {
      return Response.json({ error: "Solo puedes cancelar una solicitud pendiente" }, { status: 400 });
    }
  }

  const privileged = canManageTicketAssignment(access.user);
  if (!privileged && (priority !== undefined || responsibleId !== undefined)) {
    return Response.json({ error: "Solo RRHH o Admin pueden cambiar la prioridad o el responsable" }, { status: 403 });
  }

  // Editar asunto/descripción: RRHH/Admin siempre; el solicitante solo en sus pendientes.
  const wantsContentEdit = subject !== undefined || description !== undefined;
  const isOwner = existing.employee?.userId === access.user.id;
  if (wantsContentEdit) {
    if (!privileged && !isOwner) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    if (!privileged && existing.status !== "PENDIENTE") {
      return Response.json({ error: "Solo puedes editar una solicitud pendiente" }, { status: 400 });
    }
    if (subject !== undefined && !subject.trim()) {
      return Response.json({ error: "El asunto no puede quedar vacío" }, { status: 400 });
    }
    if (description !== undefined && !description.trim()) {
      return Response.json({ error: "La descripción no puede quedar vacía" }, { status: 400 });
    }
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
      subject: subject !== undefined ? subject.trim() : undefined,
      description: description !== undefined ? description.trim() : undefined,
      resolvedAt: status === "FINALIZADO" ? new Date() : status && status !== "FINALIZADO" ? null : undefined,
    },
    include: TICKET_INCLUDE,
  });

  if (subject !== undefined && subject.trim() !== existing.subject) {
    await recordTicketEvent({ ticketId: id, actorId: access.user.id, type: "EDITED", field: "subject", fromValue: existing.subject, toValue: updated.subject });
  }
  if (description !== undefined && description.trim() !== existing.description) {
    await recordTicketEvent({ ticketId: id, actorId: access.user.id, type: "EDITED", field: "description", fromValue: existing.description, toValue: updated.description });
  }

  if (status && validStatus.includes(status) && status !== existing.status) {
    await recordTicketEvent({ ticketId: id, actorId: access.user.id, type: "STATUS", field: "status", fromValue: existing.status, toValue: updated.status });
  }
  if (priority && validPriority.includes(priority) && priority !== existing.priority) {
    await recordTicketEvent({ ticketId: id, actorId: access.user.id, type: "PRIORITY", field: "priority", fromValue: existing.priority, toValue: updated.priority });
  }
  if (responsibleId !== undefined && responsibleId !== existing.responsibleId) {
    await recordTicketEvent({
      ticketId: id,
      actorId: access.user.id,
      type: "RESPONSIBLE",
      field: "responsible",
      fromValue: existing.responsible?.fullName ?? "Sin asignar",
      toValue: updated.responsible?.fullName ?? "Sin asignar",
    });
  }

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

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  if (!canManageTicketAssignment(access.user)) {
    return Response.json({ error: "Solo RRHH o Admin pueden eliminar solicitudes" }, { status: 403 });
  }

  const { id } = await params;
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { attachments: { select: { url: true } } },
  });
  if (!ticket) return Response.json({ error: "Ticket no encontrado" }, { status: 404 });

  await prisma.ticket.delete({ where: { id } });

  // Limpieza best-effort de los adjuntos en Storage (no bloquea el borrado).
  const paths = ticket.attachments.map((a) => a.url).filter((u) => u.startsWith("tickets/"));
  if (paths.length) {
    const supabase = createSupabaseStorageClient();
    if (supabase) {
      try {
        await supabase.storage.from(BUCKET).remove(paths);
      } catch {
        // Ignorar: el registro ya fue eliminado.
      }
    }
  }

  await broadcastPanelUpdate("tickets");
  return Response.json({ ok: true });
}
