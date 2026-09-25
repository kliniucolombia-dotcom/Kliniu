"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  MdAdd, MdAccessTime, MdAttachMoney, MdBarChart, MdCampaign, MdChevronLeft, MdChevronRight,
  MdHistory, MdPeopleOutline, MdSettings, MdArrowUpward, MdArrowDownward, MdCheckCircleOutline,
  MdWarningAmber,
} from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { addDays, compliance, weekday, type Cell, type DayStatus, type SellerCalendar } from "@/lib/commercial-calendar";
import { SimpleSelect } from "../_components/simple-select";
import ConfigModal from "./ConfigModal";
import { Skeleton, SkeletonTable } from "../../components/skeleton";

type Kpis = {
  today: { reported: number; expected: number; sales: number };
  yesterday: { reported: number; expected: number; sales: number };
  pending: number; yesterdayPending: number;
  month: { done: number; expected: number; pct: number | null; late: number; newCampaigns: number };
  prevMonth: { done: number; expected: number; pct: number | null; late: number; newCampaigns: number };
};
type CalendarData = {
  months: string[]; month: string; today: string; deadlineMinutes: number; trackingStart: string; role: string; userId: string;
  sellers: SellerCalendar[]; kpis: Kpis;
  alerts: { sellerId: string; name: string; items: string[] }[];
  spendingNoSales: { campaignId: string; name: string; seller: string; usd: number }[];
  trm: Record<string, number>;
};

const COLORS: Record<DayStatus, string> = {
  GREEN: "#16A34A", YELLOW: "#EAB308", RED: "#EF4444", GRAY: "#CBD5E1", PENDING: "#93C5FD", FUTURE: "transparent",
};
const CONFIG_ROLES = ["SUPERADMIN", "ADMIN", "JEFE_VENTAS"];
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
const DOW = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DOW_FULL = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const fmtCOP = (n: number) => `$${Math.round(n || 0).toLocaleString("es-CO")}`;
const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const nowMonth = () => new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 7);
const mondayOf = (key: string) => addDays(key, -((weekday(key) + 6) % 7));
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
const longDate = (key: string) => {
  const d = new Date(`${key}T12:00:00Z`);
  return `${DOW_FULL[d.getUTCDay()]}, ${d.getUTCDate()} de ${MONTHS[d.getUTCMonth()].toLowerCase()} de ${d.getUTCFullYear()}`;
};
const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { timeZone: "America/Bogota", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });

function statusLabel(c: Cell) {
  if (c.status === "GREEN") return c.late ? "Reportado con retraso" : c.noSales ? "Sin ventas confirmado" : "Reportado";
  if (c.status === "YELLOW") return "Parcial";
  if (c.status === "RED") return "Sin reporte";
  if (c.status === "PENDING") return "Pendiente";
  if (c.status === "GRAY") return ({ holiday: "Festivo", nonworking: "No laborable", inactive: "Inactivo", untracked: "Sin seguimiento" })[c.reason ?? "nonworking"];
  return "";
}

function Dot({ status, late, size = 12 }: { status: DayStatus; late?: boolean; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{
        width: size, height: size, background: COLORS[status],
        border: status === "FUTURE" ? "1.5px solid #E2E8F0" : undefined,
        boxShadow: late ? "0 0 0 2px #fff, 0 0 0 3.5px #F59E0B" : undefined,
      }}
    />
  );
}

/** Estado agregado de un día para la fila GENERAL. */
function aggregate(cells: Cell[]): DayStatus {
  const live = cells.filter((c) => c.status !== "GRAY");
  if (live.length === 0) return cells.length ? "GRAY" : "FUTURE";
  if (live.every((c) => c.status === "FUTURE")) return "FUTURE";
  const act = live.filter((c) => c.status !== "FUTURE");
  if (act.every((c) => c.status === "GREEN")) return "GREEN";
  if (act.every((c) => c.status === "RED")) return "RED";
  if (act.some((c) => c.status === "PENDING") && !act.some((c) => c.status === "RED")) return "PENDING";
  return "YELLOW";
}

const pctColor = (p: number | null) => (p === null ? "#CBD5E1" : p >= 90 ? "#16A34A" : p >= 70 ? "#EAB308" : "#EF4444");

function Delta({ cur, prev, unit = "", inverse, label }: { cur: number | null; prev: number | null; unit?: string; inverse?: boolean; label: string }) {
  if (cur === null || prev === null) return <span className="text-[11px] text-[#94A3B8]">{label}: sin datos</span>;
  const diff = cur - prev;
  if (diff === 0) return <span className="text-[11px] text-[#94A3B8]">= {label}</span>;
  const good = inverse ? diff < 0 : diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${good ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
      {diff > 0 ? <MdArrowUpward size={12} /> : <MdArrowDownward size={12} />}
      {Math.abs(diff)}{unit} <span className="font-medium text-[#94A3B8]">vs. {label}</span>
    </span>
  );
}

function KpiCard({ icon, tint, title, children }: { icon: React.ReactNode; tint: string; title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl" style={{ background: tint }}>{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-[#64748B]">{title}</p>
        {children}
      </div>
    </div>
  );
}

export default function CalendarioPage() {
  const [month, setMonth] = useState(nowMonth());
  const [platform, setPlatform] = useState("");
  const [sellerFilter, setSellerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<"month" | "week">("month");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10)));
  const [data, setData] = useState<CalendarData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [indSeller, setIndSeller] = useState("");
  const [selDate, setSelDate] = useState("");
  const [tab, setTab] = useState<"sales" | "new" | "history">("sales");
  const [closing, setClosing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ month });
      if (platform) qs.set("platform", platform);
      const r = await fetch(`/api/panel/calendar?${qs}`);
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo cargar el calendario"); return; }
      setError(null);
      setData(d);
      setPlatforms((prev) => {
        const found = new Set(prev);
        for (const s of d.sellers as SellerCalendar[]) for (const c of Object.values(s.cells)) {
          c.rows.forEach((x) => found.add(x.platform));
          c.newCampaigns.forEach((x) => found.add(x.platform));
        }
        return [...found].sort();
      });
    } catch {
      setError("No se pudo cargar el calendario");
    } finally {
      setLoading(false);
    }
  }, [month, platform]);

  useEffect(() => { setLoading(true); load(); }, [load]);
  useRealtimeRefresh(["campaigns"], load);
  // Refresco cada 5 min: cubre el paso de las 8 pm (PENDING → RED) sin actividad.
  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) load(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load]);

  // Defaults de selección al recibir datos.
  useEffect(() => {
    if (!data) return;
    setIndSeller((cur) => (data.sellers.some((s) => s.id === cur) ? cur : data.sellers[0]?.id ?? ""));
    setSelDate((cur) => cur && cur.startsWith(data.month) ? cur : data.today.startsWith(data.month) ? data.today : `${data.month}-01`);
  }, [data]);

  const days = useMemo(() => {
    if (view === "week") return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const n = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  }, [view, weekStart, month]);

  const visibleSellers = useMemo(() => {
    if (!data) return [];
    return data.sellers.filter((s) => {
      if (sellerFilter && s.id !== sellerFilter) return false;
      if (statusFilter) return days.some((d) => s.cells[d]?.status === statusFilter);
      return true;
    });
  }, [data, sellerFilter, statusFilter, days]);

  const monthOptions = useMemo(() => {
    const set = new Set([...(data?.months ?? []), month]); // el mes seleccionado siempre se muestra
    return [...set].sort().reverse().map((m) => ({ value: m, label: monthLabel(m) }));
  }, [data, month]);

  const shiftWeek = (delta: number) => {
    const ws = addDays(weekStart, delta * 7);
    setWeekStart(ws);
    setMonth(addDays(ws, 6).slice(0, 7)); // el fin de semana fija el mes: el inicio cae en este o el anterior, ambos cargados
  };
  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number);
    setMonth(new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7));
  };

  const pick = (sellerId: string, date: string) => {
    setIndSeller(sellerId);
    setSelDate(date);
    setTab("sales");
    if (window.innerWidth < 1024) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const seller = data?.sellers.find((s) => s.id === indSeller);
  const cell = seller?.cells[selDate];
  const isAdmin = !!data && CONFIG_ROLES.includes(data.role);

  const closeDay = async () => {
    if (!seller || !cell) return;
    setClosing(true);
    try {
      const r = await fetch("/api/panel/calendar/close", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sellerId: seller.id, date: cell.date, noSales: cell.total === 0 }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error ?? "No se pudo cerrar el día"); return; }
      await load();
    } finally {
      setClosing(false);
    }
  };

  // Calendario individual: grilla lun-dom del mes.
  const grid = useMemo(() => {
    const first = `${month}-01`;
    const lead = (weekday(first) + 6) % 7;
    const n = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    return [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  }, [month]);

  const k = data?.kpis;
  const isCurrentMonth = month === nowMonth();
  const trmOf = data?.trm[selDate];
  const invUsd = cell?.rows.reduce((t, r) => t + r.presupuestoUsd, 0) ?? 0;
  const roas = cell && trmOf && invUsd > 0 ? cell.total / (invUsd * trmOf) : null;

  const filterTrigger = "flex w-full items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-left text-sm font-semibold text-[#334155] hover:border-[#27B1B8] transition-colors";

  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel comercial</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A] sm:text-3xl">Calendario de actividad comercial</h1>
          <p className="mt-1 text-sm text-[#64748B]">Control de reportes diarios de ventas y publicación de campañas</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <button onClick={() => setShowConfig(true)} className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-bold text-[#475569] hover:border-[#27B1B8]">
              <MdSettings size={18} /> Configurar
            </button>
          )}
          <Link href="/panel/campanas" className="inline-flex items-center gap-2 rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(39,177,184,0.35)] hover:opacity-90 transition-opacity">
            <MdAdd size={18} /> Nueva campaña
          </Link>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#B91C1C]">{error}</div>}

      {/* KPIs */}
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard icon={<MdPeopleOutline size={22} className="text-[#0C535B]" />} tint="#E0F5F6" title="Vendedores que reportaron hoy">
          <p className="mt-1 text-2xl font-black text-[#1A1A1A]">{k ? `${k.today.reported} de ${k.today.expected}` : <Skeleton className="h-7 w-20" />}</p>
          {k ? <span className="text-[11px] text-[#94A3B8]">{`Ayer: ${k.yesterday.reported} de ${k.yesterday.expected}`}</span> : <Skeleton className="mt-1 h-3 w-24" />}
        </KpiCard>
        <KpiCard icon={<MdAccessTime size={22} className="text-[#DC2626]" />} tint="#FEE2E2" title="Vendedores pendientes">
          <p className="mt-1 text-2xl font-black text-[#1A1A1A]">{k ? k.pending : <Skeleton className="h-7 w-10" />}</p>
          {k ? <Delta cur={k.pending} prev={k.yesterdayPending} inverse label="ayer" /> : <Skeleton className="mt-1 h-3 w-20" />}
        </KpiCard>
        <KpiCard icon={<MdBarChart size={22} className="text-[#16A34A]" />} tint="#DCFCE7" title={`Cumplimiento ${isCurrentMonth ? "del mes" : monthLabel(month)}`}>
          <p className="mt-1 text-2xl font-black text-[#1A1A1A]">{!k ? <Skeleton className="h-7 w-24" /> : k.month.pct != null ? `${k.month.pct}%` : "Sin datos"}</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
            <div className="h-full rounded-full" style={{ width: `${k?.month.pct ?? 0}%`, background: pctColor(k?.month.pct ?? null) }} />
          </div>
          {k ? <span className="text-[11px] text-[#94A3B8]">{`${k.month.done} de ${k.month.expected} reportes`}</span> : <Skeleton className="h-3 w-24" />}
        </KpiCard>
        <KpiCard icon={<MdAttachMoney size={22} className="text-[#16A34A]" />} tint="#DCFCE7" title="Ventas registradas hoy (COP)">
          <p className="mt-1 truncate text-2xl font-black text-[#1A1A1A]">{k ? fmtCOP(k.today.sales) : <Skeleton className="h-7 w-28" />}</p>
          {k ? <span className="text-[11px] text-[#94A3B8]">{`Ayer: ${fmtCOP(k.yesterday.sales)}`}</span> : <Skeleton className="mt-1 h-3 w-24" />}
        </KpiCard>
        <KpiCard icon={<MdCampaign size={22} className="text-[#7C3AED]" />} tint="#EDE9FE" title={`Campañas nuevas ${isCurrentMonth ? "este mes" : "del mes"}`}>
          <p className="mt-1 text-2xl font-black text-[#1A1A1A]">{k ? k.month.newCampaigns : <Skeleton className="h-7 w-10" />}</p>
          {k ? <Delta cur={k.month.newCampaigns} prev={k.prevMonth.newCampaigns} label="mes anterior" /> : <Skeleton className="mt-1 h-3 w-24" />}
        </KpiCard>
        <KpiCard icon={<MdHistory size={22} className="text-[#B45309]" />} tint="#FEF3C7" title="Reportes con retraso">
          <p className="mt-1 text-2xl font-black text-[#1A1A1A]">{k ? k.month.late : <Skeleton className="h-7 w-10" />}</p>
          {k ? <Delta cur={k.month.late} prev={k.prevMonth.late} inverse label="mes anterior" /> : <Skeleton className="mt-1 h-3 w-24" />}
        </KpiCard>
      </div>

      {/* Filtros */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3">
        <div className="w-full sm:w-[190px]">
          <SimpleSelect value={month} options={monthOptions} onChange={(m) => { setMonth(m); setWeekStart(mondayOf(`${m}-01`)); }} triggerClassName={filterTrigger} portal />
        </div>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-[#64748B] sm:flex-none">
          Vendedor
          <div className="min-w-[140px] flex-1">
            <SimpleSelect value={sellerFilter} onChange={setSellerFilter} triggerClassName={filterTrigger} portal
              options={[{ value: "", label: "Todos" }, ...(data?.sellers ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
          </div>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-[#64748B] sm:flex-none">
          Plataforma
          <div className="min-w-[130px] flex-1">
            <SimpleSelect value={platform} onChange={setPlatform} triggerClassName={filterTrigger} portal
              options={[{ value: "", label: "Todas" }, ...platforms.map((p) => ({ value: p, label: p }))]} />
          </div>
        </label>
        <label className="flex min-w-0 flex-1 items-center gap-2 text-xs font-semibold text-[#64748B] sm:flex-none">
          Estado
          <div className="min-w-[130px] flex-1">
            <SimpleSelect value={statusFilter} onChange={setStatusFilter} triggerClassName={filterTrigger} portal
              options={[
                { value: "", label: "Todos" }, { value: "GREEN", label: "Reportado" }, { value: "YELLOW", label: "Parcial" },
                { value: "RED", label: "Sin reporte" }, { value: "PENDING", label: "Pendiente" },
              ]} />
          </div>
        </label>
        <div className="ml-auto inline-flex rounded-xl border border-[#E2E8F0] p-0.5">
          {(["month", "week"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${view === v ? "bg-[#27B1B8] text-white" : "text-[#64748B]"}`}>
              {v === "month" ? "Vista mensual" : "Vista semanal"}
            </button>
          ))}
        </div>
      </div>

      {/* Calendario general */}
      <section className="mb-5 min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-[#1A1A1A]">Calendario general de vendedores</h2>
            <p className="text-sm text-[#64748B]">Estado del reporte diario de ventas y campañas</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64748B]">
            {([["GREEN", "Reportado"], ["YELLOW", "Parcial"], ["RED", "Sin reporte"], ["GRAY", "No laborable"], ["PENDING", "Pendiente"]] as [DayStatus, string][]).map(([s, l]) => (
              <span key={s} className="inline-flex items-center gap-1.5"><Dot status={s} size={9} />{l}</span>
            ))}
            <span className="inline-flex items-center gap-1.5"><Dot status="GREEN" late size={9} />Con retraso</span>
            <span className="inline-flex items-center gap-1.5"><MdCampaign size={14} className="text-[#2563EB]" />Campaña nueva</span>
          </div>
        </div>

        {view === "week" && (
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[#334155]">
            <button aria-label="Semana anterior" onClick={() => shiftWeek(-1)} className="rounded-lg border border-[#E2E8F0] p-1 hover:border-[#27B1B8]"><MdChevronLeft size={18} /></button>
            <span>{weekStart.slice(8)}/{weekStart.slice(5, 7)} – {addDays(weekStart, 6).slice(8)}/{addDays(weekStart, 6).slice(5, 7)}</span>
            <button aria-label="Semana siguiente" onClick={() => shiftWeek(1)} className="rounded-lg border border-[#E2E8F0] p-1 hover:border-[#27B1B8]"><MdChevronRight size={18} /></button>
          </div>
        )}

        {loading && !data ? (
          <SkeletonTable rows={4} cols={8} />
        ) : visibleSellers.length === 0 ? (
          <p className="py-10 text-center text-sm text-[#94A3B8]">Sin vendedores para mostrar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-xs">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 min-w-[130px] bg-[#F8FAFC] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Vendedor</th>
                  {days.map((d) => (
                    <th key={d} className={`bg-[#F8FAFC] px-1 py-2 text-center text-[10px] font-semibold ${d === data?.today ? "text-[#27B1B8]" : "text-[#94A3B8]"}`}>
                      <div>{DOW[weekday(d)]}</div><div className="text-[11px] font-black">{Number(d.slice(8))}</div>
                    </th>
                  ))}
                  <th className="min-w-[120px] bg-[#F8FAFC] px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Cumplimiento</th>
                </tr>
              </thead>
              <tbody>
                {visibleSellers.map((s) => {
                  const comp = compliance(days.map((d) => s.cells[d]).filter(Boolean), (d) => s.workDays.includes(weekday(d)));
                  return (
                    <tr key={s.id} className="group">
                      <td className="sticky left-0 z-10 border-t border-[#F1F5F9] bg-white px-3 py-2">
                        <button onClick={() => pick(s.id, selDate || days[0])} className="flex items-center gap-2 text-left font-semibold text-[#1A1A1A] hover:text-[#27B1B8]">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#E0F5F6] text-[10px] font-black text-[#0C535B]">{initials(s.name)}</span>
                          <span className="truncate">{s.name}</span>
                        </button>
                      </td>
                      {days.map((d) => {
                        const c = s.cells[d];
                        return (
                          <td key={d} className={`border-t border-[#F1F5F9] px-1 py-2 text-center ${d === selDate && s.id === indSeller ? "bg-[#F0F9F8]" : ""}`}>
                            {c ? (
                              <button onClick={() => pick(s.id, d)} aria-label={`${s.name} ${d}: ${statusLabel(c)}`} className="relative inline-flex items-center justify-center p-1">
                                <Dot status={c.status} late={c.late} />
                                {c.newCampaigns.length > 0 && <MdCampaign size={12} className="absolute -right-1.5 -top-0.5 text-[#2563EB]" />}
                              </button>
                            ) : <span className="text-[#E2E8F0]">·</span>}
                          </td>
                        );
                      })}
                      <td className="border-t border-[#F1F5F9] px-3 py-2">
                        {comp.pct === null ? <span className="text-[#94A3B8]">Sin datos</span> : (
                          <div className="flex items-center gap-2">
                            <span className="w-9 font-bold text-[#334155]">{comp.pct}%</span>
                            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[#F1F5F9]"><span className="block h-full rounded-full" style={{ width: `${comp.pct}%`, background: pctColor(comp.pct) }} /></span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="sticky left-0 z-10 border-t-2 border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-black text-[#1A1A1A]">General</td>
                  {days.map((d) => {
                    const st = aggregate(visibleSellers.map((s) => s.cells[d]).filter(Boolean));
                    return <td key={d} className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] px-1 py-2 text-center"><Dot status={st} /></td>;
                  })}
                  <td className="border-t-2 border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 font-black text-[#334155]">
                    {(() => {
                      const all = visibleSellers.flatMap((s) => days.map((d) => s.cells[d]).filter(Boolean).filter((c) => s.workDays.includes(weekday(c.date))));
                      const p = compliance(all, () => true).pct;
                      return p === null ? "Sin datos" : `${p}%`;
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Revisión */}
      {data && (
        <section className="mb-5 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          {(() => {
            const flagged = data.alerts.filter((a) => a.items.length > 0);
            const ok = data.alerts.filter((a) => a.items.length === 0);
            return (
              <>
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-black text-[#1A1A1A]">Vendedores que requieren revisión</h2>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${flagged.length ? "bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]" : "bg-[#DCFCE7] text-[#15803D]"}`}>
                    {flagged.length ? <MdWarningAmber size={14} /> : <MdCheckCircleOutline size={14} />}
                    {flagged.length ? `${flagged.length} de ${data.alerts.length} con pendientes` : "Todos al día"}
                  </span>
                </div>
                <p className="mb-4 max-w-3xl text-sm text-[#64748B]">
                  Quién no ha cargado sus ventas en los últimos 14 días. No cuentan días no laborables, festivos ni días anteriores al inicio del seguimiento. Haz clic en un vendedor para ver su calendario.
                </p>

                {flagged.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {flagged.map((a) => (
                      <button key={a.sellerId} onClick={() => pick(a.sellerId, data.today)} className="min-w-0 rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-3.5 text-left transition-colors hover:border-[#27B1B8]">
                        <p className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-[10px] font-black text-[#B45309]">{initials(a.name)}</span>
                          {a.name}
                        </p>
                        <ul className="mt-2 space-y-1">
                          {a.items.map((t) => (
                            <li key={t} className="flex items-start gap-1.5 text-xs text-[#78350F]"><MdWarningAmber size={13} className="mt-px shrink-0" />{t}</li>
                          ))}
                        </ul>
                      </button>
                    ))}
                  </div>
                )}

                {ok.length > 0 && (
                  <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3 ${flagged.length ? "mt-3" : ""}`}>
                    <span className="inline-flex items-center gap-1.5 text-sm font-bold text-[#15803D]"><MdCheckCircleOutline size={16} />Al día</span>
                    <div className="flex flex-wrap gap-1.5">
                      {ok.map((a) => (
                        <button key={a.sellerId} onClick={() => pick(a.sellerId, data.today)} className="rounded-full border border-[#BBF7D0] bg-white px-2.5 py-1 text-xs font-semibold text-[#166534] hover:border-[#27B1B8]">{a.name}</button>
                      ))}
                    </div>
                    <span className="text-xs text-[#64748B]">Sin reportes atrasados ni fuera de plazo.</span>
                  </div>
                )}
              </>
            );
          })()}
          {data.spendingNoSales.length > 0 && (() => {
            const list = [...data.spendingNoSales].sort((x, y) => y.usd - x.usd);
            const total = list.reduce((t, c) => t + c.usd, 0);
            const max = list[0]?.usd || 1;
            return (
              <div className="mt-5 border-t border-[#E2E8F0] pt-5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-base font-black text-[#1A1A1A]">
                    <MdWarningAmber size={18} className="text-[#B45309]" /> Campañas activas con inversión y sin ventas
                  </h3>
                  <span className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1 text-xs font-bold tabular-nums text-[#B45309]">
                    {list.length} {list.length === 1 ? "campaña" : "campañas"} · US${total.toFixed(2)} · últimos 3 días
                  </span>
                </div>
                <p className="mb-3 text-xs text-[#64748B]">Si el vendedor aún no cargó las ventas de hoy, puede ser una falsa alarma.</p>
                <div className="overflow-x-auto">
                  <div className="min-w-[520px]">
                    <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(90px,1fr)_64px] gap-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                      <span>Campaña</span><span>Vendedor</span><span>Peso en la inversión</span><span className="text-right">USD</span>
                    </div>
                    {list.map((c) => (
                      <div key={c.campaignId} className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(90px,1fr)_64px] items-center gap-3 border-t border-[#F1F5F9] py-2.5 text-sm">
                        <span className="truncate font-bold text-[#1A1A1A]">{c.name.trim()}</span>
                        <span className="truncate text-[#64748B]">{c.seller}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-[#F1F5F9]">
                          <span className="block h-full rounded-full bg-[#F97316]" style={{ width: `${Math.max(4, (c.usd / max) * 100)}%` }} />
                        </span>
                        <span className="text-right font-black tabular-nums text-[#C2410C]">{c.usd.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}
        </section>
      )}

      {/* Individual + detalle */}
      <div ref={detailRef} className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#1A1A1A]">Calendario individual</h2>
              <p className="text-sm text-[#64748B]">Detalle de actividad de un vendedor</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-[170px]">
                <SimpleSelect value={indSeller} onChange={setIndSeller} triggerClassName={filterTrigger} portal
                  options={(data?.sellers ?? []).map((s) => ({ value: s.id, label: s.name }))} />
              </div>
              <button aria-label="Mes anterior" onClick={() => shiftMonth(-1)} className="rounded-lg border border-[#E2E8F0] p-1.5 hover:border-[#27B1B8]"><MdChevronLeft size={18} /></button>
              <span className="min-w-[110px] text-center text-sm font-bold text-[#334155]">{monthLabel(month)}</span>
              <button aria-label="Mes siguiente" onClick={() => shiftMonth(1)} className="rounded-lg border border-[#E2E8F0] p-1.5 hover:border-[#27B1B8]"><MdChevronRight size={18} /></button>
            </div>
          </div>
          {loading && !data ? <div className="grid min-w-[560px] grid-cols-7 gap-1.5">{Array.from({ length: 35 }, (_, i) => <Skeleton key={i} className="h-14" />)}</div> : !seller ? <p className="py-10 text-center text-sm text-[#94A3B8]">Sin datos.</p> : (
            <div className="overflow-x-auto">
              <div className="grid min-w-[560px] grid-cols-7 gap-1.5">
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <div key={d} className="py-1 text-center text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{d}</div>
                ))}
                {grid.map((d, i) => {
                  if (!d) return <div key={`b${i}`} />;
                  const c = seller.cells[d];
                  const active = d === selDate;
                  return (
                    <button key={d} onClick={() => { setSelDate(d); setTab("sales"); }}
                      className={`min-h-[88px] rounded-xl border p-2 text-left transition-colors ${active ? "border-[#27B1B8] bg-[#F0F9F8] ring-2 ring-[#27B1B8]/20" : "border-[#EEF2F6] hover:border-[#27B1B8]"} ${c?.status === "GRAY" ? "bg-[#F8FAFC]" : ""}`}>
                      <div className="flex items-center justify-between text-[11px] font-bold text-[#475569]">
                        <span>{Number(d.slice(8))}</span>
                        {c && c.newCampaigns.length > 0 && <MdCampaign size={14} className="text-[#2563EB]" />}
                      </div>
                      {c && c.status !== "FUTURE" && (
                        <div className="mt-1 space-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: c.status === "RED" ? "#DC2626" : c.status === "GRAY" ? "#94A3B8" : "#475569" }}>
                            <Dot status={c.status} late={c.late} size={9} />
                            <span className="truncate">{c.status === "GREEN" ? "" : statusLabel(c)}</span>
                          </div>
                          {(c.status === "GREEN" || c.total > 0) && <p className="truncate text-[11px] font-bold text-[#16A34A]">{fmtCOP(c.total)}</p>}
                          {c.campaignsWithSales > 0 && <p className="text-[10px] text-[#94A3B8]">{c.campaignsWithSales} {c.campaignsWithSales === 1 ? "campaña" : "campañas"}</p>}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <aside className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
          {loading && !data ? <div className="space-y-3"><Skeleton className="h-4 w-32" /><Skeleton className="h-6 w-56" /><Skeleton className="h-16" /><Skeleton className="h-32" /></div> : !cell || !seller ? <p className="py-10 text-center text-sm text-[#94A3B8]">Selecciona un día.</p> : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">{seller.name}</p>
              <h2 className="text-lg font-black text-[#1A1A1A]">{longDate(cell.date)}</h2>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Dot status={cell.status} late={cell.late} size={16} />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#1A1A1A]">{statusLabel(cell.status === "FUTURE" ? { ...cell, status: "PENDING" } : cell)}</p>
                    <p className="truncate text-[11px] text-[#94A3B8]">{cell.lastUpdate ? `Última actualización: ${fmtStamp(cell.lastUpdate)}` : "Sin actualizaciones"}</p>
                  </div>
                </div>
                <Link href="/panel/campanas" className="shrink-0 rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white">Editar</Link>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { l: "Ventas del día (COP)", v: fmtCOP(cell.total) },
                  { l: "Campañas con ventas", v: String(cell.campaignsWithSales) },
                  { l: "Campañas nuevas", v: String(cell.newCampaigns.length) },
                ].map((x) => (
                  <div key={x.l} className="min-w-0 rounded-xl border border-[#E2E8F0] p-2.5">
                    <p className="text-[10px] font-semibold leading-tight text-[#64748B]">{x.l}</p>
                    <p className="mt-1 truncate text-base font-black text-[#1A1A1A]">{x.v}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-4 border-b border-[#E2E8F0] text-sm font-semibold">
                {([["sales", "Ventas por campaña"], ["new", `Campaña nueva (${cell.newCampaigns.length})`], ["history", "Historial"]] as const).map(([id, l]) => (
                  <button key={id} onClick={() => setTab(id)} className={`-mb-px border-b-2 pb-2 ${tab === id ? "border-[#27B1B8] text-[#0C535B]" : "border-transparent text-[#94A3B8]"}`}>{l}</button>
                ))}
              </div>

              {tab === "sales" && (
                <div className="mt-3">
                  {cell.rows.length === 0 ? <p className="py-4 text-center text-sm text-[#94A3B8]">Sin registros en la matriz para este día.</p> : (
                    <>
                      <table className="w-full text-xs">
                        <thead><tr className="text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                          <th className="py-1.5">Campaña</th><th className="py-1.5">Plataforma</th><th className="py-1.5 text-right">Venta</th>
                        </tr></thead>
                        <tbody>
                          {cell.rows.map((r) => (
                            <tr key={r.campaignId} className="border-t border-[#F1F5F9]">
                              <td className="py-2 pr-2 font-semibold text-[#334155]">{r.name}</td>
                              <td className="py-2 pr-2 text-[#64748B]">{r.platform}</td>
                              <td className="py-2 text-right font-semibold text-[#1A1A1A]">{fmtCOP(r.venta)}</td>
                            </tr>
                          ))}
                          <tr className="border-t border-[#E2E8F0] bg-[#F0F9F8]">
                            <td className="px-1 py-2 font-black text-[#0C535B]" colSpan={2}>Total del día</td>
                            <td className="py-2 text-right font-black text-[#0C535B]">{fmtCOP(cell.total)}</td>
                          </tr>
                        </tbody>
                      </table>
                      <p className="mt-2 text-[11px] text-[#64748B]">
                        Mensajes {cell.rows.reduce((t, r) => t + r.mensajes, 0)} · Transacciones {cell.rows.reduce((t, r) => t + r.transacciones, 0)}
                        {roas !== null && <> · ROAS {roas.toFixed(2)}x</>}
                      </p>
                    </>
                  )}
                </div>
              )}

              {tab === "new" && (
                <div className="mt-3 space-y-2">
                  {cell.newCampaigns.length === 0 && <p className="py-4 text-center text-sm text-[#94A3B8]">No se publicaron campañas nuevas este día.</p>}
                  {cell.newCampaigns.map((c) => (
                    <div key={c.id} className="rounded-xl border border-[#E2E8F0] p-3 text-xs">
                      <p className="text-sm font-bold text-[#1A1A1A]">{c.name}</p>
                      <p className="mt-1 text-[#64748B]">Vendedor: {seller.name} · {c.platform} · {c.status === "ACTIVE" ? "Activa" : "Pausada"}</p>
                      <p className="text-[#64748B]">Publicada: {fmtStamp(c.createdAt)}{c.initialUsd ? ` · Inversión inicial US$${c.initialUsd.toFixed(2)}` : ""}</p>
                    </div>
                  ))}
                </div>
              )}

              {tab === "history" && (
                <ul className="mt-3 space-y-2">
                  {cell.events.length === 0 && <li className="py-4 text-center text-sm text-[#94A3B8]">Sin historial para este día.</li>}
                  {cell.events.map((e, i) => (
                    <li key={i} className="rounded-xl bg-[#F8FAFC] p-2.5 text-xs text-[#475569]">
                      <b>{e.kind === "CLOSE" ? "Cierre del día" : "Venta registrada"}</b> · {fmtCOP(e.value)}
                      <div className="text-[#94A3B8]">{fmtStamp(e.at)} · {e.actor}</div>
                    </li>
                  ))}
                </ul>
              )}

              {!cell.closed && cell.date <= (data?.today ?? "") && cell.status !== "GRAY" && (
                <button onClick={closeDay} disabled={closing}
                  className="mt-4 w-full rounded-xl border-2 border-[#27B1B8] px-4 py-2.5 text-sm font-bold text-[#0C535B] transition-colors hover:bg-[#F0F9F8] disabled:opacity-50">
                  {closing ? "Guardando…" : cell.total === 0 ? "Confirmar día sin ventas" : "Finalizar reporte del día"}
                </button>
              )}
            </>
          )}
        </aside>
      </div>

      {showConfig && <ConfigModal onClose={() => setShowConfig(false)} onSaved={load} />}
    </div>
  );
}
