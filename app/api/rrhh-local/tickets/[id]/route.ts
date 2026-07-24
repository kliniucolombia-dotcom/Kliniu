import { requireActiveUser } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

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

  if (!isRRHH(access.user) && ticket.responsibleId !== access.user.id) {
    const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
    if (!employee || ticket.employeeId !== employee.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  return Response.json(ticket);
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const existing = await prisma.ticket.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Ticket no encontrado" }, { status: 404 });

  const canManage = isRRHH(access.user) || existing.responsibleId === access.user.id;
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

  const validStatus = ["PENDIENTE", "EN_PROCESO", "ESPERANDO_RESPUESTA", "FINALIZADO", "CANCELADO"];
  const validPriority = ["BAJA", "MEDIA", "ALTA", "URGENTE"];

  const updated = await prisma.ticket.update({
    where: { id },
    data: {
      status: status && validStatus.includes(status) ? (status as never) : undefined,
      priority: priority && validPriority.includes(priority) ? (priority as never) : undefined,
      responsibleId: responsibleId !== undefined ? responsibleId : undefined,
      resolvedAt: status === "FINALIZADO" ? new Date() : status && status !== "FINALIZADO" ? null : undefined,
    },
    include: TICKET_INCLUDE,
  });
  await broadcastPanelUpdate("tickets");
  return Response.json(updated);
}
