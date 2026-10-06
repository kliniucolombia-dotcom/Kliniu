"use client";
import { useMemo } from "react";
import { createPortal } from "react-dom";
import { blockKey, buildIndicators, standardMinutesOf, type Summary } from "@/lib/production-control-calculator";
import { fmtDateOnly, fmtTimeOnly } from "@/lib/date";
import { EfficiencyChip, SECTION_LABEL, fmtMin, type Entry } from "./shared";

const fmtHours = (min: number) => `${(min / 60).toLocaleString("es-CO", { maximumFractionDigits: 1 })} h`;
const fmtNum = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
const fmtSec = (s: number | null) => (s === null ? "—" : `${fmtNum(s)} s`);
const longDate = (d: string) => fmtDateOnly(d, { day: "2-digit", month: "long", year: "numeric" });

function Block({ title, head, rows, empty }: { title: string; head: string[]; rows: React.ReactNode[][]; empty: string }) {
  return (
    <section className="mt-5">
      <h2 className="mb-1.5 border-l-4 border-[#27B1B8] pl-2 text-[13px] font-black text-[#0C535B]">{title}</h2>
      {rows.length === 0 ? <p className="text-[#94A3B8]">{empty}</p> : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#0C535B] text-left text-[9px] uppercase tracking-wider text-white">
              {head.map((h) => <th key={h} className="px-2 py-1.5 font-bold">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className={`break-inside-avoid border-b border-[#E2E8F0] align-top ${i % 2 ? "bg-[#F8FAFC]" : ""}`}>
                {r.map((c, k) => <td key={k} className="px-2 py-1">{c}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Reporte imprimible (PDF vía window.print) de los registros en pantalla; solo se ve al imprimir. */
export function EnsambleReport({ entries, blocks, from, to, operator, section, search, truncated }: {
  entries: Entry[]; blocks: Map<string, Summary>; from: string; to: string; operator: string; section: string; search: string; truncated: boolean;
}) {
  const ind = useMemo(() => buildIndicators(entries.map((e) => ({ ...e, operatorName: e.operator.fullName }))), [entries]);
  const t = ind.totals;
  const kpis = [
    ["Eficiencia ponderada", t.efficiency === null ? "Sin datos" : `${Math.round(t.efficiency * 100)} %`],
    ["Horas registradas", fmtHours(t.registeredMinutes)],
    ["Horas estándar ganadas", fmtHours(t.standardMinutes)],
    ["Registros", String(entries.length)],
    ["Operarios", String(ind.byOperator.length)],
  ];

  return createPortal(
    <div id="ensamble-reporte" className="hidden bg-white text-[10px] leading-snug text-[#1A1A1A] print:block">
      <style>{`@media print {
        body > *:not(#ensamble-reporte) { display: none !important; }
        #ensamble-reporte { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @page { size: landscape; margin: 10mm; }
      }`}</style>

      <header className="flex items-center justify-between border-b-4 border-[#27B1B8] pb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Kliniu" className="h-12 w-auto" />
        <div className="text-right">
          <h1 className="text-lg font-black text-[#0C535B]">Reporte de Ensamble</h1>
          <p className="font-semibold text-[#475569]">Del {longDate(from)} al {longDate(to)}</p>
        </div>
      </header>
      <p className="mt-2 text-[#475569]">
        <b>Operario:</b> {operator} · <b>Sección:</b> {section}{search && <> · <b>Búsqueda:</b> “{search}”</>}
      </p>
      {truncated && <p className="mt-1 rounded bg-[#FEF3C7] px-2 py-1 font-bold text-[#B45309]">Reporte incompleto: el rango supera los 5.000 registros.</p>}

      <div className="mt-3 grid grid-cols-5 gap-2">
        {kpis.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-[#E2E8F0] bg-[#F0FAFA] px-3 py-2">
            <p className="text-base font-black text-[#0C535B]">{value}</p>
            <p className="text-[9px] font-bold uppercase tracking-wider text-[#64748B]">{label}</p>
          </div>
        ))}
      </div>
      <p className="mt-1.5 text-[9px] text-[#94A3B8]">Eficiencia = minutos estándar ganados ÷ minutos asistidos de los bloques directos. Las operaciones indirectas suman horas pero no entran al indicador.</p>

      <Block title="Por operario" empty="Sin registros." head={["Operario", "Días", "Registrado", "Directo", "Estándar ganado", "Eficiencia"]}
        rows={ind.byOperator.map((o) => [<b key="n">{o.operatorName}</b>, o.days, fmtHours(o.registeredMinutes), fmtHours(o.directMinutes), fmtHours(o.standardMinutes), <EfficiencyChip key="e" value={o.efficiency} />])} />

      <Block title="Por día" empty="Sin registros." head={["Fecha", "Operarios", "Registrado", "Estándar ganado", "Eficiencia"]}
        rows={ind.byDay.map((d) => [fmtDateOnly(d.date, { weekday: "long", day: "2-digit", month: "short" }), d.operators, `${fmtMin(d.registeredMinutes)} min`, `${fmtMin(d.standardMinutes)} min`, <EfficiencyChip key="e" value={d.efficiency} />])} />

      <Block title="Por ODT" empty="Sin ODTs con registros." head={["ODT", "Producto", "Estado", "Uni lote", "Uni prod", "Unidades por operación", "Horas-hombre", "Eficiencia"]}
        rows={ind.byWorkOrder.map((o) => [
          <b key="n">#{o.number}</b>, `${o.reference} · ${o.productName}`, o.status === "OPEN" ? "Abierta" : "Cerrada", fmtNum(o.quantity),
          o.producedQuantity != null ? fmtNum(o.producedQuantity) : "—",
          o.operations.map((op) => `${op.code}: ${fmtNum(op.units)}`).join(" · "), fmtHours(o.laborMinutes), <EfficiencyChip key="e" value={o.efficiency} />,
        ])} />

      <Block title="Tiempo real vs estándar por operación" empty="Sin operaciones directas." head={["Código", "Operación", "Familia", "Unidades", "Estándar (s/und)", "Real (s/und)", "Desviación"]}
        rows={ind.byOperation.map((o) => {
          const pct = o.deviation === null ? null : Math.round(o.deviation * 100);
          return [<b key="c">{o.code}</b>, o.name, o.family, fmtNum(o.units), fmtSec(o.standardSecondsPerUnit), fmtSec(o.realSecondsPerUnit),
            pct === null ? "—" : pct > 10 ? `+${pct} % más lento` : pct < -10 ? `${pct} % más rápido` : `${pct > 0 ? "+" : ""}${pct} % en estándar`];
        })} />

      <Block title="Detalle de registros" empty="Sin registros." head={["Fecha", "Operario", "Sección", "Horario", "ODT", "Operación", "Cant.", "Pers.", "Estándar", "Bloque"]}
        rows={entries.map((e) => [
          <span key="f" className="whitespace-nowrap">{fmtDateOnly(e.workDate, { day: "2-digit", month: "short" })}</span>,
          e.operator.fullName, SECTION_LABEL[e.section],
          <span key="h" className="whitespace-nowrap">{fmtTimeOnly(e.startTime)}–{fmtTimeOnly(e.endTime)}</span>,
          e.workOrder ? `#${e.workOrder.number} ${e.workOrder.reference}` : "—",
          `${e.operation.code} · ${e.operation.name}`, e.quantity, e.sharedBy,
          e.standardSeconds > 0 ? `${fmtMin(standardMinutesOf(e))} min` : "Indirecta",
          <EfficiencyChip key="e" value={blocks.get(blockKey(e))?.efficiency ?? null} />,
        ])} />

      <p className="mt-4 text-right text-[9px] text-[#94A3B8]">Kliniu Colombia · Generado el {new Date().toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "long", timeStyle: "short" })}</p>
    </div>,
    document.body,
  );
}
