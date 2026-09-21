"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  MdCalendarToday, MdPersonOutline, MdCheckCircleOutline, MdPublic,
  MdSearch, MdAdd, MdTrendingUp, MdPeople, MdPayments, MdAttachMoney,
  MdMoreVert, MdFileDownload, MdViewColumn, MdClose, MdInfoOutline,
  MdChevronLeft, MdChevronRight, MdFilterList,
} from "react-icons/md";
import { calcROAS, calcKpiMensajes } from "@/lib/panel-utils";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { SimpleSelect } from "../_components/simple-select";
import { Sparkline } from "../_components/mini-charts";
import DailyMatrix, { kpiMensajesColor } from "./DailyMatrix";

type Campaign = {
  id: string; name: string; platform: string; investment: number; sales: number;
  leads: number; targetMultiple: number; status: string; startDate: string;
  endDate?: string; notes?: string;
  trm: number; // COP por USD de la fecha de inicio
  daily: { sales: number; investmentUsd: number; mensajes: number; transacciones: number; days: number };
  seller: { id: string; fullName: string; email: string };
  combo?: { id: string; name: string; image: string | null };
};

// Un endpoint caído no debe congelar la página entera: devuelve [] en vez de reventar.
async function fetchList(url: string): Promise<unknown[]> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

const DATE_FILTERS = [
  { value: "all", label: "Todo" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Últimos 7 días" },
  { value: "days15", label: "Últimos 15 días" },
  { value: "month", label: "Últimos 30 días" },
  { value: "quarter", label: "Últimos 90 días" },
  { value: "thisMonth", label: "Este mes" },
  { value: "lastMonth", label: "Mes pasado" },
  { value: "thisYear", label: "Este año" },
  { value: "custom", label: "Rango personalizado" },
];

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return startOfDay(d); };

/** Devuelve [desde, hasta] según el filtro; null significa sin límite por ese lado. */
function dateFilterRange(filter: string, customFrom: string, customTo: string): [Date | null, Date | null] {
  const now = new Date();
  switch (filter) {
    case "today": return [startOfDay(now), endOfDay(now)];
    case "week": return [daysAgo(7), null];
    case "days15": return [daysAgo(15), null];
    case "month": return [daysAgo(30), null];
    case "quarter": return [daysAgo(90), null];
    case "thisMonth": return [new Date(now.getFullYear(), now.getMonth(), 1), null];
    case "lastMonth": return [
      new Date(now.getFullYear(), now.getMonth() - 1, 1),
      endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    ];
    case "thisYear": return [new Date(now.getFullYear(), 0, 1), null];
    case "custom": return [
      customFrom ? startOfDay(new Date(`${customFrom}T00:00:00`)) : null,
      customTo ? endOfDay(new Date(`${customTo}T00:00:00`)) : null,
    ];
    default: return [null, null];
  }
}

/** Periodo inmediatamente anterior de igual duración, para comparar KPIs. */
function previousRange(filter: string, customFrom: string, customTo: string): [Date | null, Date | null] {
  const [from, to] = dateFilterRange(filter, customFrom, customTo);
  if (!from) return [null, null];
  const end = to ?? new Date();
  const span = Math.max(1, end.getTime() - from.getTime());
  return [new Date(from.getTime() - span), new Date(from.getTime())];
}

const inRange = (iso: string, from: Date | null, to: Date | null) => {
  if (!from && !to) return true;
  const d = new Date(iso);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
};

const fmtUSD = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
const fmtCOP = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;
const fmtDelta = (cur: number, prev: number) => {
  if (!prev || prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
};

// ─── Estado visual de campaña (mapea ROAS vs meta + status de pausa) ───
type DisplayStatus = "meta" | "rentable" | "revision" | "riesgo" | "pausada";

function displayStatusOf(c: Campaign, roas: number): DisplayStatus {
  if (c.status && c.status !== "ACTIVE") return "pausada";
  const target = c.targetMultiple || 10;
  if (roas <= 0) return "revision";
  if (roas >= target) return "meta";
  if (roas >= target * 0.7) return "rentable";
  if (roas >= target * 0.4) return "revision";
  return "riesgo";
}

const DISPLAY_STATUS: Record<DisplayStatus, { label: string; color: string; bg: string }> = {
  meta:     { label: "Meta cumplida", color: "#0F9D6A", bg: "#DCFCE7" },
  rentable: { label: "Aceptable",     color: "#0F9D6A", bg: "#DCFCE7" },
  revision: { label: "En revisión",   color: "#B45309", bg: "#FEF3C7" },
  riesgo:   { label: "En riesgo",     color: "#DC2626", bg: "#FEE2E2" },
  pausada:  { label: "Pausada",       color: "#64748B", bg: "#F1F5F9" },
};

const salesOf = (c: Campaign) => (c.daily.days > 0 ? c.daily.sales : c.sales);
// Cuando hay matriz diaria, la inversión real sale de ahí (USD); si no, la manual del formulario.
const investmentUsdOf = (c: Campaign) => (c.daily.days > 0 ? c.daily.investmentUsd : c.investment);
const investmentCopOf = (c: Campaign) => investmentUsdOf(c) * (c.trm || 0);
const roasOf = (c: Campaign) => calcROAS(salesOf(c), investmentCopOf(c));

type ColKey = "investment" | "sales" | "roas" | "leads" | "cpl" | "kpiMensajes" | "status";

const COLUMNS: { key: ColKey; label: string }[] = [
  { key: "investment", label: "Inversión (USD)" },
  { key: "sales", label: "Vendido (COP)" },
  { key: "roas", label: "ROAS" },
  { key: "leads", label: "Leads" },
  { key: "cpl", label: "CPL" },
  { key: "kpiMensajes", label: "KPI Mensajes" },
  { key: "status", label: "Estado" },
];

const kpiMensajesOf = (c: Campaign) => calcKpiMensajes(c.daily.transacciones, c.daily.mensajes);

// Popover genérico con cierre al hacer clic fuera.
function Popover({
  button, buttonClassName, align = "right", children,
}: {
  button: React.ReactNode;
  buttonClassName?: string;
  align?: "left" | "right";
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={buttonClassName}>
        {button}
      </button>
      {open && (
        <div className={`absolute top-full z-40 mt-1 min-w-[180px] rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg ${align === "right" ? "right-0" : "left-0"}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

const TH = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => (
  <th className={`px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] ${className}`}>
    {children}
  </th>
);

export default function CampanasPanel() {
  const [campaigns, setCampaigns]   = useState<Campaign[]>([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [editing, setEditing]       = useState<Campaign | null>(null);
  const [sellers, setSellers]       = useState<{ id: string; fullName: string }[]>([]);
  const [combos, setCombos]         = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving]         = useState(false);
  const [alert, setAlert]           = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [dailyCampaign, setDailyCampaign] = useState<Campaign | null>(null);
  const [trm, setTrm] = useState(4000);
  const [formTrm, setFormTrm] = useState<number | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [showRule, setShowRule] = useState(true);

  // Filtros
  const [dateFilter, setDateFilter] = useState("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Tabla. La paginación vive keyed por los filtros: al cambiar cualquier filtro
  // la página efectiva vuelve a 1 sin efectos ni escrituras durante el render.
  const filterKey = `${dateFilter}|${customFrom}|${customTo}|${sellerFilter}|${statusFilter}|${platformFilter}|${search}`;
  const [pageState, setPageState] = useState<{ key: string; value: number }>({ key: filterKey, value: 1 });
  const page = pageState.key === filterKey ? pageState.value : 1;
  const setPage = (updater: number | ((p: number) => number)) =>
    setPageState((s) => {
      const cur = s.key === filterKey ? s.value : 1;
      const value = typeof updater === "function" ? updater(cur) : updater;
      return { key: filterKey, value };
    });
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [visibleCols, setVisibleCols] = useState<Record<ColKey, boolean>>({
    investment: true, sales: true, roas: true, leads: true, cpl: true, kpiMensajes: true, status: true,
  });
  const PAGE_SIZE = 8;

  const [form, setForm] = useState({
    name: "", sellerId: "", comboId: "", investment: "", sales: "", leads: "",
    targetMultiple: "10", platform: "Meta Ads", notes: "", status: "ACTIVE",
    startDate: "", endDate: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [dc, ds, dco] = await Promise.all([
      fetchList("/api/panel/campaigns"),
      fetchList("/api/panel/sellers"),
      fetchList("/api/panel/combos"),
    ]);
    setCampaigns(dc as Campaign[]);
    setSellers(ds as { id: string; fullName: string }[]);
    setCombos((dco as { id: string; name: string }[]).map((c) => ({ id: c.id, name: c.name })));
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  const { markLocalWrite } = useRealtimeRefresh(["campaigns"], load);
  useEffect(() => { fetch("/api/trm").then((r) => r.json()).then((d) => d.rate && setTrm(d.rate)).catch(() => {}); }, []);

  // TRM correspondiente a la fecha de inicio de la campaña (o la de hoy si aún no hay fecha).
  useEffect(() => {
    if (!showForm) return;
    const url = form.startDate ? `/api/trm?date=${form.startDate}` : "/api/trm";
    fetch(url).then((r) => r.json()).then((d) => d.rate && setFormTrm(d.rate)).catch(() => {});
  }, [showForm, form.startDate]);

  const previewTrm = formTrm ?? trm;

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", sellerId: sellers[0]?.id ?? "", comboId: "", investment: "", sales: "", leads: "", targetMultiple: "10", platform: "Meta Ads", notes: "", status: "ACTIVE", startDate: "", endDate: "" });
    setAlert(null);
    setShowForm(true);
  };

  const openEdit = (c: Campaign) => {
    setEditing(c);
    setForm({
      name: c.name, sellerId: c.seller.id, comboId: c.combo?.id ?? "", investment: String(c.investment), sales: String(c.sales), leads: String(c.leads ?? 0), targetMultiple: String(c.targetMultiple), platform: c.platform, notes: c.notes ?? "", status: c.status || "ACTIVE",
      startDate: c.startDate ? c.startDate.slice(0, 10) : "",
      endDate: c.endDate ? c.endDate.slice(0, 10) : "",
    });
    setAlert(null);
    setShowForm(true);
  };

  const platforms = useMemo(
    () => Array.from(new Set(campaigns.map((c) => c.platform).filter(Boolean))).sort(),
    [campaigns],
  );

  // Filtro por fecha (base) y luego filtros de columna. Compara inicio de campaña.
  const dateCampaigns = useMemo(() => {
    const [from, to] = dateFilterRange(dateFilter, customFrom, customTo);
    return campaigns.filter((c) => inRange(c.startDate, from, to));
  }, [campaigns, dateFilter, customFrom, customTo]);

  const matchesFilters = useCallback((c: Campaign) => {
    if (sellerFilter !== "all" && c.seller.id !== sellerFilter) return false;
    if (statusFilter !== "all" && displayStatusOf(c, roasOf(c)) !== statusFilter) return false;
    if (platformFilter !== "all" && c.platform !== platformFilter) return false;
    const q = search.trim().toLowerCase();
    if (q && !(`${c.name} ${c.seller.fullName} ${c.platform}`.toLowerCase().includes(q))) return false;
    return true;
  }, [sellerFilter, statusFilter, platformFilter, search]);

  const filteredCampaigns = useMemo(
    () => dateCampaigns.filter(matchesFilters),
    [dateCampaigns, matchesFilters],
  );

  const totals = useMemo(() => {
    let inversionUsd = 0, inversionCop = 0, ventas = 0, leads = 0, dias = 0;
    for (const c of filteredCampaigns) {
      inversionUsd += investmentUsdOf(c);
      inversionCop += investmentCopOf(c);
      ventas += salesOf(c);
      leads += c.leads ?? 0;
      dias += c.daily.days;
    }
    return {
      count: filteredCampaigns.length,
      inversionUsd, inversionCop, ventas, leads, dias,
      cpl: leads > 0 ? inversionUsd / leads : null,
      roas: calcROAS(ventas, inversionCop),
      avgTarget: filteredCampaigns.length
        ? filteredCampaigns.reduce((s, c) => s + (c.targetMultiple || 10), 0) / filteredCampaigns.length
        : 10,
    };
  }, [filteredCampaigns]);

  // Totales del periodo anterior (mismos filtros, ventana de fecha previa).
  const prevTotals = useMemo(() => {
    const [from, to] = previousRange(dateFilter, customFrom, customTo);
    if (!from) return null;
    const list = campaigns.filter((c) => inRange(c.startDate, from, to) && matchesFilters(c));
    let inversionUsd = 0, inversionCop = 0, ventas = 0, leads = 0;
    for (const c of list) {
      inversionUsd += investmentUsdOf(c);
      inversionCop += investmentCopOf(c);
      ventas += salesOf(c);
      leads += c.leads ?? 0;
    }
    return { inversionUsd, inversionCop, ventas, leads, roas: calcROAS(ventas, inversionCop) };
  }, [campaigns, dateFilter, customFrom, customTo, matchesFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredCampaigns.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredCampaigns.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const save = async () => {
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      setAlert({ type: "err", msg: "La fecha final no puede ser anterior a la inicial" });
      return;
    }
    setSaving(true);
    const body = { ...form, investment: parseFloat(form.investment) || 0, sales: parseFloat(form.sales) || 0, leads: parseInt(form.leads) || 0, targetMultiple: parseFloat(form.targetMultiple) || 10 };
    const url = editing ? `/api/panel/campaigns/${editing.id}` : "/api/panel/campaigns";
    const method = editing ? "PATCH" : "POST";
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSaving(false);
    if (r.ok) { setAlert({ type: "ok", msg: editing ? "Campaña actualizada" : "Campaña creada" }); markLocalWrite(); load(); setTimeout(() => setShowForm(false), 1000); }
    else { const d = await r.json(); setAlert({ type: "err", msg: d.error ?? "Error" }); }
  };

  const exportCSV = () => {
    const head = ["Campaña", "Vendedor", "Plataforma", "Inversión (USD)", "Inversión (COP)", "Vendido (COP)", "ROAS", "Leads", "CPL (USD)", "Estado"];
    const lines = filteredCampaigns.map((c) => {
      const venta = salesOf(c);
      const roas = roasOf(c);
      const cpl = c.leads > 0 ? investmentUsdOf(c) / c.leads : "";
      return [
        c.name, c.seller.fullName, c.platform,
        Math.round(investmentUsdOf(c)), Math.round(investmentCopOf(c)), Math.round(venta),
        roas.toFixed(2), c.leads ?? 0,
        cpl === "" ? "" : Math.round(Number(cpl)),
        DISPLAY_STATUS[displayStatusOf(c, roas)].label,
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [head.join(","), ...lines].join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `campanas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = pageRows.every((c) => next.has(c.id));
      if (allSelected) pageRows.forEach((c) => next.delete(c.id));
      else pageRows.forEach((c) => next.add(c.id));
      return next;
    });
  };
  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const dateOpts = DATE_FILTERS.map((d) => ({
    value: d.value,
    label: <span className="flex items-center gap-2"><MdCalendarToday size={15} className="text-[#94A3B8]" />{d.label}</span>,
  }));
  const sellerOpts = [
    { value: "all", label: <span className="flex items-center gap-2"><MdPersonOutline size={15} className="text-[#94A3B8]" />Todos</span> },
    ...sellers.map((s) => ({ value: s.id, label: <span className="flex items-center gap-2"><MdPersonOutline size={15} className="text-[#94A3B8]" />{s.fullName}</span> })),
  ];
  const statusOpts = [
    { value: "all", label: <span className="flex items-center gap-2"><MdCheckCircleOutline size={15} className="text-[#94A3B8]" />Todos</span> },
    ...(Object.keys(DISPLAY_STATUS) as DisplayStatus[]).map((k) => ({
      value: k,
      label: <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: DISPLAY_STATUS[k].color }} />{DISPLAY_STATUS[k].label}</span>,
    })),
  ];
  const platformOpts = [
    { value: "all", label: <span className="flex items-center gap-2"><MdPublic size={15} className="text-[#94A3B8]" />Todas</span> },
    ...platforms.map((p) => ({ value: p, label: <span className="flex items-center gap-2"><MdPublic size={15} className="text-[#94A3B8]" />{p}</span> })),
  ];

  const filterTrigger = "flex w-full items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-left text-sm font-semibold text-[#334155] hover:border-[#27B1B8] transition-colors sm:min-w-[120px]";

  const kpis = [
    {
      label: "Vendido total (COP)", value: fmtCOP(totals.ventas),
      sub: `${totals.dias} día${totals.dias === 1 ? "" : "s"} en matrices`,
      delta: prevTotals ? fmtDelta(totals.ventas, prevTotals.ventas) : null,
      icon: <MdAttachMoney size={18} />, color: "#16A34A", tint: "#DCFCE7",
      spark: filteredCampaigns.map((c) => salesOf(c)), sparkColor: "#16A34A",
    },
    {
      label: "Invertido total", value: `${fmtUSD(totals.inversionUsd)} USD`,
      sub: `≈ ${fmtCOP(totals.inversionCop)}`,
      delta: prevTotals ? fmtDelta(totals.inversionUsd, prevTotals.inversionUsd) : null,
      icon: <MdPayments size={18} />, color: "#2563EB", tint: "#DBEAFE",
      spark: filteredCampaigns.map((c) => investmentUsdOf(c)), sparkColor: "#2563EB",
    },
    {
      label: "ROAS global", value: `${totals.roas.toFixed(2)}x`,
      sub: `${totals.leads} leads`,
      badge: `Meta: ${Math.round(totals.avgTarget)}x`,
      delta: prevTotals ? fmtDelta(totals.roas, prevTotals.roas) : null,
      icon: <MdTrendingUp size={18} />, color: "#0D9488", tint: "#CCFBF1",
      spark: filteredCampaigns.map((c) => roasOf(c)), sparkColor: "#0D9488",
    },
    {
      label: "Leads totales", value: String(totals.leads),
      sub: totals.cpl !== null ? `CPL ${fmtUSD(totals.cpl)}` : "Sin leads",
      delta: prevTotals ? fmtDelta(totals.leads, prevTotals.leads) : null,
      icon: <MdPeople size={18} />, color: "#7C3AED", tint: "#EDE9FE",
      spark: filteredCampaigns.map((c) => c.leads ?? 0), sparkColor: "#7C3AED",
    },
  ];

  const updatedLabel = updatedAt
    ? `hoy, ${updatedAt.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`
    : "—";

  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  }, [currentPage, totalPages]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel comercial</p>
          <h1 className="mt-1 text-3xl font-black text-[#1A1A1A]">Campañas</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            <span className="font-semibold text-[#334155]">{filteredCampaigns.length} campañas activas</span>
            {" · "}Última actualización: {updatedLabel}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(39,177,184,0.35)] hover:opacity-90 transition-opacity">
            <MdAdd size={18} /> Nueva campaña
          </button>
        </div>
      </div>

      {/* Regla ×10 */}
      {showRule && (
        <div className="mb-5 flex items-start gap-3 rounded-2xl border border-[#27B1B8]/25 bg-[#F0F9F8] p-4">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#27B1B8] text-white">
            <MdInfoOutline size={15} />
          </span>
          <p className="flex-1 text-sm font-black text-[#0C6060]">
            Meta mínima: inversión × {Math.round(totals.avgTarget)} = ventas esperadas
          </p>
          <p className="hidden flex-1 text-right text-xs text-[#64748B] sm:block">
            Esta regla aplica para todas las campañas de Kliniu.
          </p>
          <button onClick={() => setShowRule(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]" aria-label="Cerrar">
            <MdClose size={18} />
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-white p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-1 text-xs font-bold text-[#64748B]"><MdFilterList size={15} /> Periodo</span>
            <div className="w-full sm:w-44">
              <SimpleSelect value={dateFilter} options={dateOpts} onChange={setDateFilter} triggerClassName={filterTrigger} />
            </div>
          </div>

          {dateFilter === "custom" && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8] sm:w-auto" />
              <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8] sm:w-auto" />
            </div>
          )}

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-1 text-xs font-bold text-[#64748B]">Vendedor</span>
            <div className="w-full sm:w-40">
              <SimpleSelect value={sellerFilter} options={sellerOpts} onChange={setSellerFilter} triggerClassName={filterTrigger} />
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-1 text-xs font-bold text-[#64748B]">Estado</span>
            <div className="w-full sm:w-40">
              <SimpleSelect value={statusFilter} options={statusOpts} onChange={setStatusFilter} triggerClassName={filterTrigger} />
            </div>
          </div>

          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
            <span className="inline-flex items-center gap-1.5 px-1 text-xs font-bold text-[#64748B]">Plataforma</span>
            <div className="w-full sm:w-40">
              <SimpleSelect value={platformFilter} options={platformOpts} onChange={setPlatformFilter} triggerClassName={filterTrigger} />
            </div>
          </div>

          <div className="relative w-full sm:min-w-[200px] sm:flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><MdSearch size={16} /></span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar campañas..."
              className="w-full rounded-xl border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm outline-none focus:border-[#27B1B8]"
            />
          </div>

          <span className="self-start rounded-full bg-[#F1F5F9] px-3 py-1.5 text-xs font-bold text-[#475569] sm:self-auto">
            {filteredCampaigns.length} campaña{filteredCampaigns.length === 1 ? "" : "s"}
          </span>
        </div>

        {(dateFilter !== "all" || sellerFilter !== "all" || statusFilter !== "all" || platformFilter !== "all" || search) && (
          <button
            type="button"
            onClick={() => { setDateFilter("all"); setCustomFrom(""); setCustomTo(""); setSellerFilter("all"); setStatusFilter("all"); setPlatformFilter("all"); setSearch(""); }}
            className="mt-2 text-xs font-bold text-[#27B1B8] hover:underline"
          >
            ↻ Limpiar filtros
          </button>
        )}
      </div>

      {/* KPIs */}
      {!loading && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="flex items-start justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: k.tint, color: k.color }}>{k.icon}</span>
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#94A3B8]">{k.label}</p>
                </div>
                <p className="mt-2 truncate text-2xl font-black text-[#1A1A1A]">{k.value}</p>
                <p className="truncate text-xs text-[#94A3B8]">{k.sub}</p>
                <div className="mt-1 flex items-center gap-2">
                  {k.delta !== null && k.delta !== undefined && (
                    <span className={`text-xs font-bold ${k.delta >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                      {k.delta >= 0 ? "↑" : "↓"} {Math.abs(k.delta).toFixed(0)}% <span className="font-medium text-[#94A3B8]">vs. periodo anterior</span>
                    </span>
                  )}
                  {k.badge && <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[10px] font-bold text-[#0F9D6A]">{k.badge}</span>}
                </div>
              </div>
              <Sparkline values={k.spark} color={k.sparkColor} width={84} height={40} />
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] p-4">
          <h2 className="text-base font-black text-[#1A1A1A]">Campañas ({filteredCampaigns.length})</h2>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">
              <MdFileDownload size={15} /> Exportar
            </button>
            <Popover
              button={<span className="inline-flex items-center gap-1.5"><MdViewColumn size={15} /> Columnas</span>}
              buttonClassName="inline-flex items-center rounded-xl border border-[#E2E8F0] px-3 py-2 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]"
            >
              {() => (
                <div className="px-1 py-1">
                  {COLUMNS.map((col) => (
                    <label key={col.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[#F8FAFC]">
                      <input
                        type="checkbox"
                        checked={visibleCols[col.key]}
                        onChange={(e) => setVisibleCols((v) => ({ ...v, [col.key]: e.target.checked }))}
                        className="h-4 w-4 accent-[#27B1B8]"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              )}
            </Popover>
          </div>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando campañas…</div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <p className="text-3xl">📢</p>
            {campaigns.length > 0 ? (
              <>
                <p className="text-sm font-semibold text-[#94A3B8]">Ninguna campaña cumple los filtros</p>
                <button
                  onClick={() => { setDateFilter("all"); setCustomFrom(""); setCustomTo(""); setSellerFilter("all"); setStatusFilter("all"); setPlatformFilter("all"); setSearch(""); }}
                  className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-xs font-bold text-[#64748B]"
                >
                  Limpiar filtros
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-[#94A3B8]">No hay campañas todavía</p>
                <button onClick={openNew} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-xs font-bold text-white">Crear primera campaña</button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <tr>
                    <TH className="w-10">
                      <input
                        type="checkbox"
                        checked={pageRows.length > 0 && pageRows.every((c) => selected.has(c.id))}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 accent-[#27B1B8]"
                        aria-label="Seleccionar todos"
                      />
                    </TH>
                    <TH>Campaña</TH>
                    {visibleCols.investment && <TH>Inversión (USD)</TH>}
                    {visibleCols.sales && <TH>Vendido (COP)</TH>}
                    {visibleCols.roas && <TH>ROAS</TH>}
                    {visibleCols.leads && <TH>Leads</TH>}
                    {visibleCols.cpl && <TH>CPL</TH>}
                    {visibleCols.kpiMensajes && <TH>KPI Mensajes</TH>}
                    {visibleCols.status && <TH>Estado</TH>}
                    <TH className="text-right">Acciones</TH>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {pageRows.map((c) => {
                    const inversionUsd = investmentUsdOf(c);
                    const inversionCop = investmentCopOf(c);
                    const venta = salesOf(c);
                    const roas = roasOf(c);
                    const status = displayStatusOf(c, roas);
                    const meta = DISPLAY_STATUS[status];
                    const target = c.targetMultiple || 10;
                    const barPct = Math.min(100, (roas / target) * 100);
                    const cpl = c.leads > 0 ? investmentUsdOf(c) / c.leads : null;
                    const kpiMensajes = kpiMensajesOf(c);
                    const kpiMensajesMeta = kpiMensajesColor(kpiMensajes);
                    const initials = c.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
                    return (
                      <tr key={c.id} className="transition-colors hover:bg-[#F8FAFC]">
                        <td className="px-4 py-4">
                          <input
                            type="checkbox"
                            checked={selected.has(c.id)}
                            onChange={() => toggleSelect(c.id)}
                            className="h-4 w-4 accent-[#27B1B8]"
                            aria-label={`Seleccionar ${c.name}`}
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {c.combo?.image ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={c.combo.image} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                            ) : (
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#27B1B8]/10 text-xs font-black text-[#0C6060]">{initials}</div>
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-bold text-[#1A1A1A]">{c.name}</p>
                              <p className="truncate text-xs text-[#94A3B8]">Vendedor {c.seller.fullName} · {c.platform}</p>
                            </div>
                          </div>
                        </td>
                        {visibleCols.investment && (
                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-[#2563EB]">{fmtUSD(inversionUsd)}</p>
                            <p className="text-xs text-[#94A3B8]">≈ {fmtCOP(inversionCop)} COP</p>
                          </td>
                        )}
                        {visibleCols.sales && (
                          <td className="px-4 py-4">
                            <p className="text-sm font-bold text-[#16A34A]">{fmtCOP(venta)}</p>
                            <p className="text-xs text-[#94A3B8]">{c.daily.days > 0 ? `Matriz · ${c.daily.days} día${c.daily.days === 1 ? "" : "s"}` : "Manual"}</p>
                          </td>
                        )}
                        {visibleCols.roas && (
                          <td className="px-4 py-4">
                            <p className="text-sm font-black" style={{ color: meta.color }}>{roas.toFixed(1)}x</p>
                            <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-[#F1F5F9]">
                              <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: meta.color }} />
                            </div>
                          </td>
                        )}
                        {visibleCols.leads && <td className="px-4 py-4 text-sm text-[#1A1A1A]">{c.leads ?? 0}</td>}
                        {visibleCols.cpl && <td className="px-4 py-4 text-sm text-[#1A1A1A]">{cpl !== null ? fmtUSD(cpl) : "—"}</td>}
                        {visibleCols.kpiMensajes && (
                          <td className="px-4 py-4">
                            {c.daily.mensajes > 0 ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold" style={{ background: kpiMensajesMeta.bg, color: kpiMensajesMeta.color }}>
                                {(kpiMensajes * 100).toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-sm text-[#94A3B8]">—</span>
                            )}
                          </td>
                        )}
                        {visibleCols.status && (
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold" style={{ background: meta.bg, color: meta.color }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                              {meta.label}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setDailyCampaign(c)}
                              className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-semibold text-[#64748B] transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
                            >
                              Ver matriz
                            </button>
                            <Popover
                              align="right"
                              button={<MdMoreVert size={18} />}
                              buttonClassName="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:border-[#27B1B8] hover:text-[#27B1B8]"
                            >
                              {(close) => (
                                <div className="py-1">
                                  <button onClick={() => { close(); openEdit(c); }} className="block w-full px-3 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#F8FAFC]">Editar campaña</button>
                                  <button onClick={() => { close(); setDailyCampaign(c); }} className="block w-full px-3 py-2 text-left text-sm text-[#1A1A1A] hover:bg-[#F8FAFC]">Matriz diaria</button>
                                </div>
                              )}
                            </Popover>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer / paginación */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] p-4">
              <p className="text-xs text-[#64748B]">
                Mostrando <span className="font-bold text-[#334155]">{(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredCampaigns.length)}</span> de <span className="font-bold text-[#334155]">{filteredCampaigns.length}</span> campañas
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                  aria-label="Anterior"
                >
                  <MdChevronLeft size={18} />
                </button>
                {pageNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold ${n === currentPage ? "bg-[#27B1B8] text-white" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                  aria-label="Siguiente"
                >
                  <MdChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] p-6 pb-4">
              <h3 className="font-black text-[#1A1A1A]">{editing ? "Editar campaña" : "Nueva campaña"}</h3>
              <button onClick={() => setShowForm(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
            </div>

            <div className="overflow-y-auto p-6 pt-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Nombre</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="Campaña Q2 jabón líquido" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Vendedor</label>
                  <SimpleSelect
                    value={form.sellerId}
                    options={[{ value: "", label: "Sin asignar" }, ...sellers.map((s) => ({ value: s.id, label: s.fullName }))]}
                    onChange={(v) => setForm({ ...form, sellerId: v })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Combo (opcional)</label>
                  <SimpleSelect
                    value={form.comboId}
                    options={[{ value: "", label: "Sin combo" }, ...combos.map((c) => ({ value: c.id, label: c.name }))]}
                    onChange={(v) => setForm({ ...form, comboId: v })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Inversión (USD)</label>
                  <input type="number" value={form.investment} onChange={(e) => setForm({ ...form, investment: e.target.value })} className="no-spinner w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="0" />
                  {form.investment && (
                    <p className="mt-1 text-xs text-[#94A3B8]">≈ {fmtCOP(parseFloat(form.investment) * previewTrm)} (TRM ${Math.round(previewTrm).toLocaleString("es-CO")})</p>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Ventas generadas (COP)</label>
                  <input type="number" value={form.sales} onChange={(e) => setForm({ ...form, sales: e.target.value })} className="no-spinner w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="0" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Leads</label>
                  <input type="number" value={form.leads} onChange={(e) => setForm({ ...form, leads: e.target.value })} className="no-spinner w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" placeholder="0" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Meta (×)</label>
                  <input type="number" value={form.targetMultiple} onChange={(e) => setForm({ ...form, targetMultiple: e.target.value })} className="no-spinner w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Plataforma</label>
                  <SimpleSelect
                    value={form.platform}
                    options={["Meta Ads", "Google Ads", "TikTok Ads", "LinkedIn Ads", "Otro"].map((p) => ({ value: p, label: p }))}
                    onChange={(v) => setForm({ ...form, platform: v })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Estado</label>
                  <SimpleSelect
                    value={form.status}
                    options={[{ value: "ACTIVE", label: "Activa" }, { value: "PAUSED", label: "Pausada" }]}
                    onChange={(v) => setForm({ ...form, status: v })}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Fecha inicio</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Fecha fin (opcional)</label>
                  <input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
                </div>

                {/* Preview ROAS en tiempo real */}
                {form.investment && form.sales && (
                  <div className="rounded-xl bg-[#F0F9F8] p-3 sm:col-span-2">
                    {(() => {
                      const r = calcROAS(parseFloat(form.sales), parseFloat(form.investment) * previewTrm);
                      const leadsN = parseInt(form.leads) || 0;
                      const cplN = leadsN > 0 ? Math.round(parseFloat(form.investment) / leadsN) : null;
                      const target = parseFloat(form.targetMultiple) || 10;
                      const statusKey: DisplayStatus = form.status !== "ACTIVE" ? "pausada" : r >= target ? "meta" : r >= target * 0.7 ? "rentable" : r >= target * 0.4 ? "revision" : "riesgo";
                      const m = DISPLAY_STATUS[statusKey];
                      return (
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-[#0C6060]">ROAS calculado</p>
                            {cplN !== null && <p className="text-xs text-[#64748B]">CPL: {fmtUSD(cplN)}</p>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black" style={{ color: m.color }}>×{r.toFixed(1)}</span>
                            <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: m.bg, color: m.color }}>{m.label}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Notas</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full resize-none rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]" />
                </div>
              </div>

              {alert && (
                <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                  {alert.msg}
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-[#E2E8F0] p-6 pt-4">
              <button onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B]">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white disabled:opacity-50">
                {saving ? "Guardando…" : editing ? "Actualizar" : "Crear campaña"}
              </button>
            </div>
          </div>
        </div>
      )}

      {dailyCampaign && (
        <DailyMatrix
          campaignId={dailyCampaign.id}
          campaignName={dailyCampaign.name}
          onClose={() => setDailyCampaign(null)}
        />
      )}
    </div>
  );
}
