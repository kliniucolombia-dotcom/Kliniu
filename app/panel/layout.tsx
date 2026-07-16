"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  MdDashboard, MdInventory2, MdCategory, MdBarChart, MdCampaign, MdAttachMoney, MdSettings,
  MdCalculate, MdDescription, MdPrecisionManufacturing, MdAssignment, MdPeople, MdImage,
  MdCardGiftcard, MdLocalOffer, MdWork, MdHome, MdSearch, MdNotificationsNone, MdPersonOutline,
  MdApartment, MdAccessTime, MdBeachAccess, MdRemoveCircleOutline, MdSwapHoriz, MdHandshake,
  MdCreditCard, MdHelpOutline, MdGroup, MdWarehouse,
} from "react-icons/md";

type NavChild = { href: string; label: string; group?: string; groupIcon?: React.ReactNode; icon?: React.ReactNode };

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  module: string;
  children?: NavChild[];
};

const NAV: NavItem[] = [
  { href: "/panel",           label: "Dashboard", icon: <MdDashboard size={18} />, module: "MODULE_DASHBOARD" },
  { href: "/panel/pedidos",   label: "Pedidos",   icon: <MdInventory2 size={18} />, module: "MODULE_PEDIDOS" },
  { href: "/panel/productos", label: "Productos", icon: <MdCategory size={18} />, module: "MODULE_PRODUCTOS" },
  { href: "/panel/outlet", label: "Outlet", icon: <MdLocalOffer size={18} />, module: "MODULE_OUTLET" },
  { href: "/panel/bodegas", label: "Bodegas", icon: <MdWarehouse size={18} />, module: "MODULE_BODEGAS" },
  { href: "/panel/banners",   label: "Diseño",   icon: <MdImage size={18} />, module: "MODULE_BANNERS" },
  { href: "/panel/combos",    label: "Combos",    icon: <MdCardGiftcard size={18} />, module: "MODULE_COMBOS" },
  { href: "/panel/metricas",  label: "Métricas",  icon: <MdBarChart size={18} />, module: "MODULE_METRICAS" },
  { href: "/panel/campanas",  label: "Campañas",  icon: <MdCampaign size={18} />, module: "MODULE_CAMPANAS" },
  { href: "/panel/costos",    label: "Costos",    icon: <MdAttachMoney size={18} />, module: "MODULE_COSTOS" },
  { href: "/panel/calculadora-precio", label: "Precio de Venta", icon: <MdCalculate size={18} />, module: "MODULE_CALCULADORA_PRECIO" },
  { href: "/panel/cotizaciones", label: "Cotizaciones", icon: <MdDescription size={18} />, module: "MODULE_COTIZACIONES" },
  { href: "/panel/produccion", label: "Producción", icon: <MdPrecisionManufacturing size={18} />, module: "MODULE_PRODUCCION" },
  { href: "/panel/produccion/ordenes", label: "Órdenes de Producción", icon: <MdAssignment size={18} />, module: "MODULE_PRODUCCION" },
  {
    href: "/panel/odoo",
    label: "Odoo",
    icon: <MdSettings size={18} />,
    module: "MODULE_ODOO",
    children: [
      { href: "/panel/odoo", label: "Resumen" },
      { href: "/panel/odoo/aplicaciones", label: "Aplicaciones" },
      { href: "/panel/odoo/asistente", label: "Asistente" },
      { href: "/panel/odoo/reportes", label: "Reportes" },
      { href: "/panel/odoo/productos", label: "Productos" },
      { href: "/panel/odoo/inventario", label: "Inventario" },
    ],
  },
  { href: "/panel/usuarios", label: "Usuarios", icon: <MdPeople size={18} />, module: "MODULE_USUARIOS" },
  {
    href: "/panel/rrhh",
    label: "Recursos Humanos",
    icon: <MdWork size={18} />,
    module: "MODULE_RRHH",
    children: [
      { href: "/panel/rrhh", label: "Dashboard", group: "General", groupIcon: <MdHome size={14} />, icon: <MdHome size={17} /> },
      { href: "/panel/rrhh/busqueda", label: "Búsqueda", icon: <MdSearch size={17} /> },
      { href: "/panel/rrhh/notificaciones", label: "Notificaciones", icon: <MdNotificationsNone size={17} /> },

      { href: "/panel/rrhh/empleados", label: "Empleados", group: "Capital humano", groupIcon: <MdGroup size={14} />, icon: <MdPersonOutline size={17} /> },
      { href: "/panel/rrhh/departamentos", label: "Departamentos", icon: <MdApartment size={17} /> },
      { href: "/panel/rrhh/asistencia", label: "Asistencia", icon: <MdAccessTime size={17} /> },
      { href: "/panel/rrhh/vacaciones", label: "Vacaciones", icon: <MdBeachAccess size={17} /> },
      { href: "/panel/rrhh/ausencias", label: "Ausencias", icon: <MdRemoveCircleOutline size={17} /> },
      { href: "/panel/rrhh/nomina", label: "Nómina", icon: <MdAttachMoney size={17} /> },

      { href: "/panel/rrhh/documentos", label: "Documentos", group: "Operación", groupIcon: <MdAssignment size={14} />, icon: <MdDescription size={17} /> },
      { href: "/panel/rrhh/flujos", label: "Flujos", icon: <MdSwapHoriz size={17} /> },
      { href: "/panel/rrhh/inventario", label: "Inventario", icon: <MdInventory2 size={17} /> },
      { href: "/panel/rrhh/crm", label: "CRM", icon: <MdHandshake size={17} /> },

      { href: "/panel/rrhh/tesoreria", label: "Tesorería", group: "Finanzas", groupIcon: <MdCreditCard size={14} />, icon: <MdCreditCard size={17} /> },
      { href: "/panel/rrhh/contabilidad", label: "Contabilidad", icon: <MdBarChart size={17} /> },
      { href: "/panel/rrhh/reportes", label: "Reportes", icon: <MdBarChart size={17} /> },

      { href: "/panel/rrhh/vendedores", label: "Vendedores", group: "Equipo Kliniu", groupIcon: <MdGroup size={14} />, icon: <MdPeople size={17} /> },
      { href: "/panel/rrhh/roles", label: "Roles", icon: <MdAssignment size={17} /> },
      { href: "/panel/rrhh/ayuda", label: "Ayuda", icon: <MdHelpOutline size={17} /> },
    ],
  },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visibleModules, setVisibleModules] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetch("/api/panel/permissions")
      .then((r) => r.json())
      .then((d) => {
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
            const matches = (href: string) => pathname === href || (href !== "/panel" && pathname.startsWith(`${href}/`));
            const items = visibleModules ? NAV.filter((n) => visibleModules.has(n.module)) : [];
            const activeHref = items.filter((n) => matches(n.href)).sort((a, b) => b.href.length - a.href.length)[0]?.href;
            return items.map((item) => {
              const active = item.href === activeHref;
            return (
              <div key={item.href} className="mb-1">
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
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.children && (
                        <span className="text-[10px] opacity-70">{active ? "▾" : "›"}</span>
                      )}
                    </>
                  )}
                </Link>
                {!collapsed && item.children && active && (
                  <div className="mt-3 pl-1">
                    {item.children.map((child, i) => {
                      const childActive = pathname === child.href;
                      const showGroup = Boolean(child.group);

                      return (
                        <div key={child.href}>
                          {showGroup && (
                            <div
                              className={`flex items-center gap-1.5 px-3 pb-2 text-[#94A3B8] ${
                                i === 0 ? "" : "mt-6 border-t border-[#F1F5F9] pt-5"
                              }`}
                            >
                              {child.groupIcon}
                              <p className="text-[12px] font-semibold uppercase tracking-wide">
                                {child.group}
                              </p>
                            </div>
                          )}
                          <Link
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
