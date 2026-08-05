"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MdPayments, MdEventBusy, MdAccessTime, MdGroups, MdFileDownload, MdRefresh,
} from "react-icons/md";
import { AreaChart, DonutChart } from "@/app/panel/_components/mini-charts";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type Bucket = { label: string; total: number };

type Reportes = {
  range: { from: string; to: string };
  nomina: { totalNeto: number; totalBruto: number; totalDeducciones: number; desprendibles: number; porPeriodo: Bucket[] };
  ausentismo: { diasAprobados: number; solicitudes: number; porTipo: Bucket[]; porEstado: Bucket[] };
  asistencia: Bucket[];
  horasExtra: { horasAprobadas: number; solicitudes: number; porTipo: Bucket[] };
  tickets: { total: number; porCategoria: Bucket[]; porEstado: Bucket[] };
  plantilla: { activos: number; porDepartamento: Bucket[]; porContrato: Bucket[] };
};

const COLORS = ["#27B1B8", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B", "#EF4444"];

const TIME_OFF_LABELS: Record<string, string> = {
  VACATION: "Vacaciones", PERMIT: "Permiso", LEAVE: "Licencia", INCAPACITY: "Incapacidad", UNPAID: "Sin remuneración",
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada", CANCELLED: "Cancelada",
  PENDIENTE: "Pendiente", EN_PROCESO: "En proceso", ESPERANDO_RESPUESTA: "Esperando respuesta",
  FINALIZADO: "Finalizado", CANCELADO: "Cancelado",
};
const ATTENDANCE_LABELS: Record<string, string> = { PRESENT: "Presente", ABSENT: "Ausente", LATE: "Tarde" };
const OVERTIME_LABELS: Record<string, string> = {
  DIURNA: "Diurna", NOCTURNA: "Nocturna",
  DOMINICAL_FESTIVA_DIURNA: "Dominical/festiva diurna", DOMINICAL_FESTIVA_NOCTURNA: "Dominical/festiva nocturna",
};
const CONTRACT_LABELS: Record<string, string> = {
  INDEFINITE: "Indefinido", FIXED_TERM: "Término fijo", WORK_OR_LABOR: "Obra o labor", APPRENTICESHIP: "Aprendizaje",
};

function money(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);
}

function toInputDate(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function withLabels(buckets: Bucket[], dict: Record<string, string>) {
  return buckets.map((b, i) => ({ label: dict[b.label] ?? b.label, value: b.total, color: COLORS[i % COLORS.length] }));
}

export default function ReportesPanelPage() {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const [from, setFrom] = useState(defaultFrom.toISOString().slice(0, 10));
  const [to, setTo] = useState(today.toISOString().slice(0, 10));
  const [data, setData] = useState<Reportes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Guarda la última consulta lanzada: si el usuario cambia el rango rápido, las
  // respuestas pueden llegar desordenadas y una vieja pisaría a la nueva.
  const latestQuery = useRef("");

  const load = useCallback(async () => {
    const query = `from=${from}&to=${to}`;
    latestQuery.current = query;
    setError("");
    const res = await fetch(`/api/rrhh-local/reportes?${query}`);
    if (latestQuery.current !== query) return;
    if (res.ok) setData(await res.json());
    else setError("No fue posible cargar los reportes");
    setLoading(false);
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(["timeoff", "tickets"], load);

  const exportCsv = () => {
    if (!data) return;
    const rows: string[][] = [["Reporte", "Concepto", "Valor"]];
    rows.push(["Nómina", "Total neto pagado", String(data.nomina.totalNeto)]);
    rows.push(["Nómina", "Total bruto", String(data.nomina.totalBruto)]);
    rows.push(["Nómina", "Total deducciones", String(data.nomina.totalDeducciones)]);
    rows.push(["Nómina", "Desprendibles emitidos", String(data.nomina.desprendibles)]);
    data.nomina.porPeriodo.forEach((b) => rows.push(["Nómina por período", b.label, String(b.total)]));
    rows.push(["Ausentismo", "Días aprobados", String(data.ausentismo.diasAprobados)]);
    data.ausentismo.porTipo.forEach((b) => rows.push(["Ausentismo por tipo", TIME_OFF_LABELS[b.label] ?? b.label, String(b.total)]));
    data.asistencia.forEach((b) => rows.push(["Asistencia", ATTENDANCE_LABELS[b.label] ?? b.label, String(b.total)]));
    rows.push(["Horas extra", "Horas aprobadas", String(data.horasExtra.horasAprobadas)]);
    data.horasExtra.porTipo.forEach((b) => rows.push(["Horas extra por tipo", OVERTIME_LABELS[b.label] ?? b.label, String(b.total)]));
    rows.push(["Tickets", "Total creados", String(data.tickets.total)]);
    data.tickets.porCategoria.forEach((b) => rows.push(["Tickets por categoría", b.label, String(b.total)]));
    rows.push(["Plantilla", "Colaboradores activos", String(data.plantilla.activos)]);
    data.plantilla.porDepartamento.forEach((b) => rows.push(["Plantilla por departamento", b.label, String(b.total)]));

    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reportes-rrhh-${from}-a-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Reportes</h1>
          <p className="text-xs text-[#64748B]">Consolidado de nómina, ausentismo, horas extra y plantilla en el rango elegido.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-[#64748B]">
            Desde
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="mt-1 block rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A]" />
          </label>
          <label className="text-xs font-bold text-[#64748B]">
            Hasta
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="mt-1 block rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A]" />
          </label>
          <button onClick={load}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
            <MdRefresh size={16} /> Actualizar
          </button>
          <button onClick={exportCsv}
            className="flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
            <MdFileDownload size={16} /> Exportar
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Kpi value={money(data.nomina.totalNeto)} label="Nómina neta pagada" hint={`${data.nomina.desprendibles} desprendibles`} icon={<MdPayments size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
            <Kpi value={String(data.ausentismo.diasAprobados)} label="Días de ausencia" hint={`${data.ausentismo.solicitudes} solicitudes en total`} icon={<MdEventBusy size={20} />} tone="bg-[#FEF3C7] text-[#B45309]" />
            <Kpi value={`${data.horasExtra.horasAprobadas} h`} label="Horas extra aprobadas" hint={`${data.horasExtra.solicitudes} solicitudes`} icon={<MdAccessTime size={20} />} tone="bg-[#DBEAFE] text-[#2563EB]" />
            <Kpi value={String(data.plantilla.activos)} label="Colaboradores activos" hint="Plantilla al día de hoy" icon={<MdGroups size={20} />} tone="bg-[#EDE9FE] text-[#7C3AED]" />
          </div>

          <Card title="Nómina neta por período" subtitle="Suma de los desprendibles emitidos en cada período">
            {data.nomina.porPeriodo.length >= 2 ? (
              <AreaChart
                values={data.nomina.porPeriodo.map((b) => b.total)}
                labels={data.nomina.porPeriodo.map((b) => b.label)}
                color="#27B1B8"
                gradientId="nominaGradient"
              />
            ) : data.nomina.porPeriodo.length === 1 ? (
              <p className="text-sm text-[#1A1A1A]">
                {data.nomina.porPeriodo[0].label}: <span className="font-black">{money(data.nomina.porPeriodo[0].total)}</span>
              </p>
            ) : (
              <Empty />
            )}
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Ausentismo por tipo" subtitle="Días aprobados en el rango">
              <Distribution slices={withLabels(data.ausentismo.porTipo, TIME_OFF_LABELS)} unit="dias" />
            </Card>
            <Card title="Asistencia registrada" subtitle="Marcaciones en el rango">
              <Distribution slices={withLabels(data.asistencia, ATTENDANCE_LABELS)} />
            </Card>
            <Card title="Horas extra por tipo" subtitle="Horas aprobadas según recargo Ley CST">
              <Distribution slices={withLabels(data.horasExtra.porTipo, OVERTIME_LABELS)} unit="horas" />
            </Card>
            <Card title="Tickets por categoría" subtitle={`${data.tickets.total} tickets creados en el rango`}>
              <Distribution slices={withLabels(data.tickets.porCategoria, {})} />
            </Card>
            <Card title="Plantilla por departamento" subtitle="Colaboradores activos hoy">
              <Distribution slices={withLabels(data.plantilla.porDepartamento, {})} />
            </Card>
            <Card title="Plantilla por tipo de contrato" subtitle="Colaboradores activos hoy">
              <Distribution slices={withLabels(data.plantilla.porContrato, CONTRACT_LABELS)} />
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Solicitudes de ausencia por estado" subtitle="Incluye pendientes, aprobadas y rechazadas">
              <BreakdownList rows={data.ausentismo.porEstado} dict={STATUS_LABELS} />
            </Card>
            <Card title="Tickets por estado" subtitle="Estado actual de los tickets del rango">
              <BreakdownList rows={data.tickets.porEstado} dict={STATUS_LABELS} />
            </Card>
          </div>

          <p className="text-[11px] text-[#94A3B8]">
            Rango consultado: {toInputDate(data.range.from)} a {toInputDate(data.range.to)}. Todos los valores provienen de los registros reales del sistema.
          </p>
        </>
      )}
    </div>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
      <h3 className="text-sm font-black text-[#1A1A1A]">{title}</h3>
      <p className="mb-4 text-xs text-[#64748B]">{subtitle}</p>
      {children}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-[#94A3B8]">Sin datos en este rango.</p>;
}

function Distribution({ slices, unit }: { slices: { label: string; value: number; color: string }[]; unit?: "dias" | "horas" }) {
  const suffixFor = (value: number) =>
    unit === "dias" ? (value === 1 ? " día" : " días") : unit === "horas" ? " h" : "";
  if (slices.length === 0) return <Empty />;
  return (
    <div className="flex items-center gap-4">
      <DonutChart slices={slices} size={120} thickness={20} />
      <div className="min-w-0 flex-1 space-y-1.5">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-xs">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="min-w-0 flex-1 truncate text-[#64748B]">{s.label}</span>
            <span className="font-bold text-[#1A1A1A]">{s.value}{suffixFor(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BreakdownList({ rows, dict }: { rows: Bucket[]; dict: Record<string, string> }) {
  if (rows.length === 0) return <Empty />;
  const total = rows.reduce((acc, r) => acc + r.total, 0);
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#64748B]">{dict[r.label] ?? r.label}</span>
            <span className="font-bold text-[#1A1A1A]">{r.total}</span>
          </div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-[#F1F5F9]">
            <div className="h-1.5 rounded-full bg-[#27B1B8]" style={{ width: `${total ? (r.total / total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Kpi({ value, label, hint, icon, tone }: { value: string; label: string; hint: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-xl font-black text-[#1A1A1A]">{value}</p>
        <p className="text-xs font-bold text-[#64748B]">{label}</p>
        <p className="truncate text-[11px] text-[#94A3B8]">{hint}</p>
      </div>
    </div>
  );
}
