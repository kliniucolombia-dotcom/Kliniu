import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { computeRrhhCounts, rrhhCategoryKey, rrhhSeverity } from "@/lib/notifications/rrhh";

/** Ventana del feed: eventos de los últimos 60 días. */
const WINDOW_DAYS = 60;
const PER_SOURCE = 100;
const DEFAULT_LIMIT = 50;

export type RrhhNotificationItem = {
  id: string;
  type: "timeoff" | "overtime" | "benefit" | "certificate" | "ticket" | "announcement";
  category: string;
  title: string;
  detail: string;
  href: string;
  severity: "info" | "warning" | "urgent";
  metadata: Record<string, unknown>;
  createdAt: string;
  read: boolean;
};

type RawItem = Omit<RrhhNotificationItem, "category" | "read">;

const TIME_OFF_LABELS: Record<string, string> = {
  VACATION: "Vacaciones", PERMIT: "Permiso", LEAVE: "Licencia",
  INCAPACITY: "Incapacidad", UNPAID: "Sin remuneración",
};

/**
 * Construye el feed completo de RRHH a partir de los eventos reales del módulo.
 * Las claves de lectura se aplican antes de paginar/contear.
 */
async function buildItems(userId: string): Promise<RrhhNotificationItem[]> {
  if (!prisma) return [];

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
    prisma.rrhhNotificationRead.findMany({ where: { userId }, select: { key: true } }),
  ]);

  const readKeys = new Set(reads.map((r) => r.key));

  const items: RawItem[] = [
    ...timeOff.map((r) => ({
      id: `timeoff:${r.id}`,
      type: "timeoff" as const,
      title: `Nueva solicitud de ${(TIME_OFF_LABELS[r.type] ?? r.type).toLowerCase()}`,
      detail: r.employee.user.fullName,
      href: "/panel/rrhh/ausencias",
      severity: rrhhSeverity("timeoff", r.status),
      metadata: { status: r.status },
      createdAt: r.createdAt.toISOString(),
    })),
    ...overtime.map((r) => ({
      id: `overtime:${r.id}`,
      type: "overtime" as const,
      title: `Nueva solicitud de horas extra (${r.hours} h)`,
      detail: r.employee.user.fullName,
      href: "/panel/rrhh/horas-extras",
      severity: rrhhSeverity("overtime", r.status),
      metadata: { status: r.status },
      createdAt: r.createdAt.toISOString(),
    })),
    ...benefits.map((r) => ({
      id: `benefit:${r.id}`,
      type: "benefit" as const,
      title: `Solicitud de beneficio: ${r.benefit.title}`,
      detail: r.employee.user.fullName,
      href: "/panel/rrhh/beneficios",
      severity: rrhhSeverity("benefit", r.status),
      metadata: { status: r.status },
      createdAt: r.createdAt.toISOString(),
    })),
    ...certificates.map((r) => ({
      id: `certificate:${r.id}`,
      type: "certificate" as const,
      title: "Solicitud de certificado laboral",
      detail: r.employee.user.fullName,
      href: "/panel/rrhh/certificados",
      severity: rrhhSeverity("certificate", r.status),
      metadata: { status: r.status },
      createdAt: r.createdAt.toISOString(),
    })),
    ...tickets.map((r) => ({
      id: `ticket:${r.id}`,
      type: "ticket" as const,
      title: `Ticket ${r.code}: ${r.subject}`,
      detail: `${r.category.name} · ${r.employee.user.fullName}`,
      href: "/panel/rrhh/solicitudes",
      severity: rrhhSeverity("ticket", r.status, r.priority),
      metadata: { status: r.status, priority: r.priority },
      createdAt: r.createdAt.toISOString(),
    })),
    ...announcements.map((r) => ({
      id: `announcement:${r.id}`,
      type: "announcement" as const,
      title: `Comunicado: ${r.title}`,
      detail: r.authorName ?? "Recursos Humanos",
      href: "/panel/rrhh/noticias",
      severity: rrhhSeverity("announcement"),
      metadata: { author: r.authorName ?? null },
      createdAt: r.createdAt.toISOString(),
    })),
  ];

  return items
    .map((item) => ({ ...item, category: rrhhCategoryKey(item.type), read: readKeys.has(item.id) }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));

  const all = await buildItems(access.user.id);
  const counts = computeRrhhCounts(all);
  const items = all.slice((page - 1) * limit, (page - 1) * limit + limit);

  return Response.json({
    items,
    unread: counts.unread,
    total: counts.total,
    counts,
    page,
    limit,
    windowDays: WINDOW_DAYS,
  });
}

/**
 * Marca notificaciones como leídas.
 * Body admitido: { ids: string[] } o { keys: string[] } o { all: true }.
 */
export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const body = (await request.json()) as { ids?: unknown; keys?: unknown; all?: boolean };
  const pickKeys = (value: unknown) =>
    Array.isArray(value)
      ? value.filter((k): k is string => typeof k === "string" && k.length > 0 && k.length <= 200)
      : [];

  let keys = pickKeys(body.ids);
  if (keys.length === 0) keys = pickKeys(body.keys);
  if (keys.length === 0 && body.all) {
    const all = await buildItems(access.user.id);
    keys = all.filter((i) => !i.read).map((i) => i.id);
  }

  if (keys.length === 0) return Response.json({ marked: 0 });

  await prisma.rrhhNotificationRead.createMany({
    data: keys.map((key) => ({ userId: access.user.id, key })),
    skipDuplicates: true,
  });

  return Response.json({ marked: keys.length });
}
