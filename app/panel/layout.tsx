"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MdDashboard, MdInventory2, MdCategory, MdBarChart, MdCampaign, MdAttachMoney, MdSettings,
  MdCalculate, MdDescription, MdPrecisionManufacturing, MdAssignment, MdPeople, MdImage, MdVerified,
  MdCardGiftcard, MdLocalOffer, MdWork, MdHome, MdSearch, MdNotificationsNone, MdPersonOutline,
  MdApartment, MdAccessTime, MdBeachAccess, MdRemoveCircleOutline, MdSwapHoriz, MdHandshake,
  MdCreditCard, MdHelpOutline, MdGroup, MdWarehouse, MdArticle, MdSmartToy, MdShoppingCart,
  MdInventory, MdExtension,
} from "react-icons/md";

type NavChild = {
  href: string;
  label: string;
  module: string;
  group?: string;
  groupIcon?: React.ReactNode;
  icon?: React.ReactNode;
  superAdminOnly?: boolean;
};

type NavItem = {
  key: string;
  href: string;
  label: string;
  icon: React.ReactNode;
  module?: string;
  children?: NavChild[];
};

const NAV: NavItem[] = [
  { key: "inicio", href: "/panel", label: "Inicio", icon: <MdDashboard size={18} />, module: "MODULE_DASHBOARD" },
  {
    key: "comercial",
    href: "/panel/pedidos",
    label: "Comercial",
    icon: <MdShoppingCart size={18} />,
    children: [
      { href: "/panel/pedidos", label: "Pedidos", module: "MODULE_PEDIDOS", group: "Ventas", groupIcon: <MdInventory2 size={14} />, icon: <MdInventory2 size={17} /> },
      { href: "/panel/cotizaciones", label: "Cotizaciones", module: "MODULE_COTIZACIONES", icon: <MdDescription size={17} /> },
      { href: "/panel/campanas", label: "Campañas", module: "MODULE_CAMPANAS", group: "Marketing", groupIcon: <MdCampaign size={14} />, icon: <MdCampaign size={17} /> },
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
      { href: "/panel/outlet", label: "Outlet", module: "MODULE_OUTLET", icon: <MdLocalOffer size={17} /> },
      { href: "/panel/banners", label: "Diseño", module: "MODULE_BANNERS", icon: <MdImage size={17} /> },
      { href: "/panel/costos", label: "Costos", module: "MODULE_COSTOS", group: "Precios", groupIcon: <MdAttachMoney size={14} />, icon: <MdAttachMoney size={17} /> },
      { href: "/panel/calculadora-precio", label: "Precio de Venta", module: "MODULE_CALCULADORA_PRECIO", icon: <MdCalculate size={17} /> },
    ],
  },
  {
    key: "operaciones",
    href: "/panel/produccion",
    label: "Operaciones",
    icon: <MdPrecisionManufacturing size={18} />,
    children: [
      { href: "/panel/produccion", label: "Producción", module: "MODULE_PRODUCCION", icon: <MdPrecisionManufacturing size={17} /> },
      { href: "/panel/produccion/ordenes", label: "Órdenes de Producción", module: "MODULE_PRODUCCION", icon: <MdAssignment size={17} /> },
      { href: "/panel/bodegas", label: "Bodegas", module: "MODULE_BODEGAS", icon: <MdWarehouse size={17} /> },
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
      { href: "/panel/kommo", label: "Kommo", module: "MODULE_KOMMO", superAdminOnly: true, group: "Kommo", groupIcon: <MdSmartToy size={14} />, icon: <MdSmartToy size={17} /> },
    ],
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
    ],
  },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visibleModules, setVisibleModules] = useState<Set<string> | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [areaOverride, setAreaOverride] = useState<Record<string, boolean>>({});
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});

  const toggleArea = (key: string, defaultOpen: boolean) => {
    setAreaOverride((prev) => ({ ...prev, [key]: !(prev[key] ?? defaultOpen) }));
  };
  const toggleGroup = (key: string) => {
    setClosedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    fetch("/api/panel/permissions")
      .then((r) => r.json())
      .then((d) => {
        setIsSuperAdmin(d.role === "SUPERADMIN");
        const perms = d.permissions as Record<string, { canView: boolean }> | undefined;
        if (!perms) {
          setVisibleModules(new Set());
          return;
        }
        setVisibleModules(new Set(Object.entries(perms).filter(([, p]) => p.canView).map(([m]) => m)));
      })
      .catch(() => setVisibleModules(new Set()));
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-screen bg-[#F4F6F8] font-sans">
      {/* ── Topbar móvil ── */}
      <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.ico" alt="Kliniu" className="h-8 w-8 shrink-0 rounded-lg" />
          <div>
            <p className="text-xs font-black leading-none text-[#1A1A1A]">Panel</p>
            <p className="text-[10px] font-semibold text-[#27B1B8]">Comercial Kliniu</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#1A1A1A]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            {mobileOpen ? (
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            ) : (
              <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* ── Overlay móvil ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#E2E8F0] bg-white transition-all duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0 ${collapsed ? "md:w-16" : "md:w-56"} w-64 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ minHeight: "100vh", height: "100vh" }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-4 ${collapsed ? "md:justify-center" : ""}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/favicon.ico" alt="Kliniu" className="h-8 w-8 shrink-0 rounded-lg" />
          {!collapsed && (
            <div>
              <p className="text-xs font-black leading-none text-[#1A1A1A]">Panel</p>
              <p className="text-[10px] font-semibold text-[#27B1B8]">Comercial Kliniu</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {(() => {
            const childMatches = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
            const canSee = (m: NavChild) => (m.superAdminOnly ? isSuperAdmin : visibleModules?.has(m.module));

            const items = visibleModules
              ? NAV.map((item) => {
                  if (!item.children) {
                    return item.module && visibleModules.has(item.module) ? item : null;
                  }
                  const children = item.children.filter(canSee);
                  return children.length > 0 ? { ...item, children } : null;
                }).filter((n): n is NavItem => n !== null)
              : [];

            const activeItem = items
              .flatMap((item) => (item.children ? item.children.map((c) => ({ item, href: c.href })) : [{ item, href: item.href }]))
              .filter((x) => childMatches(x.href))
              .sort((a, b) => b.href.length - a.href.length)[0]?.item;

            return items.map((item) => {
              const active = item.key === activeItem?.key;
              const isOpen = item.children ? areaOverride[item.key] ?? active : false;

              // agrupa children consecutivos bajo su group más reciente
              const groupedChildren: { group?: string; groupIcon?: React.ReactNode; children: NavChild[] }[] = [];
              item.children?.forEach((child) => {
                if (child.group || groupedChildren.length === 0) {
                  groupedChildren.push({ group: child.group, groupIcon: child.groupIcon, children: [child] });
                } else {
                  groupedChildren[groupedChildren.length - 1].children.push(child);
                }
              });

            return (
              <div key={item.key} className="mb-1">
                {item.children ? (
                  <button
                    type="button"
                    onClick={() => toggleArea(item.key, active)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? "bg-[#27B1B8] text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)]"
                        : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="flex shrink-0 items-center justify-center">{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.label}</span>
                        <span className={`text-[10px] opacity-70 transition-transform ${isOpen ? "rotate-180" : ""}`}>▾</span>
                      </>
                    )}
                  </button>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                      active
                        ? "bg-[#27B1B8] text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)]"
                        : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]"
                    } ${collapsed ? "justify-center" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="flex shrink-0 items-center justify-center">{item.icon}</span>
                    {!collapsed && <span className="flex-1">{item.label}</span>}
                  </Link>
                )}
                {!collapsed && item.children && isOpen && (
                  <div className="mt-2 pl-1">
                    {groupedChildren.map((section, si) => {
                      const groupKey = `${item.key}:${section.group ?? si}`;
                      const groupClosed = section.group ? closedGroups[groupKey] : false;
                      return (
                        <div key={groupKey} className={si === 0 ? "" : "mt-1"}>
                          {section.group && (
                            <button
                              type="button"
                              onClick={() => toggleGroup(groupKey)}
                              className="flex w-full items-center gap-1.5 px-3 py-2 text-[#94A3B8] hover:text-[#64748B]"
                            >
                              {section.groupIcon}
                              <p className="flex-1 text-left text-[12px] font-semibold uppercase tracking-wide">
                                {section.group}
                              </p>
                              <span className={`text-[9px] transition-transform ${groupClosed ? "-rotate-90" : ""}`}>▾</span>
                            </button>
                          )}
                          {!groupClosed && section.children.map((child) => {
                            const childActive = pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                href={child.href}
                                className={`relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                  childActive
                                    ? "bg-[#E8FAFB] text-[#0C535B]"
                                    : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#1A1A1A]"
                                }`}
                              >
                                {childActive && (
                                  <span className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-[#27B1B8]" />
                                )}
                                {child.icon && (
                                  <span className="flex shrink-0 items-center justify-center opacity-80">
                                    {child.icon}
                                  </span>
                                )}
                                {child.label}
                              </Link>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            });
          })()}
        </nav>

        {/* User + logout + collapse */}
        <div className="border-t border-[#E2E8F0] p-3 space-y-2">
          {/* Logout */}
          <button
            onClick={logout}
            title="Cerrar sesión"
            className={`flex w-full items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-500 transition-colors hover:bg-red-100 hover:border-red-300 ${collapsed ? "justify-center" : ""}`}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {!collapsed && <span>Cerrar sesión</span>}
          </button>

          {/* Collapse toggle (solo escritorio) */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden w-full h-7 items-center justify-center rounded-lg border border-[#E2E8F0] text-xs text-[#94A3B8] hover:border-[#27B1B8] hover:text-[#27B1B8] transition-colors md:flex"
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 overflow-x-hidden overflow-y-auto pt-14 md:pt-0">
        {children}
      </div>
    </div>
  );
}
