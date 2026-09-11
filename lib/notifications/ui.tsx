import {
  MdNotificationsNone, MdShoppingCart, MdDescription, MdSupportAgent, MdWork,
  MdPrecisionManufacturing, MdInventory2, MdLocalShipping,
  MdBuild, MdPeople, MdCampaign, MdAnnouncement,
} from "react-icons/md";

export const TYPE_ICON: Record<string, React.ElementType> = {
  order: MdShoppingCart,
  quotation: MdDescription,
  ticket: MdSupportAgent,
  hr: MdWork,
  production: MdPrecisionManufacturing,
  inventory: MdInventory2,
  logistics: MdLocalShipping,
  maintenance: MdBuild,
  user: MdPeople,
  campaign: MdCampaign,
  announcement: MdAnnouncement,
};

export const TYPE_LABEL: Record<string, string> = {
  order: "Pedidos",
  quotation: "Cotizaciones",
  ticket: "Solicitudes",
  hr: "Recursos Humanos",
  production: "Producción",
  inventory: "Inventario",
  logistics: "Logística",
  maintenance: "Mantenimiento",
  user: "Usuarios",
  campaign: "Campañas",
  announcement: "Comunicados",
};

/** Módulo del panel al que pertenece cada tipo, para el badge de categoría. */
export const MODULE_LABEL: Record<string, string> = {
  order: "Comercial",
  quotation: "Comercial",
  campaign: "Comercial",
  ticket: "Soporte",
  hr: "Recursos Humanos",
  production: "Operaciones",
  maintenance: "Operaciones",
  logistics: "Operaciones",
  inventory: "Catálogo",
  user: "Configuración",
  announcement: "Comunicados",
};

export const SEVERITY_THEME: Record<string, { dot: string; icon: string; pill: string }> = {
  info: { dot: "bg-[#27B1B8]", icon: "bg-[#E6FAFB] text-[#27B1B8]", pill: "bg-[#E6FAFB] text-[#0C8A90]" },
  warning: { dot: "bg-[#F59E0B]", icon: "bg-[#FEF3C7] text-[#B45309]", pill: "bg-[#FEF3C7] text-[#B45309]" },
  urgent: { dot: "bg-[#EF4444]", icon: "bg-[#FEE2E2] text-[#DC2626]", pill: "bg-[#FEE2E2] text-[#DC2626]" },
};

export function notificationIcon(type: string) {
  return TYPE_ICON[type] ?? MdNotificationsNone;
}

export function notificationModuleLabel(type: string) {
  return MODULE_LABEL[type] ?? TYPE_LABEL[type] ?? type;
}

export function severityTheme(severity: string) {
  return SEVERITY_THEME[severity] ?? SEVERITY_THEME.info;
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  if (days < 30) return `Hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}
