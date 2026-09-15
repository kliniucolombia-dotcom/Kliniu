/**
 * Taxonomía del feed de notificaciones de RRHH.
 *
 * El feed de RRHH se deriva de eventos reales del módulo (solicitudes, tickets
 * y comunicados), no de la tabla `Notification`. Aquí se define cómo se agrupan
 * esos eventos en categorías, cómo se les asigna prioridad y cómo se cuentan.
 *
 * Este archivo es puro (sin React) para poder importarse desde el servidor
 * (API de notificaciones de RRHH) y desde el cliente.
 */

import {
  notificationPriority,
  type CategoryTheme,
  type NotificationCounts,
} from "./categories";

export type RrhhItemType =
  | "timeoff"
  | "overtime"
  | "benefit"
  | "certificate"
  | "ticket"
  | "announcement";

export type RrhhCategoryKey =
  | "ausencias"
  | "horas_extra"
  | "beneficios"
  | "certificados"
  | "solicitudes"
  | "comunicados";

export const RRHH_CATEGORY_THEME: Record<RrhhCategoryKey, CategoryTheme> = {
  ausencias: {
    label: "Ausencias",
    accent: "#16B8C4",
    icon: "bg-[#E6FAFB] text-[#0C8A90]",
    pill: "bg-[#E6FAFB] text-[#0C8A90]",
  },
  horas_extra: {
    label: "Horas extra",
    accent: "#F59E0B",
    icon: "bg-[#FEF3C7] text-[#B45309]",
    pill: "bg-[#FEF3C7] text-[#B45309]",
  },
  beneficios: {
    label: "Beneficios",
    accent: "#10B981",
    icon: "bg-[#D1FAE5] text-[#047857]",
    pill: "bg-[#D1FAE5] text-[#047857]",
  },
  certificados: {
    label: "Certificados",
    accent: "#6366F1",
    icon: "bg-[#E0E7FF] text-[#4338CA]",
    pill: "bg-[#E0E7FF] text-[#4338CA]",
  },
  solicitudes: {
    label: "Solicitudes",
    accent: "#EC4899",
    icon: "bg-[#FCE7F3] text-[#BE185D]",
    pill: "bg-[#FCE7F3] text-[#BE185D]",
  },
  comunicados: {
    label: "Comunicados",
    accent: "#8B5CF6",
    icon: "bg-[#EDE9FE] text-[#6D28D9]",
    pill: "bg-[#EDE9FE] text-[#6D28D9]",
  },
};

export const RRHH_CATEGORY_ORDER: RrhhCategoryKey[] = [
  "ausencias",
  "horas_extra",
  "beneficios",
  "certificados",
  "solicitudes",
  "comunicados",
];

const TYPE_CATEGORY: Record<RrhhItemType, RrhhCategoryKey> = {
  timeoff: "ausencias",
  overtime: "horas_extra",
  benefit: "beneficios",
  certificate: "certificados",
  ticket: "solicitudes",
  announcement: "comunicados",
};

export function rrhhCategoryKey(type: string): RrhhCategoryKey {
  return TYPE_CATEGORY[type as RrhhItemType] ?? "solicitudes";
}

export function rrhhCategory(type: string): CategoryTheme {
  return RRHH_CATEGORY_THEME[rrhhCategoryKey(type)];
}

/**
 * Prioridad derivada del estado/urgencia real del evento:
 * tickets urgentes => alta, tickets altos y solicitudes pendientes => media,
 * el resto => baja.
 */
export function rrhhSeverity(
  type: string,
  status?: string | null,
  priority?: string | null,
): "info" | "warning" | "urgent" {
  if (type === "ticket") {
    if (priority === "URGENTE") return "urgent";
    if (priority === "ALTA") return "warning";
    return "info";
  }
  if (status === "PENDING") return "warning";
  return "info";
}

export function computeRrhhCounts(
  items: { type: string; severity: string; read: boolean }[],
): NotificationCounts {
  const counts: NotificationCounts = {
    total: items.length,
    unread: 0,
    important: 0,
    byCategory: {},
    byPriority: {},
  };
  for (const item of items) {
    const key = rrhhCategoryKey(item.type);
    counts.byCategory[key] = (counts.byCategory[key] ?? 0) + 1;
    const priority = notificationPriority(item.severity);
    counts.byPriority[priority] = (counts.byPriority[priority] ?? 0) + 1;
    if (!item.read) counts.unread++;
    if (priority === "alta") counts.important++;
  }
  return counts;
}
