import type { IconType } from "react-icons";
import {
  MdBarChart, MdInventory2, MdChat, MdDescription, MdCampaign, MdCategory, MdCardGiftcard,
  MdLocalShipping, MdPrecisionManufacturing, MdGroup, MdVerifiedUser, MdSettings, MdLocalOffer,
  MdWarehouse, MdBuild, MdChecklist, MdConfirmationNumber, MdExtension, MdImage, MdFolder,
  MdAttachMoney, MdCalculate, MdInsights, MdCalendarMonth, MdVideocam, MdHandshake, MdHistory,
} from "react-icons/md";

/** Tono de la paleta: define el color del icono (ver .panel-tone-* en globals.css). */
export type PanelTone = 1 | 2 | 3 | 4 | 5;

export type PanelApp = {
  key: string;
  label: string;
  href: string;
  /** Permiso (PanelModule) requerido para verla. */
  module: string;
  /** Alternativa: visible si el usuario ve cualquiera de estos. */
  anyModule?: string[];
  icon: IconType;
  tone: PanelTone;
  superAdminOnly?: boolean;
  /** Aparece también en la barra inferior. */
  dock?: boolean;
};

export const PANEL_APPS: PanelApp[] = [
  { key: "tablero", label: "Tablero", href: "/panel/tablero", module: "MODULE_DASHBOARD", icon: MdBarChart, tone: 1, dock: true },
  { key: "pedidos", label: "Pedidos", href: "/panel/pedidos", module: "MODULE_PEDIDOS", icon: MdInventory2, tone: 2, dock: true },
  { key: "whatsapp", label: "WhatsApp", href: "/panel/whatsapp", module: "MODULE_WHATSAPP", icon: MdChat, tone: 3, dock: true },
  { key: "cotizaciones", label: "Cotizaciones", href: "/panel/cotizaciones", module: "MODULE_COTIZACIONES", icon: MdDescription, tone: 4, dock: true },
  { key: "campanas", label: "Campañas", href: "/panel/campanas", module: "MODULE_CAMPANAS", icon: MdCampaign, tone: 5 },
  { key: "calendario", label: "Calendario", href: "/panel/calendario", module: "MODULE_CAMPANAS", icon: MdCalendarMonth, tone: 3 },
  { key: "metricas", label: "Métricas", href: "/panel/metricas", module: "MODULE_METRICAS", icon: MdInsights, tone: 1 },
  { key: "productos", label: "Productos", href: "/panel/productos", module: "MODULE_PRODUCTOS", icon: MdCategory, tone: 1, dock: true },
  { key: "combos", label: "Combos", href: "/panel/combos", module: "MODULE_COMBOS", icon: MdCardGiftcard, tone: 2 },
  { key: "mis-combos", label: "Mis Combos", href: "/panel/mis-combos", module: "MODULE_MIS_COMBOS", icon: MdLocalOffer, tone: 4 },
  { key: "outlet", label: "Outlet", href: "/panel/outlet", module: "MODULE_OUTLET", icon: MdLocalOffer, tone: 3 },
  { key: "banners", label: "Diseño", href: "/panel/banners", module: "MODULE_BANNERS", icon: MdImage, tone: 5 },
  { key: "videos", label: "Videos", href: "/panel/videos-soluciones", module: "MODULE_BANNERS", icon: MdVideocam, tone: 2 },
  { key: "material", label: "Material Comercial", href: "/panel/material-comercial", module: "MODULE_MATERIAL", icon: MdFolder, tone: 4 },
  { key: "costos", label: "Costos", href: "/panel/costos", module: "MODULE_COSTOS", icon: MdAttachMoney, tone: 2 },
  { key: "precio", label: "Precio de Venta", href: "/panel/calculadora-precio", module: "MODULE_CALCULADORA_PRECIO", icon: MdCalculate, tone: 1 },
  {
    key: "operaciones", label: "Operaciones", href: "/panel/operaciones", module: "MODULE_PRODUCCION",
    anyModule: ["MODULE_PRODUCCION", "MODULE_ENSAMBLE", "MODULE_BODEGAS", "MODULE_LOGISTICA", "MODULE_MANTENIMIENTO"],
    icon: MdPrecisionManufacturing, tone: 4, dock: true,
  },
  { key: "inyeccion", label: "Inyección", href: "/panel/produccion", module: "MODULE_PRODUCCION", icon: MdPrecisionManufacturing, tone: 2 },
  { key: "ensamble", label: "Ensamble", href: "/panel/ensamble", module: "MODULE_ENSAMBLE", icon: MdHandshake, tone: 3 },
  { key: "empaque", label: "Empaque", href: "/panel/empaque", module: "MODULE_PEDIDOS", icon: MdInventory2, tone: 5 },
  { key: "logistica", label: "Logística", href: "/panel/logistica", module: "MODULE_LOGISTICA", icon: MdLocalShipping, tone: 3, dock: true },
  { key: "bodegas", label: "Bodegas", href: "/panel/bodegas", module: "MODULE_BODEGAS", icon: MdWarehouse, tone: 5 },
  { key: "mantenimiento", label: "Mantenimiento", href: "/panel/mantenimiento", module: "MODULE_MANTENIMIENTO", icon: MdBuild, tone: 2 },
  { key: "tareas", label: "Tareas", href: "/panel/tareas", module: "MODULE_TAREAS", icon: MdChecklist, tone: 1 },
  { key: "solicitudes", label: "Solicitudes", href: "/panel/tickets", module: "MODULE_TICKETS", icon: MdConfirmationNumber, tone: 3 },
  { key: "odoo", label: "Odoo", href: "/panel/odoo", module: "MODULE_ODOO", icon: MdExtension, tone: 5 },
  { key: "rrhh", label: "RRHH", href: "/panel/rrhh", module: "MODULE_RRHH", icon: MdGroup, tone: 5, dock: true },
  { key: "usuarios", label: "Usuarios y permisos", href: "/panel/usuarios", module: "MODULE_USUARIOS", icon: MdVerifiedUser, tone: 1, dock: true },
  { key: "bitacora", label: "Bitácora", href: "/panel/bitacora", module: "MODULE_USUARIOS", icon: MdHistory, tone: 4, superAdminOnly: true },
  { key: "configuracion", label: "Configuración", href: "/panel/configuracion/modo-venta", module: "MODULE_USUARIOS", icon: MdSettings, tone: 2, superAdminOnly: true, dock: true },
];

export function canSeeApp(app: PanelApp, can: (m: string) => boolean, isSuperAdmin: boolean): boolean {
  if (app.superAdminOnly && !isSuperAdmin) return false;
  return app.anyModule ? app.anyModule.some(can) : can(app.module);
}
