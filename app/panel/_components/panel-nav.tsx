import {
  MdDashboard, MdInventory2, MdCategory, MdBarChart, MdCampaign, MdAttachMoney, MdSettings,
  MdCalculate, MdDescription, MdPrecisionManufacturing, MdAssignment, MdPeople, MdImage, MdVerified,
  MdCardGiftcard, MdLocalOffer, MdWork, MdHome, MdSearch, MdNotificationsNone, MdPersonOutline,
  MdApartment, MdAccessTime, MdBeachAccess, MdRemoveCircleOutline, MdSwapHoriz, MdHandshake,
  MdCreditCard, MdHelpOutline, MdGroup, MdWarehouse, MdArticle, MdSmartToy, MdShoppingCart,
  MdInventory, MdExtension, MdConfirmationNumber, MdChat, MdVideocam, MdFolder,
  MdLocalShipping, MdBuild, MdCalendarMonth, MdChecklist, MdPublic, MdHistory, MdFactCheck,
} from "react-icons/md";

export type NavChild = {
  href: string;
  label: string;
  module: string;
  /** Visible si el usuario ve cualquiera de estos módulos (para vistas transversales). */
  anyModule?: string[];
  group?: string;
  groupIcon?: React.ReactNode;
  icon?: React.ReactNode;
  superAdminOnly?: boolean;
  /** Copia de un módulo cuyo departamento "dueño" es otro (no marca el departamento activo en el dock). */
  shared?: boolean;
};

export type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  module?: string;
  children?: NavChild[];
  /** Herramienta común a todos los departamentos (fila fija en el inicio). */
  tool?: boolean;
  /** Sub-área con muchas páginas que se entra desde un tile de otro departamento (no sale como departamento). */
  parent?: string;
};

const productos: NavChild = { href: "/panel/productos", label: "Productos", module: "MODULE_PRODUCTOS", icon: <MdCategory size={17} /> };
const precioVenta: NavChild = { href: "/panel/calculadora-precio", label: "Precio de Venta", module: "MODULE_CALCULADORA_PRECIO", icon: <MdCalculate size={17} /> };

/**
 * Departamentos según el organigrama (Comercial, Operaciones, Administración) + herramientas compartidas (tool).
 * Un módulo compartido se repite con `shared: true`. Talento Humano es sub-área de Administración (`parent`).
 */
export const NAV: NavItem[] = [
  { key: "inicio", href: "/panel", label: "Inicio", icon: <MdDashboard size={18} />, module: "MODULE_DASHBOARD" },
  {
    key: "comercial",
    href: "/panel/pedidos",
    label: "Comercial",
    icon: <MdShoppingCart size={18} />,
    children: [
      { href: "/panel/pedidos", label: "Pedidos", module: "MODULE_PEDIDOS", group: "Ventas", groupIcon: <MdInventory2 size={14} />, icon: <MdInventory2 size={17} /> },
      { href: "/panel/cotizaciones", label: "Cotizaciones", module: "MODULE_COTIZACIONES", icon: <MdDescription size={17} /> },
      { href: "/panel/calendario", label: "Calendario", module: "MODULE_CAMPANAS", icon: <MdCalendarMonth size={17} /> },
      { href: "/panel/metricas", label: "Métricas", module: "MODULE_METRICAS", icon: <MdBarChart size={17} /> },
      { href: "/panel/whatsapp", label: "WhatsApp", module: "MODULE_WHATSAPP", group: "Clientes", groupIcon: <MdChat size={14} />, icon: <MdChat size={17} /> },
      { href: "/panel/rrhh/crm", label: "CRM", module: "MODULE_RRHH", icon: <MdHandshake size={17} /> },
      { href: "/panel/rrhh/vendedores", label: "Vendedores", module: "MODULE_RRHH", icon: <MdPeople size={17} /> },
      { ...productos, group: "Desarrollo de negocios", groupIcon: <MdCategory size={14} /> },
      { href: "/panel/mis-combos", label: "Mis Combos", module: "MODULE_MIS_COMBOS", icon: <MdLocalOffer size={17} /> },
      precioVenta,
      { href: "/panel/combos", label: "Combos", module: "MODULE_COMBOS", icon: <MdCardGiftcard size={17} /> },
      { href: "/panel/outlet", label: "Outlet", module: "MODULE_OUTLET", icon: <MdLocalOffer size={17} /> },
      { href: "/panel/banners", label: "Diseño", module: "MODULE_BANNERS", group: "Diseño gráfico", groupIcon: <MdImage size={14} />, icon: <MdImage size={17} /> },
      { href: "/panel/videos-soluciones", label: "Videos", module: "MODULE_BANNERS", icon: <MdVideocam size={17} /> },
      { href: "/panel/material-comercial", label: "Material Comercial", module: "MODULE_MATERIAL", icon: <MdFolder size={17} /> },
      { href: "/panel/campanas", label: "Campañas", module: "MODULE_CAMPANAS", icon: <MdCampaign size={17} /> },
    ],
  },
  {
    key: "operaciones",
    href: "/panel/operaciones",
    label: "Operaciones",
    icon: <MdPrecisionManufacturing size={18} />,
    children: [
      {
        href: "/panel/operaciones",
        label: "Tablero",
        module: "MODULE_PRODUCCION",
        anyModule: ["MODULE_PRODUCCION", "MODULE_ENSAMBLE", "MODULE_BODEGAS", "MODULE_LOGISTICA", "MODULE_MANTENIMIENTO", "MODULE_CONTROL_CALIDAD"],
        icon: <MdDashboard size={17} />,
      },
      { href: "/panel/produccion", label: "Inyección", module: "MODULE_PRODUCCION", group: "Producción", groupIcon: <MdPrecisionManufacturing size={14} />, icon: <MdPrecisionManufacturing size={17} /> },
      { href: "/panel/ensamble", label: "Ensamble", module: "MODULE_ENSAMBLE", icon: <MdHandshake size={17} /> },
      { href: "/panel/produccion/ordenes", label: "Órdenes de Producción", module: "MODULE_PRODUCCION", icon: <MdAssignment size={17} /> },
      { href: "/panel/produccion/moldes", label: "Moldes", module: "MODULE_PRODUCCION", icon: <MdSwapHoriz size={17} /> },
      { href: "/panel/produccion/departamentos", label: "Departamentos", module: "MODULE_PRODUCCION", icon: <MdApartment size={17} /> },
      { href: "/panel/bodegas", label: "Bodegas", module: "MODULE_BODEGAS", group: "Almacén y despacho", groupIcon: <MdWarehouse size={14} />, icon: <MdWarehouse size={17} /> },
      { href: "/panel/empaque", label: "Empaque", module: "MODULE_PEDIDOS", icon: <MdInventory2 size={17} /> },
      { href: "/panel/logistica", label: "Logística", module: "MODULE_LOGISTICA", icon: <MdLocalShipping size={17} /> },
      { href: "/panel/mantenimiento", label: "Mantenimiento", module: "MODULE_MANTENIMIENTO", icon: <MdBuild size={17} /> },
      { href: "/panel/calidad", label: "Casos de calidad", module: "MODULE_CALIDAD", group: "Calidad", groupIcon: <MdFactCheck size={14} />, icon: <MdFactCheck size={17} /> },
      { href: "/panel/control-calidad", label: "Control de calidad", module: "MODULE_CONTROL_CALIDAD", icon: <MdVerified size={17} /> },
    ],
  },
  {
    key: "rrhh",
    href: "/panel/rrhh",
    label: "Talento Humano",
    icon: <MdWork size={18} />,
    parent: "administracion",
    children: [
      { href: "/panel/rrhh", label: "Dashboard", module: "MODULE_RRHH", group: "General", groupIcon: <MdHome size={14} />, icon: <MdHome size={17} /> },
      { href: "/panel/rrhh/busqueda", label: "Búsqueda", module: "MODULE_RRHH", icon: <MdSearch size={17} /> },
      { href: "/panel/rrhh/notificaciones", label: "Notificaciones", module: "MODULE_RRHH", icon: <MdNotificationsNone size={17} /> },
      { href: "/panel/rrhh/reportes", label: "Reportes", module: "MODULE_RRHH", icon: <MdBarChart size={17} /> },

      { href: "/panel/rrhh/empleados", label: "Empleados", module: "MODULE_RRHH", group: "Capital humano", groupIcon: <MdGroup size={14} />, icon: <MdPersonOutline size={17} /> },
      { href: "/panel/rrhh/departamentos", label: "Departamentos", module: "MODULE_RRHH", icon: <MdApartment size={17} /> },
      { href: "/panel/rrhh/asistencia", label: "Asistencia", module: "MODULE_RRHH", icon: <MdAccessTime size={17} /> },
      { href: "/panel/rrhh/vacaciones", label: "Vacaciones", module: "MODULE_RRHH", icon: <MdBeachAccess size={17} /> },
      { href: "/panel/rrhh/ausencias", label: "Ausencias", module: "MODULE_RRHH", icon: <MdRemoveCircleOutline size={17} /> },
      { href: "/panel/rrhh/horas-extras", label: "Horas Extras", module: "MODULE_RRHH", icon: <MdAccessTime size={17} /> },
      { href: "/panel/rrhh/nomina", label: "Nómina", module: "MODULE_RRHH", icon: <MdAttachMoney size={17} /> },
      { href: "/panel/rrhh/beneficios", label: "Beneficios", module: "MODULE_RRHH", icon: <MdCardGiftcard size={17} /> },

      { href: "/panel/rrhh/documentos", label: "Documentos", module: "MODULE_RRHH", group: "Operación", groupIcon: <MdAssignment size={14} />, icon: <MdDescription size={17} /> },
      { href: "/panel/rrhh/certificados", label: "Certificados", module: "MODULE_RRHH", icon: <MdVerified size={17} /> },
      { href: "/panel/rrhh/solicitudes/categorias", label: "Categorías de solicitud", module: "MODULE_RRHH", icon: <MdSettings size={17} /> },
      { href: "/panel/rrhh/noticias", label: "Noticias", module: "MODULE_RRHH", icon: <MdArticle size={17} /> },
      { href: "/panel/rrhh/flujos", label: "Flujos", module: "MODULE_RRHH", icon: <MdSwapHoriz size={17} /> },
      { href: "/panel/rrhh/roles", label: "Roles", module: "MODULE_RRHH", icon: <MdAssignment size={17} /> },
      { href: "/panel/rrhh/ayuda", label: "Ayuda", module: "MODULE_RRHH", icon: <MdHelpOutline size={17} /> },
    ],
  },
  {
    key: "administracion",
    href: "/panel/rrhh/tesoreria",
    label: "Administración",
    icon: <MdApartment size={18} />,
    children: [
      { href: "/panel/rrhh/tesoreria", label: "Tesorería", module: "MODULE_RRHH", group: "Contable", groupIcon: <MdCreditCard size={14} />, icon: <MdCreditCard size={17} /> },
      { href: "/panel/rrhh/contabilidad", label: "Contabilidad", module: "MODULE_RRHH", icon: <MdBarChart size={17} /> },
      { href: "/panel/costos", label: "Costos", module: "MODULE_COSTOS", icon: <MdAttachMoney size={17} /> },
      precioVenta,
      { href: "/panel/rrhh/inventario", label: "Inventario", module: "MODULE_RRHH", icon: <MdInventory2 size={17} /> },
      { href: "/panel/rrhh", label: "Talento Humano", module: "MODULE_RRHH", shared: true, group: "Talento Humano", groupIcon: <MdWork size={14} />, icon: <MdWork size={17} /> },
      { href: "/panel/odoo", label: "Resumen Odoo", module: "MODULE_ODOO", group: "Sistemas", groupIcon: <MdExtension size={14} />, icon: <MdExtension size={17} /> },
      { href: "/panel/odoo/aplicaciones", label: "Aplicaciones", module: "MODULE_ODOO", icon: <MdAssignment size={17} /> },
      { href: "/panel/odoo/asistente", label: "Asistente", module: "MODULE_ODOO", icon: <MdSmartToy size={17} /> },
      { href: "/panel/odoo/reportes", label: "Reportes Odoo", module: "MODULE_ODOO", icon: <MdBarChart size={17} /> },
      { href: "/panel/odoo/productos", label: "Productos Odoo", module: "MODULE_ODOO", icon: <MdCategory size={17} /> },
      { href: "/panel/odoo/inventario", label: "Inventario Odoo", module: "MODULE_ODOO", icon: <MdInventory size={17} /> },
      { href: "/panel/usuarios", label: "Usuarios", module: "MODULE_USUARIOS", icon: <MdPeople size={17} /> },
      { href: "/panel/configuracion/modo-venta", label: "Modo de Venta", module: "MODULE_USUARIOS", icon: <MdShoppingCart size={17} />, superAdminOnly: true },
      { href: "/panel/configuracion/whatsapp-paises", label: "WhatsApp por País", module: "MODULE_USUARIOS", icon: <MdPublic size={17} />, superAdminOnly: true },
      { href: "/panel/bitacora", label: "Bitácora", module: "MODULE_USUARIOS", icon: <MdHistory size={17} />, superAdminOnly: true },
    ],
  },
  { key: "tareas", href: "/panel/tareas", label: "Tareas", icon: <MdChecklist size={18} />, module: "MODULE_TAREAS", tool: true },
  { key: "tickets", href: "/panel/tickets", label: "Solicitudes", icon: <MdConfirmationNumber size={18} />, module: "MODULE_TICKETS", tool: true },
  { key: "notificaciones", href: "/panel/notificaciones", label: "Notificaciones", icon: <MdNotificationsNone size={18} />, module: "MODULE_DASHBOARD", tool: true },
];
