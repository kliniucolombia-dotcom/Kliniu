import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { NOTIFICATION_EVENTS, type NotificationSeverity } from "./events";
import { sendNotificationEmail } from "./email";

type CreateNotificationInput = {
  eventKey?: string;
  type?: string;
  category?: string;
  title: string;
  detail: string;
  href?: string;
  severity?: NotificationSeverity;
  targetRoles?: string[];
  targetUserId?: string;
  createdById?: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
};

/**
 * Crea una notificación, la persiste, emite broadcast real-time y opcionalmente envía email.
 * Si `eventKey` se provee, usa la configuración del mapa de eventos para defaultear
 * targetRoles, severity y sendEmail. Los campos explícitos sobreescriben los defaults.
 */
export async function createNotification(input: CreateNotificationInput) {
  if (!prisma) return null;

  const config = input.eventKey ? NOTIFICATION_EVENTS[input.eventKey] : null;

  const type = input.type ?? config?.type ?? "info";
  const category = input.category ?? config?.category ?? "general";
  const severity = input.severity ?? config?.severity ?? "info";
  const targetRoles = input.targetRoles ?? config?.targetRoles?.map((r) => r) ?? [];
  const shouldSendEmail = input.sendEmail ?? config?.sendEmail ?? false;

  const notification = await prisma.notification.create({
    data: {
      type,
      category,
      title: input.title,
      detail: input.detail,
      href: input.href ?? null,
      severity,
      targetRoles: JSON.stringify(targetRoles),
      targetUserId: input.targetUserId ?? null,
      createdById: input.createdById ?? null,
      metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      emailSent: false,
    },
  });

  // Broadcast real-time
  broadcastPanelUpdate("notifications").catch(() => {});

  // Email para eventos críticos
  if (shouldSendEmail && targetRoles.length > 0) {
    try {
      await sendNotificationEmail({
        id: notification.id,
        type,
        category,
        title: input.title,
        detail: input.detail,
        severity,
        targetRoles: targetRoles as string[],
      });
      await prisma.notification.update({
        where: { id: notification.id },
        data: { emailSent: true },
      });
    } catch {
      // Email failure is non-blocking
    }
  }

  return notification;
}
