"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MdLocalShipping, MdBuild, MdPrecisionManufacturing, MdWarehouse,
  MdArrowForward, MdTimerOff, MdSwapHoriz, MdAttachMoney, MdReportProblem, MdCheckCircle,
} from "react-icons/md";
import { COP, fmtDate, todayBogota, Kpi, Section, Empty, Stat, Table, DateRange } from "../_components/ops-ui";

type Visible = { logistica: boolean; mantenimiento: boolean; produccion: boolean; bodegas: boolean };
type LogisticsKpis = { routesTotal: number; routesDone: number; ordersTotal: number; ordersDelivered: number; costTotal: number; openIncidents: number };
type MaintenanceKpis = { openOrders: number; preventive: number; corrective: number; completed: number; downtimeMinutes: number; equipmentDown: number; lowStockItems: number };
type ProductionKpis = { changesCompleted: number; avgChangeMinutes: number; openChanges: number; moldsInUse: number; moldsTotal: number; ordersByStatus: { status: string; count: number }[] };
type WarehouseKpi = { id: string; name: string; units: number; lowStock: number };
type Report = {
  id: string; module: string; periodStart: string; periodEnd: string;
  kpis: Record<string, number | string>; notes: string | null; createdAt: string;
  author: { fullName: string; role: string };
};
type Coverage = {
  id: string; fullName: string; role: string; department: string | null;
  backupUser: { fullName: string; role: string } | null;
};
type Data = {
  coverage: Coverage[];
  visible: Visible;
  logistica: LogisticsKpis | null;
  mantenimiento: MaintenanceKpis | null;
  produccion: ProductionKpis | null;
  bodegas: WarehouseKpi[] | null;
  reports: Report[];
};

const MODULE_META: Record<string, { label: string; href: string; icon: React.ReactNode; color: string }> = {
  MODULE_LOGISTICA: { label: "Logística", href: "/panel/logistica", icon: <MdLocalShipping size={16} />, color: "#0369A1" },
  MODULE_MANTENIMIENTO: { label: "Mantenimiento", href: "/panel/mantenimiento", icon: <MdBuild size={16} />, color: "#C2410C" },
  MODULE_PRODUCCION: { label: "Inyección", href: "/panel/produccion", icon: <MdPrecisionManufacturing size={16} />, color: "#1D4ED8" },
  MODULE_BODEGAS: { label: "Bodegas", href: "/panel/bodegas", icon: <MdWarehouse size={16} />, color: "#15803D" },
};

const KPI_LABELS: Record<string, string> = {
  rutasTotal: "Rutas", rutasFinalizadas: "Rutas finalizadas", pedidosEnRuta: "Pedidos en ruta",
  pedidosEntregados: "Entregados", costoTotal: "Costo transporte", novedadesAbiertas: "Novedades abiertas",
  ordenesAbiertas: "Órdenes abiertas", preventivas: "Preventivas", correctivas: "Correctivas",
  completadas: "Completadas", tiempoMuertoMin: "Tiempo muerto (min)", equiposFueraServicio: "Equipos fuera de servicio",
  itemsBajoMinimo: "Ítems bajo mínimo",
};

const ROLE_LABELS: Record<string, string> = {
  DIRECTOR_OPERACIONES: "Director de Operaciones",
  JEFE_OPERACIONES: "Jefe de Operaciones",
  LOGISTICA: "Analista de Logística",
  LIDER_ENSAMBLE: "Líder Planta Ensamble",
  LIDER_INYECCION: "Líder Planta Inyección",
  MANTENIMIENTO: "Mantenimiento",
  BODEGA: "Bodega",
  EMPLOYEE: "Empleado",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Borrador", APPROVED: "Aprobada", IN_PRODUCTION: "En producción", COMPLETED: "Completada", CANCELLED: "Cancelada",
};

function fmtMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export default function OperacionesDashboard() {
  const router = useRouter();
  const [from, setFrom] = useState(todayBogota(-14));
  const [to, setTo] = useState(todayBogota());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/panel/operaciones?from=${from}&to=${to}`);
    if (r.status === 401) { router.push("/login"); return; }
    if (!r.ok) { setError((await r.json()).error ?? "Error al cargar"); setLoading(false); return; }
    setData(await r.json());
    setError("");
    setLoading(false);
  }, [from, to, router]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Tablero del área</h1>
          <p className="mt-1 text-sm text-[#64748B]">Logística, ensamble, inyección, despachos y mantenimiento en una sola vista.</p>
        </div>
        <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {error && <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>}

      {loading || !data ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : (
        <div className="space-y-8">
          {data.logistica && (
            <ModuleBlock module="MODULE_LOGISTICA">
              <Kpi icon={<MdLocalShipping size={18} />} label="Rutas finalizadas" value={`${data.logistica.routesDone} / ${data.logistica.routesTotal}`} color="#0369A1" />
              <Kpi icon={<MdCheckCircle size={18} />} label="Pedidos entregados" value={`${data.logistica.ordersDelivered} / ${data.logistica.ordersTotal}`} color="#7C6CE0" />
              <Kpi icon={<MdAttachMoney size={18} />} label="Costo transporte" value={COP.format(data.logistica.costTotal)} color="#F0A73C" />
              <Kpi icon={<MdReportProblem size={18} />} label="Novedades abiertas" value={String(data.logistica.openIncidents)} color="#DC2626" />
            </ModuleBlock>
          )}

          {data.produccion && (
            <ModuleBlock module="MODULE_PRODUCCION" extra={
              data.produccion.ordersByStatus.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.produccion.ordersByStatus.map((o) => (
                    <span key={o.status} className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-bold text-[#64748B]">
                      {ORDER_STATUS_LABEL[o.status] ?? o.status}: {o.count}
                    </span>
                  ))}
                </div>
              )
            }>
              <Kpi icon={<MdSwapHoriz size={18} />} label="Cambios de molde" value={String(data.produccion.changesCompleted)} color="#1D4ED8" />
              <Kpi icon={<MdTimerOff size={18} />} label="Promedio por cambio" value={fmtMinutes(data.produccion.avgChangeMinutes)} color="#F0A73C" />
              <Kpi icon={<MdPrecisionManufacturing size={18} />} label="Moldes montados" value={`${data.produccion.moldsInUse} / ${data.produccion.moldsTotal}`} color="#7C6CE0" />
              <Kpi icon={<MdReportProblem size={18} />} label="Montajes sin cerrar" value={String(data.produccion.openChanges)} color="#DC2626" />
            </ModuleBlock>
          )}

          {data.mantenimiento && (
            <ModuleBlock module="MODULE_MANTENIMIENTO">
              <Kpi icon={<MdBuild size={18} />} label="Órdenes abiertas" value={String(data.mantenimiento.openOrders)} color="#C2410C" />
              <Kpi icon={<MdCheckCircle size={18} />} label="Completadas" value={String(data.mantenimiento.completed)} color="#15803D" />
              <Kpi icon={<MdTimerOff size={18} />} label="Tiempo muerto" value={fmtMinutes(data.mantenimiento.downtimeMinutes)} color="#F0A73C" />
              <Kpi icon={<MdReportProblem size={18} />} label="Equipos no operativos" value={String(data.mantenimiento.equipmentDown)} color="#DC2626" />
            </ModuleBlock>
          )}

          {data.bodegas && data.bodegas.length > 0 && (
            <ModuleBlock module="MODULE_BODEGAS">
              {data.bodegas.map((w) => (
                <Kpi key={w.id} icon={<MdWarehouse size={18} />} label={w.name} value={`${w.units.toLocaleString("es-CO")} und`} color="#15803D" />
              ))}
            </ModuleBlock>
          )}

          <Section title="Cobertura del área (titular y respaldo)">
            {data.coverage.length === 0 ? <Empty text="Sin personal de operaciones registrado." /> : (
              <Table
                head={["Persona", "Cargo", "Área", "Respaldo"]}
                rows={data.coverage.map((p) => [
                  <b key="n">{p.fullName}</b>,
                  ROLE_LABELS[p.role] ?? p.role,
                  p.department ?? "—",
                  p.backupUser
                    ? <span key="b">{p.backupUser.fullName} <span className="text-xs text-[#94A3B8]">({ROLE_LABELS[p.backupUser.role] ?? p.backupUser.role})</span></span>
                    : <span key="b" className="text-xs font-semibold text-[#DC2626]">Sin respaldo asignado</span>,
                ])}
                empty="Sin personal de operaciones registrado."
              />
            )}
          </Section>

          <Section title="Últimos informes recibidos">
            {data.reports.length === 0 ? <Empty text="Los líderes aún no han presentado informes." /> : (
              <div className="space-y-3">
                {data.reports.map((rep) => {
                  const meta = MODULE_META[rep.module];
                  return (
                    <div key={rep.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          {meta && <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold text-white" style={{ background: meta.color }}>{meta.icon}{meta.label}</span>}
                          <p className="font-black text-[#1A1A1A]">{fmtDate(rep.periodStart)} — {fmtDate(rep.periodEnd)}</p>
                        </div>
                        <p className="text-xs text-[#94A3B8]">{rep.author.fullName} · {fmtDate(rep.createdAt)}</p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {Object.keys(KPI_LABELS).filter((k) => k in rep.kpis).map((k) => (
                          <Stat key={k} label={KPI_LABELS[k]} value={k === "costoTotal" && typeof rep.kpis[k] === "number" ? COP.format(rep.kpis[k] as number) : String(rep.kpis[k])} />
                        ))}
                      </div>
                      {rep.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-[#1A1A1A]">{rep.notes}</p>}
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

function ModuleBlock({ module, children, extra }: { module: string; children: React.ReactNode; extra?: React.ReactNode }) {
  const meta = MODULE_META[module];
  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-black text-[#1A1A1A] sm:text-lg">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white" style={{ background: meta.color }}>{meta.icon}</span>
          {meta.label}
        </h2>
        <Link href={meta.href} className="inline-flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
          Ver módulo <MdArrowForward size={14} />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
      {extra}
    </div>
  );
}
