/**
 * Clasificación visual de notificaciones.
 *
 * La categoría se deriva del `type` (módulo) y, cuando aplica, del `category`
 * (sub-tipo). El color se aplica de forma sutil: ícono, línea lateral y
 * etiqueta; nunca sobre toda la tarjeta.
 *
 * Este archivo es puro (sin React) para poder importarse desde el servidor
 * (API de notificaciones) y desde el cliente.
 */

export type CategoryKey =
  | "comercial"
  | "soporte"
  | "pqrs"
  | "compras"
  | "cotizacion"
  | "facturacion"
  | "operaciones"
  | "rrhh"
  | "sistema"
  | "alertas";

export type CategoryTheme = {
  label: string;
  /** Color base para la línea lateral y el punto de estado. */
  accent: string;
  /** Fondo suave + color del ícono. */
  icon: string;
  /** Fondo suave + color de la etiqueta. */
  pill: string;
};

export const CATEGORY_THEME: Record<CategoryKey, CategoryTheme> = {
  comercial: {
    label: "Comercial",
    accent: "#3B82F6",
    icon: "bg-[#DBEAFE] text-[#1D4ED8]",
    pill: "bg-[#DBEAFE] text-[#1D4ED8]",
  },
  soporte: {
    label: "Soporte",
    accent: "#16B8C4",
    icon: "bg-[#E6FAFB] text-[#0C8A90]",
    pill: "bg-[#E6FAFB] text-[#0C8A90]",
  },
  pqrs: {
    label: "PQRS",
    accent: "#F59E0B",
    icon: "bg-[#FEF3C7] text-[#B45309]",
    pill: "bg-[#FEF3C7] text-[#B45309]",
  },
  compras: {
    label: "Compras",
    accent: "#10B981",
    icon: "bg-[#D1FAE5] text-[#047857]",
    pill: "bg-[#D1FAE5] text-[#047857]",
  },
  cotizacion: {
    label: "Cotización",
    accent: "#6366F1",
    icon: "bg-[#E0E7FF] text-[#4338CA]",
    pill: "bg-[#E0E7FF] text-[#4338CA]",
  },
  facturacion: {
    label: "Facturación",
    accent: "#8B5CF6",
    icon: "bg-[#EDE9FE] text-[#6D28D9]",
    pill: "bg-[#EDE9FE] text-[#6D28D9]",
  },
  operaciones: {
    label: "Operaciones",
    accent: "#0EA5E9",
    icon: "bg-[#E0F2FE] text-[#0369A1]",
    pill: "bg-[#E0F2FE] text-[#0369A1]",
  },
  rrhh: {
    label: "Recursos Humanos",
    accent: "#EC4899",
    icon: "bg-[#FCE7F3] text-[#BE185D]",
    pill: "bg-[#FCE7F3] text-[#BE185D]",
  },
  sistema: {
    label: "Sistema",
    accent: "#64748B",
    icon: "bg-[#F1F5F9] text-[#475569]",
    pill: "bg-[#F1F5F9] text-[#475569]",
  },
  alertas: {
    label: "Alertas importantes",
    accent: "#EF4444",
    icon: "bg-[#FEE2E2] text-[#DC2626]",
    pill: "bg-[#FEE2E2] text-[#DC2626]",
  },
};

/** Orden de aparición de las categorías (excluye "alertas", que es transversal). */
export const CATEGORY_ORDER: CategoryKey[] = [
  "comercial",
  "soporte",
  "pqrs",
  "compras",
  "cotizacion",
  "facturacion",
  "operaciones",
  "rrhh",
  "sistema",
];

export function notificationCategoryKey(type: string, category?: string): CategoryKey {
  if (type === "order" || type === "campaign") return "comercial";
  if (type === "quotation") return "cotizacion";
  if (type === "ticket") return category && /pqrs|petici|queja|reclamo/i.test(category) ? "pqrs" : "soporte";
  if (type === "inventory") return "compras";
  if (type === "hr") return "rrhh";
  if (type === "production" || type === "logistics" || type === "maintenance") return "operaciones";
  return "sistema";
}

export function notificationCategory(type: string, category?: string): CategoryTheme {
  return CATEGORY_THEME[notificationCategoryKey(type, category)];
}

export type PriorityKey = "alta" | "media" | "baja";

export const PRIORITY_THEME: Record<PriorityKey, { label: string; accent: string; badge: string }> = {
  alta: { label: "Alta", accent: "#EF4444", badge: "bg-[#FEE2E2] text-[#DC2626]" },
  media: { label: "Media", accent: "#F59E0B", badge: "bg-[#FEF3C7] text-[#B45309]" },
  baja: { label: "Baja", accent: "#64748B", badge: "bg-[#F1F5F9] text-[#475569]" },
};

export const PRIORITY_ORDER: PriorityKey[] = ["alta", "media", "baja"];

/** Traduce la severidad almacenada a un nivel de prioridad legible. */
export function notificationPriority(severity: string): PriorityKey {
  if (severity === "urgent") return "alta";
  if (severity === "warning") return "media";
  return "baja";
}

/** Una notificación "importante" requiere atención: prioridad alta. */
export function isImportant(severity: string): boolean {
  return notificationPriority(severity) === "alta";
}

export type DateGroupKey = "hoy" | "ayer" | "semana" | "anteriores";

export const DATE_GROUPS: { key: DateGroupKey; label: string }[] = [
  { key: "hoy", label: "Hoy" },
  { key: "ayer", label: "Ayer" },
  { key: "semana", label: "Esta semana" },
  { key: "anteriores", label: "Anteriores" },
];

export function dateGroupKey(iso: string, now: Date = new Date()): DateGroupKey {
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(iso).getTime();
  if (t >= startOfToday) return "hoy";
  if (t >= startOfToday - 86_400_000) return "ayer";
  if (t >= startOfToday - 6 * 86_400_000) return "semana";
  return "anteriores";
}

export type NotificationCounts = {
  total: number;
  unread: number;
  important: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
};

export function computeNotificationCounts(
  items: { type: string; category: string; severity: string; read: boolean }[],
): NotificationCounts {
  const counts: NotificationCounts = {
    total: items.length,
    unread: 0,
    important: 0,
    byCategory: {},
    byPriority: {},
  };
  for (const item of items) {
    const key = notificationCategoryKey(item.type, item.category);
    counts.byCategory[key] = (counts.byCategory[key] ?? 0) + 1;
    const priority = notificationPriority(item.severity);
    counts.byPriority[priority] = (counts.byPriority[priority] ?? 0) + 1;
    if (!item.read) counts.unread++;
    if (priority === "alta") counts.important++;
  }
  return counts;
}
