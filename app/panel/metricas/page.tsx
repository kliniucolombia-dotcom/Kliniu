import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth";
import { getMetrics, getDashboardStats } from "@/lib/panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Métricas — Panel Comercial Kliniu" };

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function MetricasPanel() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) redirect("/login");

  const [metrics, stats] = await Promise.all([
    getMetrics(session.role === "SELLER" ? session.userId : undefined),
    getDashboardStats(),
  ]);

  const maxMonthly = metrics ? Math.max(...metrics.monthlyData.map((m) => m.total), 1) : 1;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Métricas de venta</h1>
      </div>

      {/* KPIs rápidos */}
      {stats && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Ventas totales (mes)", value: fmt(stats.monthTotal),           color: "#27B1B8" },
            { label: "Pedidos (mes)",        value: stats.monthOrderCount.toString(), color: "#27B1B8" },
            { label: "Ticket promedio",      value: fmt(stats.avgTicket),            color: "#FF6B00" },
            { label: "Clientes únicos",      value: stats.uniqueCustomers.toString(), color: "#16A34A" },
          ].map((k) => (
            <div key={k.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <p className="text-xs font-semibold text-[#94A3B8]">{k.label}</p>
              <p className="mt-1 text-2xl font-black" style={{ color: k.color }}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Gráfica barras — ventas últimos 6 meses */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-5 text-sm font-black text-[#1A1A1A]">Ventas últimos 6 meses</h2>
          {metrics ? (
            <div className="space-y-3">
              {metrics.monthlyData.map((m) => {
                const pct = maxMonthly > 0 ? (m.total / maxMonthly) * 100 : 0;
                const isMax = m.total === maxMonthly;
                return (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="w-8 text-right text-xs font-bold text-[#64748B] capitalize">{m.label}</span>
                    <div className="flex-1 overflow-hidden rounded-full bg-[#F1F5F9]" style={{ height: 24 }}>
                      <div
                        className="flex h-full items-center justify-end rounded-full pr-2 transition-all"
                        style={{ width: `${Math.max(pct, 4)}%`, background: isMax ? "#27B1B8" : "#CBD5E1" }}
                      >
                        <span className="text-[10px] font-bold text-white">{pct > 20 ? fmt(m.total) : ""}</span>
                      </div>
                    </div>
                    <span className="w-28 text-right text-xs font-semibold text-[#1A1A1A]">{fmt(m.total)}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[#94A3B8]">Sin datos</p>
          )}
        </div>

        {/* Ranking vendedores */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-5 text-sm font-black text-[#1A1A1A]">Ranking de vendedores</h2>
          {metrics && metrics.sellerRanking.length > 0 ? (
            <div className="space-y-3">
              {metrics.sellerRanking.map((s, i) => (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-[#F1F5F9] p-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                    style={{ background: i === 0 ? "#F59E0B" : i === 1 ? "#94A3B8" : i === 2 ? "#CD7F32" : "#E2E8F0" }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#1A1A1A]">{s.name}</p>
                    <p className="text-[10px] text-[#94A3B8]">{s.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#16A34A]">{fmtUSD(s.totalSales)}</p>
                    <p className="text-[10px] text-[#94A3B8]">ROAS ×{s.roas.toFixed(1)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
              <p className="text-2xl">👥</p>
              <p className="text-sm font-semibold text-[#94A3B8]">No hay vendedores registrados</p>
              <p className="text-xs text-[#CBD5E1]">Crea usuarios con rol SELLER para verlos aquí</p>
            </div>
          )}
        </div>

        {/* Crecimiento mensual */}
        {metrics && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 lg:col-span-2">
            <h2 className="mb-5 text-sm font-black text-[#1A1A1A]">Crecimiento mensual</h2>
            <div className="flex items-end justify-between gap-2" style={{ height: 120 }}>
              {metrics.monthlyData.map((m, i) => {
                const prev = i > 0 ? metrics.monthlyData[i - 1].total : m.total;
                const growth = prev > 0 ? ((m.total - prev) / prev) * 100 : 0;
                const pct = maxMonthly > 0 ? Math.max((m.total / maxMonthly) * 100, 4) : 4;
                return (
                  <div key={m.label} className="flex flex-1 flex-col items-center gap-1">
                    <p className={`text-[9px] font-bold ${growth > 0 ? "text-[#16A34A]" : growth < 0 ? "text-[#DC2626]" : "text-[#94A3B8]"}`}>
                      {i > 0 ? `${growth > 0 ? "+" : ""}${growth.toFixed(0)}%` : "—"}
                    </p>
                    <div className="flex w-full items-end justify-center">
                      <div
                        className="w-full max-w-[48px] rounded-t-lg"
                        style={{ height: `${pct}%`, background: i === metrics.monthlyData.length - 1 ? "#27B1B8" : "#CBD5E1", minHeight: 4 }}
                      />
                    </div>
                    <p className="text-[9px] font-semibold capitalize text-[#94A3B8]">{m.label}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
