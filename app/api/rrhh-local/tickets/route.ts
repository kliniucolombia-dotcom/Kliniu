import { requireActiveUser } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

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

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const body = await request.json();
  const { categoryId, priority, subject, description, location, extraFields, attachments } = body as {
    categoryId?: string;
    priority?: string;
    subject?: string;
    description?: string;
    location?: string;
    extraFields?: Record<string, unknown>;
    attachments?: { url: string; name: string; size?: number }[];
  };

  if (!categoryId || !subject?.trim() || !description?.trim()) {
    return Response.json({ error: "categoryId, subject y description son obligatorios" }, { status: 400 });
  }

  const category = await prisma.requestCategory.findUnique({ where: { id: categoryId } });
  if (!category || !category.active) {
    return Response.json({ error: "Categoría no disponible" }, { status: 400 });
  }

  const priorityValue = ["BAJA", "MEDIA", "ALTA", "URGENTE"].includes(priority || "") ? priority : "MEDIA";

  const safeAttachments = (attachments || []).filter((a) => {
    try {
      return ["http:", "https:"].includes(new URL(a.url).protocol);
    } catch {
      return false;
    }
  });

  const count = await prisma.ticket.count();
  const code = `TK-${String(count + 1).padStart(6, "0")}`;

  const created = await prisma.ticket.create({
    data: {
      code,
      employeeId: employee.id,
      categoryId,
      priority: priorityValue as never,
      subject: subject.trim(),
      description: description.trim(),
      location: location?.trim() || null,
      extraFields: (extraFields ?? {}) as never,
      responsibleId: category.defaultResponsibleId,
      attachments: safeAttachments.length
        ? { create: safeAttachments.map((a) => ({ url: a.url, name: a.name, size: a.size })) }
        : undefined,
    },
    include: TICKET_INCLUDE,
  });
  await broadcastPanelUpdate("tickets");
  return Response.json(created, { status: 201 });
}
