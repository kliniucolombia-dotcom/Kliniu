import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { computeNotificationCounts } from "@/lib/notifications/categories";
import {
  getPanelNotificationsForUser,
  NOTIFICATIONS_WINDOW_DAYS,
} from "@/lib/notifications/query";

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

    const all = await getPanelNotificationsForUser(access.user, {
      type: typeFilter || undefined,
      windowDays: NOTIFICATIONS_WINDOW_DAYS,
    });

    const counts = computeNotificationCounts(
      all.map((n) => ({
        type: n.type,
        category: n.category,
        severity: n.severity,
        read: n.read,
      })),
    );

    const visible = unreadOnly ? all.filter((n) => !n.read) : all;
    const pageItems = visible.slice((page - 1) * limit, (page - 1) * limit + limit);

    const items: ApiNotificationItem[] = pageItems.map((n) => ({
      id: n.id,
      type: n.type,
      category: n.category,
      title: n.title,
      detail: n.detail,
      href: n.href,
      severity: n.severity,
      metadata: n.metadata,
      createdAt: n.createdAt.toISOString(),
      read: n.read,
    }));

    return Response.json({
      items,
      unread: counts.unread,
      total: counts.total,
      counts,
      page,
      limit,
      windowDays: NOTIFICATIONS_WINDOW_DAYS,
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
    const all = await getPanelNotificationsForUser(access.user);
    notificationIds = all.filter((n) => !n.read).map((n) => n.id);
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

/**
 * Elimina (descarta) notificaciones solo para el usuario que las borra.
 * Body: { ids: string[] } o { all: true }.
 */
export async function DELETE(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as { ids?: unknown; all?: boolean };

  let notificationIds: string[] = [];

  if (body.all) {
    const all = await getPanelNotificationsForUser(access.user);
    notificationIds = all.map((n) => n.id);
  } else if (Array.isArray(body.ids)) {
    notificationIds = body.ids.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 200);
  }

  if (notificationIds.length === 0) {
    return Response.json({ dismissed: 0 });
  }

  await prisma.notificationDismissal.createMany({
    data: notificationIds.map((notificationId) => ({
      notificationId,
      userId: access.user.id,
    })),
    skipDuplicates: true,
  });

  broadcastPanelUpdate("notifications").catch(() => {});

  return Response.json({ dismissed: notificationIds.length });
}
