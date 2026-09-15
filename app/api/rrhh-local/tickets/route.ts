import { requireActiveUser } from "@/lib/permissions";
import { isAdmin, isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createNotification } from "@/lib/notifications";
import { recordTicketEvent } from "@/lib/ticket-events";
import { computeTicketDueDate, groupResponsiblesByDepartment, isAssigneeAllowed, validateTicketExtraFields, sanitizeTicketExtraFields } from "@/lib/tickets";

const TICKET_INCLUDE = {
  category: { select: { name: true, icon: true } },
  employee: { include: { user: { select: { fullName: true } } } },
  responsible: { select: { id: true, fullName: true } },
  attachments: true,
} as const;

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  // RRHH/SUPERADMIN ven todo; un responsable ve lo suyo; el resto ve solo sus propias solicitudes.
  if (isRRHH(access.user)) {
    const tickets = await prisma.ticket.findMany({ orderBy: { createdAt: "desc" }, include: TICKET_INCLUDE });
    return Response.json(tickets);
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        ...(employee ? [{ employeeId: employee.id }] : []),
        { responsibleId: access.user.id },
      ],
    },
    orderBy: { createdAt: "desc" },
    include: TICKET_INCLUDE,
  });
  return Response.json(tickets);
}

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  let employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) {
    employee = await prisma.employee.create({
      data: {
        userId: access.user.id,
        employeeCode: `SYS-${access.user.id.slice(-8)}`,
        jobTitle: access.user.role,
        hireDate: new Date(),
      },
    });
  }

  const body = await request.json();
  const { categoryId, priority, subject, description, location, extraFields, attachments, responsibleId } = body as {
    categoryId?: string;
    priority?: string;
    subject?: string;
    description?: string;
    location?: string;
    extraFields?: Record<string, unknown>;
    attachments?: { path: string; name: string; size?: number }[];
    responsibleId?: string | null;
  };

  if (!categoryId || !subject?.trim() || !description?.trim()) {
    return Response.json({ error: "categoryId, subject y description son obligatorios" }, { status: 400 });
  }

  const category = await prisma.requestCategory.findUnique({ where: { id: categoryId } });
  if (!category || !category.active) {
    return Response.json({ error: "Categoría no disponible" }, { status: 400 });
  }
  if (!isAdmin(access.user) && !isRRHH(access.user) && category.allowedDepartmentIds.length > 0 && !(employee.departmentId && category.allowedDepartmentIds.includes(employee.departmentId))) {
    return Response.json({ error: "No tienes acceso a esta categoría" }, { status: 403 });
  }

  const extraFieldsError = validateTicketExtraFields(category.fieldsSchema, extraFields);
  if (extraFieldsError) return Response.json({ error: extraFieldsError }, { status: 400 });

  const priorityValue = ["BAJA", "MEDIA", "ALTA", "URGENTE"].includes(priority || "") ? priority : "MEDIA";

  let assigneeId: string | null = category.defaultResponsibleId;
  if (responsibleId) {
    const employees = await prisma.employee.findMany({
      where: { status: "ACTIVE", departmentId: { not: null } },
      select: { userId: true, departmentId: true, user: { select: { fullName: true } } },
    });
    const byDepartment = groupResponsiblesByDepartment(employees);
    if (!isAssigneeAllowed(byDepartment, category.allowedDepartmentIds, responsibleId)) {
      return Response.json({ error: "El responsable no pertenece a los departamentos de esta categoría" }, { status: 400 });
    }
    assigneeId = responsibleId;
  }

  const safeAttachments = (attachments || []).filter(
    (a) => typeof a.path === "string" && a.path.startsWith(`tickets/${access.user.id}/`),
  );

  const safeExtraFields = sanitizeTicketExtraFields(category.fieldsSchema, extraFields);

  // Código secuencial derivado del último existente (tolera borrados) con reintento ante colisión.
  const buildCode = async () => {
    const last = await prisma!.ticket.findFirst({ orderBy: { code: "desc" }, select: { code: true } });
    const lastNumber = last ? Number.parseInt(last.code.replace(/\D/g, ""), 10) : 0;
    const next = Number.isFinite(lastNumber) ? lastNumber + 1 : 1;
    return `TK-${String(next).padStart(6, "0")}`;
  };

  const ticketData = {
    employeeId: employee.id,
    categoryId,
    priority: priorityValue as never,
    subject: subject.trim(),
    description: description.trim(),
    location: location?.trim() || null,
    extraFields: safeExtraFields as never,
    responsibleId: assigneeId,
    dueDate: computeTicketDueDate(priorityValue as string),
    attachments: safeAttachments.length
      ? { create: safeAttachments.map((a) => ({ url: a.path, name: a.name, size: a.size })) }
      : undefined,
  };

  let created;
  for (let attempt = 0; ; attempt++) {
    const code = await buildCode();
    try {
      created = await prisma.ticket.create({ data: { code, ...ticketData }, include: TICKET_INCLUDE });
      break;
    } catch (e) {
      if (attempt < 2 && (e as { code?: string }).code === "P2002") continue;
      throw e;
    }
  }
  const code = created.code;
  await recordTicketEvent({ ticketId: created.id, actorId: access.user.id, type: "CREATED", toValue: code });
  await broadcastPanelUpdate("tickets");

  createNotification({
    eventKey: "ticket.new",
    title: `Ticket ${code}: ${subject.trim()}`,
    detail: `${category.name} · ${access.user.fullName}`,
    href: "/panel/tickets",
    createdById: access.user.id,
    metadata: { ticketId: created.id, code, categoryId, priority: priorityValue },
  }).catch(() => {});

  if (assigneeId && assigneeId !== access.user.id) {
    createNotification({
      eventKey: "ticket.assigned",
      title: `Te asignaron la solicitud ${code}`,
      detail: `${category.name}: ${subject.trim()} · ${access.user.fullName}`,
      href: "/panel/tickets",
      targetUserId: assigneeId,
      createdById: access.user.id,
      metadata: { ticketId: created.id, code, categoryId, priority: priorityValue },
    }).catch(() => {});
  }

  return Response.json(created, { status: 201 });
}
