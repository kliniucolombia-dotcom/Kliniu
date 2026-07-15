import { redirect } from "next/navigation";
import { requirePermissionWithFallback } from "@/lib/permissions";
import { getDashboardStats, getSellerStats, calcROAS, getCampaignStatus, STATUS_META } from "@/lib/panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Panel Comercial" };

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function PanelDashboard() {
  const access = await requirePermissionWithFallback("MODULE_DASHBOARD", "view");
  if (!access.ok) {
    redirect(access.redirectTo);
  }
  const { session } = access;

  const isAdmin = session.role === "ADMIN";
  const [stats, sellers] = await Promise.all([
    getDashboardStats(),
    isAdmin ? getSellerStats() : Promise.resolve([]),
  ]);

  const kpis = stats
    ? [
        { label: "Vendido hoy",           value: fmt(stats.todayTotal),              sub: "pedidos del día",                  color: "#27B1B8" },
        { label: "Vendido esta semana",   value: fmt(stats.weekTotal),               sub: `${stats.weekOrderCount} pedidos`,  color: "#27B1B8" },
        { label: "Vendido este mes",      value: fmt(stats.monthTotal),              sub: `${stats.monthOrderCount} pedidos`, color: "#27B1B8" },
        { label: "Inversión pauta",       value: fmtUSD(stats.totalInvestment),      sub: "total campañas",                   color: "#FF6B00" },
        { label: "Retorno campañas",      value: fmtUSD(stats.totalSales),           sub: "ventas generadas",                 color: "#16A34A" },
        { label: "ROAS general",          value: `×${stats.roasGeneral.toFixed(1)}`, sub: "meta ×10",                        color: stats.roasGeneral >= 10 ? "#16A34A" : stats.roasGeneral >= 7 ? "#D97706" : "#DC2626" },
        { label: "Campañas en riesgo",    value: stats.atRisk.toString(),            sub: "ROAS < 7×",                        color: stats.atRisk > 0 ? "#DC2626" : "#16A34A" },
        { label: "Clientes nuevos",       value: stats.newCustomers.toString(),      sub: "este mes",                         color: "#27B1B8" },
        { label: "Ticket promedio",       value: fmt(stats.avgTicket),               sub: "por pedido",                       color: "#64748B" },
      ]
    : [];

  const SHIPPING_ICONS: Record<string, string> = {
    pending: "🕐", shipped: "🚚", delivered: "✅",
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Dashboard</h1>
        <p className="mt-0.5 text-sm text-[#64748B]">
          {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-xs font-semibold text-[#94A3B8]">{kpi.label}</p>
            <p className="mt-1 text-2xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
            <p className="mt-0.5 text-xs text-[#CBD5E1]">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Sellers section (ADMIN only) ── */}
      {isAdmin && sellers.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-sm font-black text-[#1A1A1A]">Rendimiento por vendedor</h2>
            <span className="rounded-full bg-[#27B1B8]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#27B1B8]">
              {sellers.length} vendedores
            </span>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {sellers.map((seller, i) => (
              <div key={seller.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
                {/* Seller header */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black text-white"
                    style={{ background: i === 0 ? "#27B1B8" : "#6366f1" }}>
                    {seller.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#1A1A1A]">{seller.name}</p>
                    <p className="truncate text-[11px] text-[#94A3B8]">{seller.email}</p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="rounded-xl bg-[#F8FAFC] p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Esta semana</p>
                    <p className="mt-1 text-base font-black text-[#27B1B8]">{seller.weekOrders}</p>
                    <p className="text-[10px] text-[#CBD5E1]">pedidos</p>
                  </div>
                  <div className="rounded-xl bg-[#F8FAFC] p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Este mes</p>
                    <p className="mt-1 text-base font-black text-[#27B1B8]">{seller.monthOrders}</p>
                    <p className="text-[10px] text-[#CBD5E1]">pedidos</p>
                  </div>
                  <div className="rounded-xl bg-[#F8FAFC] p-3 text-center">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Total</p>
                    <p className="mt-1 text-base font-black text-[#1A1A1A]">{seller.totalOrders}</p>
                    <p className="text-[10px] text-[#CBD5E1]">asignados</p>
                  </div>
                </div>

                {/* Sales */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#E2E8F0] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Ventas semana</p>
                    <p className="mt-1 text-sm font-black text-[#27B1B8]">{fmt(seller.weekTotal)}</p>
                  </div>
                  <div className="rounded-xl border border-[#E2E8F0] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Ventas mes</p>
                    <p className="mt-1 text-sm font-black text-[#27B1B8]">{fmt(seller.monthTotal)}</p>
                  </div>
                </div>

                {/* Shipping status breakdown */}
                <div className="flex gap-2">
                  {[
                    { key: "pending",   label: "Pendientes", value: seller.pending,   bg: "#FEF3C7", color: "#D97706" },
                    { key: "shipped",   label: "Enviados",   value: seller.shipped,   bg: "#EDE9FE", color: "#7C3AED" },
                    { key: "delivered", label: "Entregados", value: seller.delivered, bg: "#DCFCE7", color: "#16A34A" },
                  ].map((s) => (
                    <div key={s.key} className="flex-1 rounded-xl px-2 py-2 text-center" style={{ background: s.bg }}>
                      <p className="text-base font-black" style={{ color: s.color }}>{s.value}</p>
                      <p className="text-[10px] font-semibold" style={{ color: s.color }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom grid */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Highlights */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">Destacados del mes</h2>
          <div className="space-y-4">
            {stats?.topProduct && (
              <div className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#27B1B8]/10 text-lg">📦</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Producto más vendido</p>
                  <p className="text-sm font-bold text-[#1A1A1A]">{stats.topProduct.name}</p>
                  <p className="text-xs text-[#94A3B8]">{stats.topProduct.qty} unidades</p>
                </div>
              </div>
            )}
            {stats?.topSeller && (
              <div className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B00]/10 text-lg">🏆</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Mejor vendedor</p>
                  <p className="text-sm font-bold text-[#1A1A1A]">{stats.topSeller.name}</p>
                  <p className="text-xs text-[#94A3B8]">{fmtUSD(stats.topSeller.total)} en campañas</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-xl bg-[#F8FAFC] p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#16A34A]/10 text-lg">🎯</div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Clientes únicos</p>
                <p className="text-sm font-bold text-[#1A1A1A]">{stats?.uniqueCustomers ?? 0} compradores</p>
                <p className="text-xs text-[#94A3B8]">este mes</p>
              </div>
            </div>
          </div>
        </div>

        {/* ROAS Rule */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">Regla Comercial Kliniu ×10</h2>
          <div className="mb-4 rounded-xl bg-[#F0F9F8] p-4">
            <p className="text-xs font-semibold text-[#27B1B8]">Meta mínima de retorno</p>
            <p className="mt-1 text-2xl font-black text-[#0C6060]">$1 invertido → $10 en ventas</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["excellent","acceptable","risk","bad"] as const).map((s) => {
              const meta = STATUS_META[s];
              const labels: Record<string, string> = { excellent: "≥ ×10", acceptable: "×7 – ×10", risk: "×4 – ×7", bad: "< ×4" };
              return (
                <div key={s} className="flex items-center gap-2 rounded-xl border p-3" style={{ borderColor: meta.color + "40", background: meta.bg }}>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: meta.color }} />
                  <div>
                    <p className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</p>
                    <p className="text-[10px] text-[#94A3B8]">{labels[s]}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
