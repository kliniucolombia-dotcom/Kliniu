"use client";

import {
  MdNotificationsNone, MdBeachAccess, MdAccessTime, MdCardGiftcard,
  MdDescription, MdSupportAgent, MdCampaign,
} from "react-icons/md";
import { NotificationFeed } from "@/app/panel/_components/notification-feed";
import {
  RRHH_CATEGORY_THEME,
  RRHH_CATEGORY_ORDER,
  rrhhCategoryKey,
} from "@/lib/notifications/rrhh";

const TYPE_ICON: Record<string, React.ElementType> = {
  timeoff: MdBeachAccess,
  overtime: MdAccessTime,
  benefit: MdCardGiftcard,
  certificate: MdDescription,
  ticket: MdSupportAgent,
  announcement: MdCampaign,
};

export default function NotificacionesRrhhPage() {
  return (
    <NotificationFeed
      endpoint="/api/rrhh-local/notificaciones"
      realtimeEvents={["timeoff", "tickets", "notifications"]}
      title="Notificaciones"
      subtitle={(windowDays) =>
        `Actividad de RRHH de los últimos ${windowDays} días: solicitudes, tickets y comunicados.`
      }
      emptyLabel={(windowDays) => `Sin actividad de RRHH en los últimos ${windowDays} días.`}
      headerIcon={MdNotificationsNone}
      iconOf={(type) => TYPE_ICON[type] ?? MdNotificationsNone}
      taxonomy={{
        theme: RRHH_CATEGORY_THEME,
        order: RRHH_CATEGORY_ORDER,
        categoryKeyOf: (item) => rrhhCategoryKey(item.type),
      }}
    />
  );
}
