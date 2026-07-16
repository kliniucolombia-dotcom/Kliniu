import { redirect } from "next/navigation";
import { requirePermissionWithFallback } from "@/lib/permissions";
import { getDashboardStats, getSellerStats, calcROAS, getCampaignStatus, STATUS_META } from "@/lib/panel";
import { Sparkline, AreaChart, DonutChart } from "./_components/mini-charts";
import {
  MdAccountBalanceWallet, MdShoppingCart, MdTrendingUp, MdCampaign,
  MdGpsFixed, MdWarningAmber, MdPeopleOutline, MdReceiptLong, MdRefresh,
  MdInventory2, MdGroups,
} from "react-icons/md";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard — Panel Comercial" };

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtCompact = (n: number) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
};

const SHIPPING_BADGE: Record<string, { label: string; color: string; bg: string }> = {
  DELIVERED:  { label: "Completado", color: "#16A34A", bg: "#DCFCE7" },
  SHIPPED:    { label: "En proceso", color: "#2563EB", bg: "#DBEAFE" },
  PREPARING:  { label: "En proceso", color: "#2563EB", bg: "#DBEAFE" },
  PENDING:    { label: "Pendiente",  color: "#D97706", bg: "#FEF3C7" },
  CANCELLED:  { label: "Cancelado",  color: "#DC2626", bg: "#FEE2E2" },
};

export default async function PanelDashboard() {
  const access = await requirePermissionWithFallback("MODULE_DASHBOARD", "view");
  if (!access.ok) {
    redirect(access.redirectTo);
  }
  const { session, user } = access;

  const isAdmin = session.role === "ADMIN";
  const [stats, sellers] = await Promise.all([
    getDashboardStats(),
    isAdmin ? getSellerStats() : Promise.resolve([]),
  ]);

  const monthSalesTrend = stats?.dailySales.map((d) => d.total) ?? [];

  const kpis = stats
    ? [
        { label: "Vendido hoy",         value: fmt(stats.todayTotal),              sub: "pedidos del día",                  color: "#27B1B8", icon: MdAccountBalanceWallet, trend: monthSalesTrend },
        { label: "Vendido esta semana", value: fmt(stats.weekTotal),               sub: `${stats.weekOrderCount} pedidos`,  color: "#27B1B8", icon: MdShoppingCart, trend: monthSalesTrend },
        { label: "Vendido este mes",    value: fmt(stats.monthTotal),              sub: `${stats.monthOrderCount} pedidos`, color: "#27B1B8", icon: MdTrendingUp, trend: monthSalesTrend },
        { label: "Inversión pauta",     value: fmtUSD(stats.totalInvestment),      sub: "total campañas",                   color: "#FF6B00", icon: MdCampaign, trend: stats.campaignTrends.investment },
        { label: "Retorno campañas",    value: fmtUSD(stats.totalSales),           sub: "ventas generadas",                 color: "#16A34A", icon: MdGpsFixed, trend: stats.campaignTrends.sales },
        { label: "ROAS general",        value: `×${stats.roasGeneral.toFixed(1)}`, sub: "meta ×10",                        color: stats.roasGeneral >= 10 ? "#16A34A" : stats.roasGeneral >= 7 ? "#D97706" : "#DC2626", icon: MdTrendingUp, trend: stats.campaignTrends.roas },
        { label: "Campañas en riesgo",  value: stats.atRisk.toString(),            sub: "ROAS < 7×",                        color: stats.atRisk > 0 ? "#DC2626" : "#16A34A", icon: MdWarningAmber, trend: stats.campaignTrends.risk },
        { label: "Clientes nuevos",     value: stats.newCustomers.toString(),      sub: "este mes",                         color: "#27B1B8", icon: MdPeopleOutline, trend: stats.dailyNewCustomers },
        { label: "Ticket promedio",     value: fmt(stats.avgTicket),               sub: "por pedido",                       color: "#64748B", icon: MdReceiptLong, trend: stats.dailyAvgTicket },
      ]
    : [];

  const today = new Date();
  const rangeLabel = `1-${today.getDate()} ${today.toLocaleDateString("es-CO", { month: "short", year: "numeric" })}`;
  const firstName = user.fullName.split(" ")[0];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">¡Hola, {firstName}! 👋</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Dashboard Comercial</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">
            Resumen de tu negocio al {today.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#64748B]">
            Este mes · {rangeLabel}
          </div>
          <a href="/panel" className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-bold text-[#1A1A1A] hover:bg-[#F8FAFC]">
            <MdRefresh size={15} /> Actualizar
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="flex items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <div className="flex items-start gap-3 min-w-0">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full" style={{ background: kpi.color + "1A", color: kpi.color }}>
                  <Icon size={19} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#64748B]">{kpi.label}</p>
                  <p className="text-xl font-black" style={{ color: kpi.color }}>{kpi.value}</p>
                  <p className="mt-0.5 text-xs text-[#94A3B8]">{kpi.sub}</p>
                </div>
              </div>
              {kpi.trend && kpi.trend.length > 1 && (
                <Sparkline values={kpi.trend} color={kpi.color} />
              )}
            </div>
          );
        })}
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

      {/* Ventas del mes + Ventas por canal */}
      {stats && (
        <div className="mb-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 lg:col-span-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-[#1A1A1A]">Ventas del mes</h2>
                <div className="mt-1 flex items-center gap-2">
                  <p className="text-2xl font-black text-[#1A1A1A]">{fmt(stats.monthTotal)}</p>
                  {stats.monthChangePercent !== null && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        color: stats.monthChangePercent >= 0 ? "#16A34A" : "#DC2626",
                        background: stats.monthChangePercent >= 0 ? "#DCFCE7" : "#FEE2E2",
                      }}
                    >
                      {stats.monthChangePercent >= 0 ? "↑" : "↓"} {Math.abs(stats.monthChangePercent)}% vs mes anterior
                    </span>
                  )}
                </div>
              </div>
            </div>
            <AreaChart
              values={stats.dailySales.map((d) => d.total)}
              labels={stats.dailySales.map((d) => new Date(d.date).toLocaleDateString("es-CO", { day: "numeric", month: "short" }))}
              color="#27B1B8"
              gradientId="ventasMesGradient"
            />
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">Ventas por canal</h2>
            {stats.salesByChannel.length === 0 ? (
              <p className="text-xs text-[#94A3B8]">Sin ventas este mes todavía.</p>
            ) : (
              <div className="flex items-center gap-5">
                <div className="relative shrink-0">
                  <DonutChart
                    slices={stats.salesByChannel.map((c, i) => ({
                      label: c.label, value: c.total,
                      color: ["#27B1B8", "#3B82F6", "#8B5CF6", "#F59E0B"][i % 4],
                    }))}
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-sm font-black text-[#1A1A1A]">{fmtCompact(stats.monthTotal)}</p>
                    <p className="text-[10px] text-[#94A3B8]">Total</p>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {stats.salesByChannel.map((c, i) => {
                    const color = ["#27B1B8", "#3B82F6", "#8B5CF6", "#F59E0B"][i % 4];
                    const pct = stats.monthTotal > 0 ? Math.round((c.total / stats.monthTotal) * 100) : 0;
                    return (
                      <div key={c.channel} className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                        <span className="min-w-0 flex-1 truncate text-xs text-[#64748B]">{c.label}</span>
                        <span className="shrink-0 text-xs font-bold text-[#1A1A1A]">{fmtCompact(c.total)}</span>
                        <span className="w-8 shrink-0 text-right text-[10px] text-[#94A3B8]">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom grid */}
      <div className="grid gap-6 lg:grid-cols-3">

        {/* Highlights */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">Destacados del mes</h2>
          <div className="space-y-4">
            {stats?.topProduct && (
              <div className="flex items-center gap-3 rounded-xl bg-[#EFFCFB] p-3">
                {stats.topProduct.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={stats.topProduct.image} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover bg-white" />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#27B1B8]/15 text-[#0E9488]">
                    <MdInventory2 size={18} />
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#0E9488]">Producto más vendido</p>
                  <p className="text-sm font-black text-[#1A1A1A]">{stats.topProduct.name}</p>
                  <p className="text-xs text-[#64748B]">{stats.topProduct.qty} unidades vendidas</p>
                </div>
              </div>
            )}
            {stats?.topSeller && (
              <div className="flex items-center gap-3 rounded-xl bg-[#FFF7ED] p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FF6B00]/15 text-lg">🏆</div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#C2410C]">Mejor vendedor</p>
                  <p className="text-sm font-black text-[#1A1A1A]">{stats.topSeller.name}</p>
                  <p className="text-xs text-[#64748B]">{fmtUSD(stats.topSeller.total)} en campañas</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[#EFFCFB] p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#16A34A]/15 text-[#15803D]">
                  <MdGroups size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#15803D]">Clientes únicos</p>
                  <p className="text-sm font-black text-[#1A1A1A]">{stats?.uniqueCustomers ?? 0} compradores</p>
                  <p className="text-xs text-[#64748B]">este mes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Últimos pedidos */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-black text-[#1A1A1A]">Últimos pedidos</h2>
            <a href="/panel/pedidos" className="text-xs font-bold text-[#27B1B8] hover:underline">Ver todos</a>
          </div>
          <div className="space-y-3">
            {stats?.recentOrders.length === 0 && (
              <p className="text-xs text-[#94A3B8]">Sin pedidos todavía.</p>
            )}
            {stats?.recentOrders.map((o) => {
              const badge = SHIPPING_BADGE[o.shippingStatus] ?? SHIPPING_BADGE.PENDING;
              return (
                <div key={o.id} className="flex items-center justify-between gap-2 rounded-xl bg-[#F8FAFC] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#27B1B8]/15 text-[#0E9488]">
                      <MdInventory2 size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-black text-[#1A1A1A]">#{o.id.slice(-6).toUpperCase()}</p>
                      <p className="truncate text-xs text-[#64748B]">{o.customerName}</p>
                      <p className="text-[10px] text-[#94A3B8]">
                        {new Date(o.createdAt).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}, {new Date(o.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-black text-[#1A1A1A]">{fmt(o.subtotal)}</p>
                    <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ color: badge.color, background: badge.bg }}>
                      {badge.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ROAS Rule */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-black text-[#1A1A1A]">Regla Comercial Kliniu ×10</h2>
          <div className="mb-4 rounded-xl bg-[#F0F9F8] p-4">
            <p className="text-xs font-semibold text-[#27B1B8]">Meta mínima de retorno</p>
            <p className="mt-1 text-lg font-black text-[#0C6060]">$1 invertido → $10 en ventas</p>
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
