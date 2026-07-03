"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MdDashboard, MdInventory2, MdCategory, MdBarChart, MdCampaign, MdAttachMoney, MdSettings, MdCalculate, MdDescription, MdPrecisionManufacturing, MdAssignment, MdPeople } from "react-icons/md";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  module: string;
  children?: Array<{ href: string; label: string }>;
};

const NAV: NavItem[] = [
  { href: "/panel",           label: "Dashboard", icon: <MdDashboard size={18} />, module: "MODULE_DASHBOARD" },
  { href: "/panel/pedidos",   label: "Pedidos",   icon: <MdInventory2 size={18} />, module: "MODULE_PEDIDOS" },
  { href: "/panel/productos", label: "Productos", icon: <MdCategory size={18} />, module: "MODULE_PRODUCTOS" },
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
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ fullName?: string; email?: string; role?: string } | null>(null);
  const [visibleModules, setVisibleModules] = useState<Set<string> | null>(null);

  useEffect(() => {
    fetch("/api/account").then((r) => r.json()).then((d) => setUser(d)).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/panel/permissions")
      .then((r) => r.json())
      .then((d) => {
        const perms = d.permissions as Record<string, { canView: boolean }> | undefined;
        if (!perms) return;
        setVisibleModules(new Set(Object.entries(perms).filter(([, p]) => p.canView).map(([m]) => m)));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#F4F6F8] font-sans">
      {/* ── Topbar móvil ── */}
      <div className="fixed inset-x-0 top-0 z-[60] flex items-center justify-between border-b border-[#E2E8F0] bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#27B1B8] text-sm font-black text-white">
            K
          </div>
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
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#27B1B8] text-sm font-black text-white">
            K
          </div>
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
            const items = visibleModules ? NAV.filter((n) => visibleModules.has(n.module)) : NAV;
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
                  <div className="mt-1 space-y-1 pl-8">
                    {item.children.map((child) => {
                      const childActive = pathname === child.href;

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                            childActive
                              ? "bg-[#E8FAFB] text-[#0C535B]"
                              : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1A1A1A]"
                          }`}
                        >
                          {child.label}
                        </Link>
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
          {!collapsed && user && (
            <div className="rounded-xl bg-[#F8FAFC] p-2.5">
              <p className="truncate text-xs font-bold text-[#1A1A1A]">{user.fullName ?? "—"}</p>
              <p className="truncate text-[10px] text-[#94A3B8]">{user.role ?? ""}</p>
            </div>
          )}

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
