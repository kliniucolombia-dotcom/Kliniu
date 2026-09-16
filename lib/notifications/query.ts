/**
 * Lectura del feed de notificaciones generales del panel.
 *
 * Aplica los filtros que dependen del usuario y del estado real de los eventos:
 * - descarta las notificaciones que el usuario ya eliminó (NotificationDismissal);
 * - oculta las notificaciones de tickets ya resueltos (FINALIZADO / CANCELADO),
 *   que dejan de ser accionables y no deben volver a aparecer;
 * - marca cuáles leyó el usuario (NotificationRead).
 *
 * Se usa tanto desde el feed paginado como desde el contador del campanario,
 * para que ambos números siempre coincidan.
 */

import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";
import type { TicketStatus, UserRole } from "@/generated/prisma/client";

export const NOTIFICATIONS_WINDOW_DAYS = 60;

/** Estados de ticket que ya no requieren acción. */
const RESOLVED_TICKET_STATUSES: TicketStatus[] = ["FINALIZADO", "CANCELADO"];

export type PanelNotification = {
  id: string;
  type: string;
  category: string;
  title: string;
  detail: string;
  href: string | null;
  severity: string;
  metadata: unknown;
  createdAt: Date;
  read: boolean;
};

function ticketIdOf(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const value = (metadata as Record<string, unknown>).ticketId;
  return typeof value === "string" && value.length > 0 ? value : null;
}

/**
 * Feed completo (sin paginar) de notificaciones visibles para un usuario,
 * ordenado de más reciente a más antigua.
 */
export async function getPanelNotificationsForUser(
  user: { id: string; role: UserRole },
  options: { type?: string; windowDays?: number } = {},
): Promise<PanelNotification[]> {
  if (!prisma) return [];

  const windowDays = options.windowDays ?? NOTIFICATIONS_WINDOW_DAYS;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const roleFilter = isSuperAdmin(user)
    ? {}
    : {
        OR: [
          { targetRoles: { contains: `"${user.role}"` } },
          { targetUserId: user.id },
        ],
      };

  const notifications = await prisma.notification.findMany({
    where: {
      createdAt: { gte: since },
      ...roleFilter,
      ...(options.type ? { type: options.type } : {}),
    },
    orderBy: { createdAt: "desc" },
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

  const ids = notifications.map((n) => n.id);

  const [dismissals, reads] = ids.length > 0
    ? await Promise.all([
        prisma.notificationDismissal.findMany({
          where: { userId: user.id, notificationId: { in: ids } },
          select: { notificationId: true },
        }),
        prisma.notificationRead.findMany({
          where: { userId: user.id, notificationId: { in: ids } },
          select: { notificationId: true },
        }),
      ])
    : [[], []];

  const dismissed = new Set(dismissals.map((d) => d.notificationId));
  const readSet = new Set(reads.map((r) => r.notificationId));

  const ticketIds = Array.from(
    new Set(
      notifications
        .map((n) => ticketIdOf(n.metadata))
        .filter((id): id is string => Boolean(id)),
    ),
  );

  let resolvedTicketIds = new Set<string>();
  if (ticketIds.length > 0) {
    const tickets = await prisma.ticket.findMany({
      where: { id: { in: ticketIds }, status: { in: RESOLVED_TICKET_STATUSES } },
      select: { id: true },
    });
    resolvedTicketIds = new Set(tickets.map((t) => t.id));
  }

  return notifications
    .filter((n) => !dismissed.has(n.id))
    .filter((n) => {
      const ticketId = ticketIdOf(n.metadata);
      return !(ticketId && resolvedTicketIds.has(ticketId));
    })
    .map((n) => ({ ...n, read: readSet.has(n.id) }));
}
