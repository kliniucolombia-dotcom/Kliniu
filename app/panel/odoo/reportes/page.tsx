import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/permissions";
import { getOdooSalesReport, type OdooReportPeriod } from "@/lib/odoo";
import { getOdooErrorMessage } from "../odoo-error-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reportes Odoo — Panel Comercial" };

const fmtMoney = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);

const fmtNumber = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 1,
  }).format(value);

function getPartnerName(partner: [number, string] | false | undefined) {
  return Array.isArray(partner) ? partner[1] : "Cliente sin asignar";
}

function getStateLabel(state?: string) {
  const labels: Record<string, string> = {
    draft: "Cotización",
    sent: "Enviada",
    sale: "Pedido",
    done: "Hecho",
    cancel: "Cancelado",
  };

  return state ? labels[state] || state : "Sin estado";
}

function getStateTone(state?: string) {
  if (state === "sale" || state === "done") {
    return "bg-[#DCFCE7] text-[#16A34A]";
  }

  if (state === "draft" || state === "sent") {
    return "bg-[#FEF3C7] text-[#D97706]";
  }

  return "bg-[#F1F5F9] text-[#64748B]";
}

function getPeriodHref(period: OdooReportPeriod) {
  return `/panel/odoo/reportes?period=${period}`;
}

function normalizePeriod(period?: string): OdooReportPeriod {
  if (period === "today" || period === "week" || period === "month") {
    return period;
  }

  return "month";
}

function getReportErrorMessage(error: unknown) {
  return getOdooErrorMessage(error);
}

export default async function OdooReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const access = await requirePermission("MODULE_ODOO", "view");
  if (!access.ok) {
    redirect("/login");
  }

  const query = await searchParams;
  const activePeriod = normalizePeriod(query?.period);
  const report = await getOdooSalesReport(query?.period).catch((error) => ({
    error: getReportErrorMessage(error),
  }));

  if ("error" in report) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Odoo</p>
            <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Reportes</h1>
            <p className="mt-1 text-sm text-[#64748B]">
              Ventas, cotizaciones, clientes, productos y alertas desde Odoo.
            </p>
          </div>
          <div className="flex rounded-xl border border-[#E2E8F0] bg-white p-1">
            {[
              ["today", "Hoy"],
              ["week", "Semana"],
              ["month", "Mes"],
            ].map(([period, label]) => {
              const active = activePeriod === period;

              return (
                <Link
                  key={period}
                  href={getPeriodHref(period as OdooReportPeriod)}
                  className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${
                    active
                      ? "bg-[#27B1B8] text-white"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1A1A1A]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-[#FCA5A5] bg-[#FEF2F2] p-6">
          <p className="text-xs font-black uppercase tracking-widest text-[#DC2626]">Odoo no respondió</p>
          <h2 className="mt-2 text-lg font-black text-[#1A1A1A]">El reporte no se pudo cargar</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">{report.error}</p>
          <Link
            href={getPeriodHref(activePeriod)}
            className="mt-5 inline-flex rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-85"
          >
            Reintentar
          </Link>
        </div>
      </div>
    );
  }

  const maxProductAmount = Math.max(
    ...report.topProducts.map((product) => product.amount),
    1,
  );

  const cards = [
    {
      label: "Ventas confirmadas",
      value: fmtMoney(report.metrics.confirmedSales),
      sub: `${report.metrics.confirmedOrders} pedidos`,
      color: "#27B1B8",
    },
    {
      label: "Ticket promedio",
      value: fmtMoney(report.metrics.averageTicket),
      sub: "por pedido confirmado",
      color: "#64748B",
    },
    {
      label: "Cotizaciones",
      value: report.metrics.quotations.toString(),
      sub: "borrador o enviadas",
      color: "#D97706",
    },
    {
      label: "Clientes únicos",
      value: report.metrics.uniqueCustomers.toString(),
      sub: "con compras confirmadas",
      color: "#0C535B",
    },
    {
      label: "Por facturar",
      value: report.metrics.toInvoice.toString(),
      sub: "pedidos confirmados",
      color: "#FF6B00",
    },
    {
      label: "Oportunidades CRM",
      value: report.metrics.opportunities.toString(),
      sub: fmtMoney(report.metrics.expectedRevenue),
      color: "#16A34A",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Odoo</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Reportes</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Ventas, cotizaciones, clientes, productos y alertas desde Odoo.
          </p>
        </div>
        <div className="flex rounded-xl border border-[#E2E8F0] bg-white p-1">
          {[
            ["today", "Hoy"],
            ["week", "Semana"],
            ["month", "Mes"],
          ].map(([period, label]) => {
            const active = report.period === period;

            return (
              <Link
                key={period}
                href={getPeriodHref(period as OdooReportPeriod)}
                className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${
                  active
                    ? "bg-[#27B1B8] text-white"
                    : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#1A1A1A]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <p className="text-xs font-semibold text-[#94A3B8]">{card.label}</p>
            <p className="mt-1 text-2xl font-black" style={{ color: card.color }}>
              {card.value}
            </p>
            <p className="mt-0.5 text-xs text-[#CBD5E1]">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1A1A]">Productos más vendidos</h2>
              <p className="mt-1 text-xs text-[#94A3B8]">{report.label}</p>
            </div>
            <Link href="/panel/odoo/productos" className="text-xs font-black text-[#27B1B8]">
              Ver productos
            </Link>
          </div>

          <div className="space-y-3">
            {report.topProducts.length > 0 ? (
              report.topProducts.map((product) => (
                <div key={product.id} className="rounded-xl bg-[#F8FAFC] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black leading-tight text-[#1A1A1A]">{product.name}</p>
                      <p className="mt-1 text-xs text-[#94A3B8]">{fmtNumber(product.quantity)} unidades</p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-[#0C535B]">{fmtMoney(product.amount)}</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
                    <div
                      className="h-full rounded-full bg-[#27B1B8]"
                      style={{ width: `${Math.max((product.amount / maxProductAmount) * 100, 8)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                No hay productos vendidos en este período.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-[#1A1A1A]">Alertas de inventario</h2>
              <p className="mt-1 text-xs text-[#94A3B8]">Stock en 10 unidades o menos</p>
            </div>
            <Link href="/panel/odoo/inventario" className="text-xs font-black text-[#27B1B8]">
              Ver inventario
            </Link>
          </div>

          <div className="space-y-3">
            {report.lowStockProducts.length > 0 ? (
              report.lowStockProducts.map((product) => {
                const qty = product.qty_available ?? 0;

                return (
                  <div key={product.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#F8FAFC] p-4">
                    <div>
                      <p className="text-sm font-black leading-tight text-[#1A1A1A]">{product.name}</p>
                      <p className="mt-1 text-xs text-[#94A3B8]">{product.default_code || "Sin SKU"}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${qty <= 0 ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#FEF3C7] text-[#D97706]"}`}>
                      {qty}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                No hay alertas de stock en los productos revisados.
              </p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white">
          <div className="border-b border-[#E2E8F0] p-5">
            <h2 className="text-base font-black text-[#1A1A1A]">Últimos pedidos y cotizaciones</h2>
            <p className="mt-1 text-xs text-[#94A3B8]">
              Desde {report.startDate} hasta {report.endDate}
            </p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {["Orden", "Cliente", "Estado", "Total"].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {report.orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <p className="font-black text-[#1A1A1A]">{order.name}</p>
                    <p className="mt-1 text-[10px] text-[#94A3B8]">{order.date_order || "Sin fecha"}</p>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-[#64748B]">{getPartnerName(order.partner_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${getStateTone(order.state)}`}>
                      {getStateLabel(order.state)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-black text-[#0C535B]">{fmtMoney(order.amount_total ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

        <section className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-base font-black text-[#1A1A1A]">Oportunidades recientes</h2>
          <p className="mt-1 text-xs text-[#94A3B8]">CRM leído desde Odoo cuando está disponible</p>

          <div className="mt-4 space-y-3">
            {report.opportunities.length > 0 ? (
              report.opportunities.slice(0, 8).map((lead) => (
                <div key={lead.id} className="rounded-xl bg-[#F8FAFC] p-4">
                  <p className="text-sm font-black leading-tight text-[#1A1A1A]">{lead.name}</p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-[#64748B]">
                      {Array.isArray(lead.stage_id) ? lead.stage_id[1] : "Sin etapa"}
                    </span>
                    <span className="font-black text-[#16A34A]">{fmtMoney(lead.expected_revenue ?? 0)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-xl bg-[#F8FAFC] p-4 text-sm text-[#64748B]">
                No hay oportunidades nuevas en este período o CRM no está disponible para este usuario.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
