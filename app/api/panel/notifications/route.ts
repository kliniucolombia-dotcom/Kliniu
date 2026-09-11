import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

const WINDOW_DAYS = 60;
const DEFAULT_LIMIT = 50;

export type ApiNotificationItem = {
  id: string;
  type: string;
  category: string;
  title: string;
  detail: string;
  href: string | null;
  severity: string;
  metadata: unknown;
  createdAt: string;
  read: boolean;
};

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type") ?? "";
    const unreadOnly = searchParams.get("unread") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10)));
    const skip = (page - 1) * limit;

    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const userRole = access.user.role;
    const isSA = isSuperAdmin(access.user);

    const roleFilter = isSA
      ? {}
      : {
          OR: [
            { targetRoles: { contains: `"${userRole}"` } },
            { targetUserId: access.user.id },
          ],
        };

    const where = {
      createdAt: { gte: since },
      ...roleFilter,
      ...(typeFilter ? { type: typeFilter } : {}),
    };

    // Paso 1: traer notificaciones
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        type: true,
        category: true,
        title: true,
        detail: true,
        href: true,
        severity: true,
        metadata: true,
        createdAt: true,
      },
    });

    // Paso 2: traer cuáles leyó el usuario
    const notifIds = notifications.map((n) => n.id);
    const readRecords = notifIds.length > 0
      ? await prisma.notificationRead.findMany({
          where: { userId: access.user.id, notificationId: { in: notifIds } },
          select: { notificationId: true },
        })
      : [];
    const readSet = new Set(readRecords.map((r) => r.notificationId));

    // Paso 3: contar no leídas (total, sin paginación)
    const allNotifs = await prisma.notification.findMany({
      where: {
        createdAt: { gte: since },
        ...roleFilter,
      },
      select: { id: true },
    });
    const allIds = allNotifs.map((n) => n.id);
    const allReads = allIds.length > 0
      ? await prisma.notificationRead.findMany({
          where: { userId: access.user.id, notificationId: { in: allIds } },
          select: { notificationId: true },
        })
      : [];
    const allReadSet = new Set(allReads.map((r) => r.notificationId));
    const unread = allNotifs.filter((n) => !allReadSet.has(n.id)).length;

    const result: ApiNotificationItem[] = notifications.map((n) => ({
      id: n.id,
      type: n.type,
      category: n.category,
      title: n.title,
      detail: n.detail,
      href: n.href,
      severity: n.severity,
      metadata: n.metadata,
      createdAt: n.createdAt.toISOString(),
      read: readSet.has(n.id),
    }));

    const filtered = unreadOnly ? result.filter((r) => !r.read) : result;

    return Response.json({
      items: filtered,
      unread,
      total: unread + readSet.size,
      page,
      limit,
      windowDays: WINDOW_DAYS,
    });
  } catch (e) {
    console.error("[notifications GET]", e);
    return Response.json({ error: "Error al cargar notificaciones", detail: String(e) }, { status: 500 });
  }
}

/** Marca notificaciones como leídas. Body: { ids: string[] } o { all: true } */
export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = (await request.json()) as { ids?: unknown; all?: boolean };

  let notificationIds: string[] = [];

  if (body.all) {
    // Marcar todas como leídas
    const userRole = access.user.role;
    const isSA = isSuperAdmin(access.user);
    const roleFilter = isSA
      ? {}
      : {
          OR: [
            { targetRoles: { contains: `"${userRole}"` } },
            { targetUserId: access.user.id },
          ],
        };
    const unreadNotifs = await prisma.notification.findMany({
      where: {
        ...roleFilter,
        reads: { none: { userId: access.user.id } },
      },
      select: { id: true },
    });
    notificationIds = unreadNotifs.map((n) => n.id);
  } else if (Array.isArray(body.ids)) {
    notificationIds = body.ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200);
  }

  if (notificationIds.length === 0) {
    return Response.json({ marked: 0 });
  }

  await prisma.notificationRead.createMany({
    data: notificationIds.map((notificationId) => ({
      notificationId,
      userId: access.user.id,
    })),
    skipDuplicates: true,
  });

  return Response.json({ marked: notificationIds.length });
}
