"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MdGroups, MdSchedule, MdTimer, MdTrendingUp } from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { addDays } from "@/lib/commercial-calendar";
import { fmtDateOnly } from "@/lib/date";
import type { buildIndicators } from "@/lib/production-control-calculator";
import { SimpleSelect } from "../../_components/simple-select";
import { Badge, DateRange, Kpi, Section, Table, labelCls } from "../../_components/ops-ui";
import { SkeletonTable } from "../../../components/skeleton";
import { EfficiencyChip, fmtMin, jsonError, type Notify, type Options } from "./shared";

type Indicators = ReturnType<typeof buildIndicators>;

const fmtHours = (min: number) => `${(min / 60).toLocaleString("es-CO", { maximumFractionDigits: 1 })} h`;
const fmtSec = (s: number | null) => (s === null ? "—" : `${s.toLocaleString("es-CO", { maximumFractionDigits: 1 })} s`);
const fmtUnits = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });

/** Desviación del tiempo real contra el estándar: positivo = más lento que el estándar. */
function Deviation({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#94A3B8]">—</span>;
  const pct = Math.round(value * 100);
  const cls = pct > 10 ? "bg-[#FEE2E2] text-[#DC2626]" : pct < -10 ? "bg-[#DBEAFE] text-[#1D4ED8]" : "bg-[#DCFCE7] text-[#15803D]";
  const label = pct > 10 ? `+${pct} % más lento` : pct < -10 ? `${pct} % más rápido` : `${pct > 0 ? "+" : ""}${pct} % en estándar`;
  return <Badge label={label} cls={cls} />;
}

export function IndicatorsTab({ options, notify }: { options: Options; notify: Notify }) {
  const own = options.scope === "own";
  const [from, setFrom] = useState(addDays(options.today, -29));
  const [to, setTo] = useState(options.today);
  const [section, setSection] = useState("all");
  const [data, setData] = useState<Indicators | null>(null);

  const lastRequest = useRef(0);
  const load = useCallback(async () => {
    const request = ++lastRequest.current;
    try {
      const params = new URLSearchParams({ from, to });
      if (section !== "all") params.set("section", section);
      const r = await fetch(`/api/panel/ensamble/indicators?${params}`);
      const body = r.ok ? await r.json() : null;
      const error = r.ok ? null : await jsonError(r, "No fue posible calcular los indicadores");
      if (request !== lastRequest.current) return;
      if (body) setData(body); else notify("err", error!);
    } catch {
      if (request === lastRequest.current) notify("err", "Error de conexión");
    }
  }, [from, to, section, notify]);

  useRealtimeRefresh(["production-control"], load);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const t = data?.totals;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-2">
        <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <div className="w-36">
          <label className={labelCls}>Sección</label>
          <SimpleSelect value={section} portal
            options={[{ value: "all", label: "Todas" }, { value: "ENSAMBLE", label: "Ensamble" }, { value: "EMPAQUE", label: "Empaque" }]}
            onChange={setSection} />
        </div>
      </div>

      {!data || !t ? <SkeletonTable /> : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Kpi icon={<MdTrendingUp size={18} />} label={own ? "Mi eficiencia" : "Eficiencia ponderada"} value={t.efficiency === null ? "Sin datos" : `${Math.round(t.efficiency * 100)} %`} color="#15803D" />
            <Kpi icon={<MdSchedule size={18} />} label="Horas registradas" value={fmtHours(t.registeredMinutes)} color="#27B1B8" />
            <Kpi icon={<MdTimer size={18} />} label="Horas estándar ganadas" value={fmtHours(t.standardMinutes)} color="#6D28D9" />
            <Kpi icon={<MdGroups size={18} />} label={own ? "Días con registro" : "Operarios con registro"} value={String(own ? data.byDay.length : data.byOperator.length)} color="#0E7C82" />
          </div>
          <p className="-mt-4 text-xs text-[#94A3B8]">
            Eficiencia = minutos estándar ganados ÷ minutos asistidos de los bloques directos. Las operaciones indirectas (estándar 0) suman horas pero no entran al indicador.
          </p>

          {!own && (
            <Section title="Por operario">
              <Table
                head={["Operario", "Días", "Registrado", "Directo", "Estándar ganado", "Eficiencia"]}
                rows={data.byOperator.map((o) => [
                  <b key="n">{o.operatorName}</b>, String(o.days), fmtHours(o.registeredMinutes), fmtHours(o.directMinutes),
                  fmtHours(o.standardMinutes), <EfficiencyChip key="e" value={o.efficiency} />,
                ])}
                empty="Sin registros en este rango."
              />
            </Section>
          )}

          <Section title="Por día">
            <Table
              head={["Fecha", own ? null : "Operarios", "Registrado", "Estándar ganado", "Eficiencia"]}
              rows={data.byDay.map((d) => [
                fmtDateOnly(d.date, { weekday: "short", day: "2-digit", month: "short" }),
                own ? null : String(d.operators),
                `${fmtMin(d.registeredMinutes)} min`, `${fmtMin(d.standardMinutes)} min`, <EfficiencyChip key="e" value={d.efficiency} />,
              ])}
              empty="Sin registros en este rango."
            />
          </Section>

          {!own && (
            <Section title="Por ODT">
              <Table
                head={["ODT", "Producto", "Estado", "Uni lote", "Uni prod", "Unidades por operación", "Horas-hombre", "Eficiencia"]}
                rows={data.byWorkOrder.map((o) => [
                  <b key="n">#{o.number}</b>,
                  <span key="p" className="block max-w-[220px]">{o.reference}<span className="block truncate text-[11px] text-[#94A3B8]">{o.productName}</span></span>,
                  <Badge key="s" label={o.status === "OPEN" ? "Abierta" : "Cerrada"} cls={o.status === "OPEN" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"} />,
                  fmtUnits(o.quantity),
                  o.producedQuantity != null ? fmtUnits(o.producedQuantity) : "—",
                  <span key="u" className="flex max-w-[260px] flex-wrap gap-1">
                    {o.operations.map((op) => (
                      <span key={op.code} className="rounded-md bg-[#F1F5F9] px-1.5 py-0.5 text-[11px] text-[#475569]" title={op.name}>{op.code}: <b>{fmtUnits(op.units)}</b></span>
                    ))}
                  </span>,
                  fmtHours(o.laborMinutes),
                  <EfficiencyChip key="e" value={o.efficiency} />,
                ])}
                empty="Sin ODTs con registros en este rango."
              />
            </Section>
          )}

          <Section title="Tiempo real vs estándar por operación">
            <Table
              head={["Código", "Operación", "Familia", "Unidades", "Estándar (s/und)", "Real (s/und)", "Desviación"]}
              rows={data.byOperation.map((o) => [
                <b key="c">{o.code}</b>, o.name, o.family, fmtUnits(o.units),
                fmtSec(o.standardSecondsPerUnit), fmtSec(o.realSecondsPerUnit), <Deviation key="d" value={o.deviation} />,
              ])}
              empty="Sin operaciones directas registradas en este rango."
            />
            <p className="mt-2 text-xs text-[#94A3B8]">Tiempo real = minutos del bloque repartidos según el estándar de cada operación, dividido entre las unidades propias. Sirve para recalibrar la hoja de tiempos.</p>
          </Section>
        </>
      )}
    </div>
  );
}
