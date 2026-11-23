import {
  MdDashboard, MdInventory2, MdCategory, MdBarChart, MdCampaign, MdAttachMoney, MdSettings,
  MdCalculate, MdDescription, MdPrecisionManufacturing, MdAssignment, MdPeople, MdImage, MdVerified,
  MdCardGiftcard, MdLocalOffer, MdWork, MdHome, MdSearch, MdNotificationsNone, MdPersonOutline,
  MdApartment, MdAccessTime, MdBeachAccess, MdRemoveCircleOutline, MdSwapHoriz, MdHandshake,
  MdCreditCard, MdHelpOutline, MdGroup, MdWarehouse, MdArticle, MdSmartToy, MdShoppingCart,
  MdInventory, MdExtension, MdConfirmationNumber, MdChat, MdVideocam, MdFolder,
  MdLocalShipping, MdBuild, MdCalendarMonth, MdChecklist, MdPublic, MdHistory,
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
};

export type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  module?: string;
  children?: NavChild[];
};

export const NAV: NavItem[] = [
  { key: "inicio", href: "/panel", label: "Inicio", icon: <MdDashboard size={18} />, module: "MODULE_DASHBOARD" },
  {
    key: "tareas",
    href: "/panel/tareas",
    label: "Tareas",
    icon: <MdChecklist size={18} />,
    module: "MODULE_TAREAS",
  },
  {
    key: "comercial",
    href: "/panel/pedidos",
    label: "Comercial",
    icon: <MdShoppingCart size={18} />,
    children: [
      { href: "/panel/pedidos", label: "Pedidos", module: "MODULE_PEDIDOS", group: "Ventas", groupIcon: <MdInventory2 size={14} />, icon: <MdInventory2 size={17} /> },
      { href: "/panel/whatsapp", label: "WhatsApp", module: "MODULE_WHATSAPP", icon: <MdChat size={17} /> },
      { href: "/panel/cotizaciones", label: "Cotizaciones", module: "MODULE_COTIZACIONES", icon: <MdDescription size={17} /> },
      { href: "/panel/campanas", label: "Campañas", module: "MODULE_CAMPANAS", group: "Marketing", groupIcon: <MdCampaign size={14} />, icon: <MdCampaign size={17} /> },
      { href: "/panel/calendario", label: "Calendario", module: "MODULE_CAMPANAS", icon: <MdCalendarMonth size={17} /> },
      { href: "/panel/metricas", label: "Métricas", module: "MODULE_METRICAS", icon: <MdBarChart size={17} /> },
    ],
  },
  {
    key: "catalogo",
    href: "/panel/productos",
    label: "Catálogo",
    icon: <MdCategory size={18} />,
    children: [
      { href: "/panel/productos", label: "Productos", module: "MODULE_PRODUCTOS", icon: <MdCategory size={17} /> },
      { href: "/panel/combos", label: "Combos", module: "MODULE_COMBOS", icon: <MdCardGiftcard size={17} /> },
      { href: "/panel/mis-combos", label: "Mis Combos", module: "MODULE_MIS_COMBOS", icon: <MdLocalOffer size={17} /> },
      { href: "/panel/outlet", label: "Outlet", module: "MODULE_OUTLET", icon: <MdLocalOffer size={17} /> },
      { href: "/panel/banners", label: "Diseño", module: "MODULE_BANNERS", icon: <MdImage size={17} /> },
      { href: "/panel/videos-soluciones", label: "Videos", module: "MODULE_BANNERS", icon: <MdVideocam size={17} /> },
      { href: "/panel/material-comercial", label: "Material Comercial", module: "MODULE_MATERIAL", icon: <MdFolder size={17} /> },
      { href: "/panel/costos", label: "Costos", module: "MODULE_COSTOS", group: "Precios", groupIcon: <MdAttachMoney size={14} />, icon: <MdAttachMoney size={17} /> },
      { href: "/panel/calculadora-precio", label: "Precio de Venta", module: "MODULE_CALCULADORA_PRECIO", icon: <MdCalculate size={17} /> },
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
        anyModule: ["MODULE_PRODUCCION", "MODULE_ENSAMBLE", "MODULE_BODEGAS", "MODULE_LOGISTICA", "MODULE_MANTENIMIENTO"],
        icon: <MdDashboard size={17} />,
      },
      { href: "/panel/produccion", label: "Inyección", module: "MODULE_PRODUCCION", icon: <MdPrecisionManufacturing size={17} /> },
      { href: "/panel/ensamble", label: "Ensamble", module: "MODULE_ENSAMBLE", icon: <MdHandshake size={17} /> },
      { href: "/panel/produccion/ordenes", label: "Órdenes de Producción", module: "MODULE_PRODUCCION", icon: <MdAssignment size={17} /> },
      { href: "/panel/produccion/moldes", label: "Moldes", module: "MODULE_PRODUCCION", icon: <MdSwapHoriz size={17} /> },
      { href: "/panel/produccion/departamentos", label: "Departamentos", module: "MODULE_PRODUCCION", icon: <MdApartment size={17} /> },
      { href: "/panel/bodegas", label: "Bodegas", module: "MODULE_BODEGAS", icon: <MdWarehouse size={17} /> },
      { href: "/panel/empaque", label: "Empaque", module: "MODULE_PEDIDOS", icon: <MdInventory2 size={17} /> },
      { href: "/panel/logistica", label: "Logística", module: "MODULE_LOGISTICA", icon: <MdLocalShipping size={17} /> },
      { href: "/panel/mantenimiento", label: "Mantenimiento", module: "MODULE_MANTENIMIENTO", icon: <MdBuild size={17} /> },
    ],
  },
  {
    key: "integraciones",
    href: "/panel/odoo",
    label: "Integraciones",
    icon: <MdExtension size={18} />,
    children: [
      { href: "/panel/odoo", label: "Resumen", module: "MODULE_ODOO", group: "Odoo", groupIcon: <MdSettings size={14} />, icon: <MdHome size={17} /> },
      { href: "/panel/odoo/aplicaciones", label: "Aplicaciones", module: "MODULE_ODOO", icon: <MdAssignment size={17} /> },
      { href: "/panel/odoo/asistente", label: "Asistente", module: "MODULE_ODOO", icon: <MdSmartToy size={17} /> },
      { href: "/panel/odoo/reportes", label: "Reportes", module: "MODULE_ODOO", icon: <MdBarChart size={17} /> },
      { href: "/panel/odoo/productos", label: "Productos", module: "MODULE_ODOO", icon: <MdCategory size={17} /> },
      { href: "/panel/odoo/inventario", label: "Inventario", module: "MODULE_ODOO", icon: <MdInventory size={17} /> },
    ],
  },
  {
    key: "tickets",
    href: "/panel/tickets",
    label: "Solicitudes",
    icon: <MdConfirmationNumber size={18} />,
    module: "MODULE_TICKETS",
  },
  {
    key: "notificaciones",
    href: "/panel/notificaciones",
    label: "Notificaciones",
    icon: <MdNotificationsNone size={18} />,
    module: "MODULE_DASHBOARD",
  },
  {
    key: "rrhh",
    href: "/panel/rrhh",
    label: "Recursos Humanos",
    icon: <MdWork size={18} />,
    children: [
      { href: "/panel/rrhh", label: "Dashboard", module: "MODULE_RRHH", group: "General", groupIcon: <MdHome size={14} />, icon: <MdHome size={17} /> },
      { href: "/panel/rrhh/busqueda", label: "Búsqueda", module: "MODULE_RRHH", icon: <MdSearch size={17} /> },
      { href: "/panel/rrhh/notificaciones", label: "Notificaciones", module: "MODULE_RRHH", icon: <MdNotificationsNone size={17} /> },

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
      { href: "/panel/rrhh/inventario", label: "Inventario", module: "MODULE_RRHH", icon: <MdInventory2 size={17} /> },
      { href: "/panel/rrhh/crm", label: "CRM", module: "MODULE_RRHH", icon: <MdHandshake size={17} /> },

      { href: "/panel/rrhh/tesoreria", label: "Tesorería", module: "MODULE_RRHH", group: "Finanzas", groupIcon: <MdCreditCard size={14} />, icon: <MdCreditCard size={17} /> },
      { href: "/panel/rrhh/contabilidad", label: "Contabilidad", module: "MODULE_RRHH", icon: <MdBarChart size={17} /> },
      { href: "/panel/rrhh/reportes", label: "Reportes", module: "MODULE_RRHH", icon: <MdBarChart size={17} /> },

      { href: "/panel/rrhh/vendedores", label: "Vendedores", module: "MODULE_RRHH", group: "Equipo Kliniu", groupIcon: <MdGroup size={14} />, icon: <MdPeople size={17} /> },
      { href: "/panel/rrhh/roles", label: "Roles", module: "MODULE_RRHH", icon: <MdAssignment size={17} /> },
      { href: "/panel/rrhh/ayuda", label: "Ayuda", module: "MODULE_RRHH", icon: <MdHelpOutline size={17} /> },
    ],
  },
  {
    key: "configuracion",
    href: "/panel/usuarios",
    label: "Configuración",
    icon: <MdSettings size={18} />,
    children: [
      { href: "/panel/usuarios", label: "Usuarios", module: "MODULE_USUARIOS", icon: <MdPeople size={17} /> },
      { href: "/panel/configuracion/modo-venta", label: "Modo de Venta", module: "MODULE_USUARIOS", icon: <MdShoppingCart size={17} />, superAdminOnly: true },
      { href: "/panel/configuracion/whatsapp-paises", label: "WhatsApp por País", module: "MODULE_USUARIOS", icon: <MdPublic size={17} />, superAdminOnly: true },
      { href: "/panel/bitacora", label: "Bitácora", module: "MODULE_USUARIOS", icon: <MdHistory size={17} />, superAdminOnly: true },
    ],
  },
];
