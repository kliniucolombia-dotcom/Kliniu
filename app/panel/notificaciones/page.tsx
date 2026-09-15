"use client";

import { MdNotificationsNone } from "react-icons/md";
import { NotificationFeed } from "@/app/panel/_components/notification-feed";
import {
  CATEGORY_THEME,
  CATEGORY_ORDER,
  notificationCategoryKey,
  notificationIcon,
} from "@/lib/notifications/ui";

export default function NotificacionesPage() {
  return (
    <NotificationFeed
      endpoint="/api/panel/notifications"
      realtimeEvents={["notifications"]}
      title="Notificaciones"
      subtitle={(windowDays) => `Actividad del panel de los últimos ${windowDays} días.`}
      emptyLabel={(windowDays) => `Sin notificaciones en los últimos ${windowDays} días.`}
      headerIcon={MdNotificationsNone}
      iconOf={notificationIcon}
      taxonomy={{
        theme: CATEGORY_THEME,
        order: CATEGORY_ORDER,
        categoryKeyOf: (item) => notificationCategoryKey(item.type, item.category),
      }}
    />
  );
}
