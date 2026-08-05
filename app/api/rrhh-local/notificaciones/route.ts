import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** Ventana del feed: eventos de los últimos 60 días. */
const WINDOW_DAYS = 60;
const PER_SOURCE = 25;

export type NotificationItem = {
  key: string;
  type: "timeoff" | "overtime" | "benefit" | "certificate" | "ticket" | "announcement";
  title: string;
  detail: string;
  createdAt: string;
  href: string;
  read: boolean;
};

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const recent = { createdAt: { gte: since } };
  const employeeInclude = { employee: { include: { user: { select: { fullName: true } } } } } as const;
  const listArgs = { orderBy: { createdAt: "desc" }, take: PER_SOURCE } as const;

  const [timeOff, overtime, benefits, certificates, tickets, announcements, reads] = await Promise.all([
    prisma.timeOffRequest.findMany({ where: recent, include: employeeInclude, ...listArgs }),
    prisma.overtimeRequest.findMany({ where: recent, include: employeeInclude, ...listArgs }),
    prisma.benefitRequest.findMany({
      where: recent,
      include: { ...employeeInclude, benefit: { select: { title: true } } },
      ...listArgs,
    }),
    prisma.certificateRequest.findMany({ where: recent, include: employeeInclude, ...listArgs }),
    prisma.ticket.findMany({
      where: recent,
      include: { ...employeeInclude, category: { select: { name: true } } },
      ...listArgs,
    }),
    prisma.announcement.findMany({ where: { ...recent, category: "RRHH", isActive: true }, ...listArgs }),
    prisma.rrhhNotificationRead.findMany({ where: { userId: access.user.id }, select: { key: true } }),
  ]);

  const readKeys = new Set(reads.map((r) => r.key));
  const TIME_OFF_LABELS: Record<string, string> = {
    VACATION: "Vacaciones", PERMIT: "Permiso", LEAVE: "Licencia",
    INCAPACITY: "Incapacidad", UNPAID: "Sin remuneración",
  };

  const items: NotificationItem[] = [
    ...timeOff.map((r) => ({
      key: `timeoff:${r.id}`,
      type: "timeoff" as const,
      title: `Nueva solicitud de ${(TIME_OFF_LABELS[r.type] ?? r.type).toLowerCase()}`,
      detail: r.employee.user.fullName,
      createdAt: r.createdAt.toISOString(),
      href: "/panel/rrhh/ausencias",
    })),
    ...overtime.map((r) => ({
      key: `overtime:${r.id}`,
      type: "overtime" as const,
      title: `Nueva solicitud de horas extra (${r.hours} h)`,
      detail: r.employee.user.fullName,
      createdAt: r.createdAt.toISOString(),
      href: "/panel/rrhh/horas-extras",
    })),
    ...benefits.map((r) => ({
      key: `benefit:${r.id}`,
      type: "benefit" as const,
      title: `Solicitud de beneficio: ${r.benefit.title}`,
      detail: r.employee.user.fullName,
      createdAt: r.createdAt.toISOString(),
      href: "/panel/rrhh/beneficios",
    })),
    ...certificates.map((r) => ({
      key: `certificate:${r.id}`,
      type: "certificate" as const,
      title: "Solicitud de certificado laboral",
      detail: r.employee.user.fullName,
      createdAt: r.createdAt.toISOString(),
      href: "/panel/rrhh/certificados",
    })),
    ...tickets.map((r) => ({
      key: `ticket:${r.id}`,
      type: "ticket" as const,
      title: `Ticket ${r.code}: ${r.subject}`,
      detail: `${r.category.name} · ${r.employee.user.fullName}`,
      createdAt: r.createdAt.toISOString(),
      href: "/panel/rrhh/solicitudes",
    })),
    ...announcements.map((r) => ({
      key: `announcement:${r.id}`,
      type: "announcement" as const,
      title: `Comunicado: ${r.title}`,
      detail: r.authorName ?? "Recursos Humanos",
      createdAt: r.createdAt.toISOString(),
      href: "/panel/rrhh/noticias",
    })),
  ]
    .map((item) => ({ ...item, read: readKeys.has(item.key) }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return Response.json({ items, unread: items.filter((i) => !i.read).length, windowDays: WINDOW_DAYS });
}

/** Marca notificaciones como leídas. Body: { keys: string[] } o { all: true, keys: string[] } */
export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const body = (await request.json()) as { keys?: unknown };
  const keys = Array.isArray(body.keys)
    ? body.keys.filter((k): k is string => typeof k === "string" && k.length > 0 && k.length <= 200)
    : [];

  if (keys.length === 0) return Response.json({ error: "keys es obligatorio" }, { status: 400 });

  await prisma.rrhhNotificationRead.createMany({
    data: keys.map((key) => ({ userId: access.user.id, key })),
    skipDuplicates: true,
  });

  return Response.json({ marked: keys.length });
}
