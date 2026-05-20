"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV = [
  { href: "/panel",           label: "Dashboard",  icon: "▦" },
  { href: "/panel/pedidos",   label: "Pedidos",    icon: "📦" },
  { href: "/panel/productos", label: "Productos",  icon: "◻" },
  { href: "/panel/metricas",  label: "Métricas",   icon: "◈" },
  { href: "/panel/campanas",  label: "Campañas",   icon: "◉" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ fullName?: string; email?: string; role?: string } | null>(null);

  useEffect(() => {
    fetch("/api/account").then((r) => r.json()).then((d) => setUser(d)).catch(() => {});
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-[#F4F6F8] font-sans">
      {/* ── Sidebar ── */}
      <aside
        className={`flex flex-col border-r border-[#E2E8F0] bg-white transition-all duration-200 ${collapsed ? "w-16" : "w-56"}`}
        style={{ minHeight: "100vh", position: "sticky", top: 0, height: "100vh" }}
      >
        {/* Logo */}
        <div className={`flex items-center gap-2 border-b border-[#E2E8F0] px-4 py-4 ${collapsed ? "justify-center" : ""}`}>
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
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/panel" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
                  active
                    ? "bg-[#27B1B8] text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)]"
                    : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]"
                } ${collapsed ? "justify-center" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <span className="text-base">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
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

          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full h-7 items-center justify-center rounded-lg border border-[#E2E8F0] text-xs text-[#94A3B8] hover:border-[#27B1B8] hover:text-[#27B1B8] transition-colors"
            title={collapsed ? "Expandir menú" : "Colapsar menú"}
          >
            {collapsed ? "→" : "←"}
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
