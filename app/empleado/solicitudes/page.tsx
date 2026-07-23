"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fmtDateOnly } from "@/lib/date";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import {
  MdBeachAccess, MdHealthAndSafety, MdEventNote, MdLocalHospital, MdChildFriendly,
  MdGavel, MdSchool, MdEventBusy, MdHome, MdAccessTime, MdMoneyOff, MdSearch,
  MdCheckCircle, MdPending, MdCancel, MdAdd, MdClose, MdDescription,
} from "react-icons/md";

type TimeOffRequestRow = {
  id: string;
  type: string;
  subType: string | null;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  hours: number | null;
  reason: string | null;
  reviewNote: string | null;
  incapacityNumber: string | null;
  createdAt: string;
  updatedAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  VACATION: "Vacaciones",
  PERMIT: "Permiso",
  LEAVE: "Licencia",
  INCAPACITY: "Incapacidad",
  UNPAID: "No remunerado",
};

const SUBTYPE_LABELS: Record<string, string> = {
  CITA_MEDICA: "Cita médica",
  CALAMIDAD_DOMESTICA: "Calamidad doméstica",
  LUTO: "Licencia por luto",
  MATERNIDAD: "Licencia de maternidad",
  PATERNIDAD: "Licencia de paternidad",
  DILIGENCIA_JUDICIAL: "Diligencia judicial",
  SINDICAL: "Permiso sindical",
  ESTUDIO: "Permiso de estudio",
  PERSONAL: "Permiso personal",
  NO_REMUNERADO: "No remunerado",
  MEDIO_DIA: "Medio día",
  HORAS: "Horas",
  OTRO: "Otro",
};

const TYPE_ICON: Record<string, typeof MdBeachAccess> = {
  VACATION: MdBeachAccess,
  INCAPACITY: MdHealthAndSafety,
  PERMIT: MdEventNote,
  UNPAID: MdMoneyOff,
};

const SUBTYPE_ICON: Record<string, typeof MdBeachAccess> = {
  CITA_MEDICA: MdLocalHospital,
  CALAMIDAD_DOMESTICA: MdHome,
  LUTO: MdEventBusy,
  MATERNIDAD: MdChildFriendly,
  PATERNIDAD: MdChildFriendly,
  DILIGENCIA_JUDICIAL: MdGavel,
  ESTUDIO: MdSchool,
  HORAS: MdAccessTime,
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  APPROVED: "bg-[#DCFCE7] text-[#16A34A]",
  REJECTED: "bg-[#FEE2E2] text-[#DC2626]",
  CANCELLED: "bg-[#F1F5F9] text-[#64748B]",
};

const NEW_REQUEST_LINKS = [
  { href: "/empleado/vacaciones", label: "Vacaciones" },
  { href: "/empleado/permisos", label: "Permiso" },
  { href: "/empleado/incapacidades", label: "Incapacidad" },
];

function fmt(d: string) {
  return fmtDateOnly(d, { day: "numeric", month: "short", year: "numeric" });
}

function typeIcon(r: TimeOffRequestRow) {
  return (r.subType && SUBTYPE_ICON[r.subType]) || TYPE_ICON[r.type] || MdEventNote;
}

function typeLabel(r: TimeOffRequestRow) {
  return (r.subType && SUBTYPE_LABELS[r.subType]) || TYPE_LABELS[r.type] || r.type;
}

function durationLabel(r: TimeOffRequestRow) {
  if (r.subType === "HORAS" && r.hours) return `${r.hours} h`;
  return `${r.durationDays} día${r.durationDays === 1 ? "" : "s"}`;
}

function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 30) return `Hace ${diffDays} días`;
  const diffMonths = Math.floor(diffDays / 30);
  return `Hace ${diffMonths} mes${diffMonths === 1 ? "" : "es"}`;
}

export default function SolicitudesPage() {
  const [requests, setRequests] = useState<TimeOffRequestRow[]>([]);
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<TimeOffRequestRow | null>(null);
  const [showNew, setShowNew] = useState(false);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = () => {
    Promise.all([
      fetch("/api/rrhh-local/time-off").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/account").then((r) => (r.ok ? r.json() : null)),
    ]).then(([reqs, account]) => {
      setRequests(reqs);
      setFullName(account?.user?.fullName?.split(" ")[0] ?? "");
      setLoading(false);
    });
  };

  useEffect(load, []);
  useRealtimeRefresh(["timeoff"], load);

  const currentYear = new Date().getFullYear();

  const kpis = useMemo(() => {
    const thisYear = requests.filter((r) => new Date(r.startDate).getFullYear() === currentYear);
    const approved = thisYear.filter((r) => r.status === "APPROVED").length;
    const pending = thisYear.filter((r) => r.status === "PENDING").length;
    const rejected = thisYear.filter((r) => r.status === "REJECTED").length;
    const resolved = requests.filter((r) => r.status === "APPROVED" || r.status === "REJECTED");
    const avgDays = resolved.length
      ? resolved.reduce((s, r) => s + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 86400000, 0) / resolved.length
      : null;
    return { total: thisYear.length, approved, pending, rejected, avgDays };
  }, [requests, currentYear]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (typeFilter && r.type !== typeFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (from && new Date(r.startDate) < new Date(from)) return false;
      if (to && new Date(r.startDate) > new Date(to)) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${typeLabel(r)} ${r.reason ?? ""} ${r.incapacityNumber ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [requests, typeFilter, statusFilter, from, to, search]);

  const timeline = useMemo(
    () => [...requests].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 4),
    [requests],
  );

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...requests]
      .filter((r) => (r.status === "APPROVED" || r.status === "PENDING") && new Date(r.startDate) >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 4);
  }, [requests]);

  const historial = useMemo(() => {
    const approved = requests.filter((r) => r.status === "APPROVED" || r.status === "REJECTED");
    const byMonth = new Map<string, TimeOffRequestRow[]>();
    for (const r of approved) {
      const d = new Date(r.startDate);
      const key = d.toLocaleDateString("es-CO", { month: "long", year: "numeric", timeZone: "UTC" });
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(r);
    }
    return [...byMonth.entries()].slice(0, 5);
  }, [requests]);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">👋 Hola{fullName ? `, ${fullName}` : ""}</h1>
          <p className="text-sm text-[#64748B]">Consulta el estado de todas tus solicitudes y trámites con la empresa.</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNew((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1F9BA1]"
          >
            {showNew ? <MdClose size={16} /> : <MdAdd size={16} />}
            Nueva solicitud
          </button>
          {showNew && (
            <div className="absolute right-0 z-10 mt-2 w-48 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-lg">
              {NEW_REQUEST_LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="block px-4 py-2.5 text-sm font-semibold text-[#1A1A1A] hover:bg-[#F8FAFC]">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-2xl font-black text-[#1A1A1A]">{kpis.total}</p>
          <p className="text-xs text-[#94A3B8]">Solicitudes este año</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-2xl font-black text-[#16A34A]">{kpis.approved}</p>
          <p className="text-xs text-[#94A3B8]">Aprobadas</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-2xl font-black text-[#B45309]">{kpis.pending}</p>
          <p className="text-xs text-[#94A3B8]">Pendientes</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-2xl font-black text-[#DC2626]">{kpis.rejected}</p>
          <p className="text-xs text-[#94A3B8]">Rechazadas</p>
        </div>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          <p className="text-2xl font-black text-[#27B1B8]">{kpis.avgDays !== null ? `${kpis.avgDays.toFixed(1)}d` : "—"}</p>
          <p className="text-xs text-[#94A3B8]">Promedio respuesta</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E2E8F0] bg-white p-3">
            <div className="flex min-w-[160px] flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2">
              <MdSearch className="text-[#94A3B8]" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar solicitud…"
                className="w-full text-sm outline-none"
              />
            </div>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-[#E2E8F0] px-2 py-2 text-xs font-bold text-[#1A1A1A]">
              <option value="">Todos los tipos</option>
              {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-[#E2E8F0] px-2 py-2 text-xs font-bold text-[#1A1A1A]">
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-[#E2E8F0] px-2 py-2 text-xs" />
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-[#E2E8F0] px-2 py-2 text-xs" />
          </div>

          {timeline.length > 0 && (
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <h2 className="mb-3 text-sm font-black text-[#1A1A1A]">Actividad reciente</h2>
              <div className="space-y-3">
                {timeline.map((r) => {
                  const Icon = typeIcon(r);
                  return (
                    <div key={r.id} className="flex items-center gap-3 text-sm">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6FAFB] text-[#27B1B8]">
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[#1A1A1A]">
                          {typeLabel(r)} {STATUS_LABELS[r.status]?.toLowerCase()}
                        </p>
                        <p className="text-xs text-[#94A3B8]">{relativeTime(r.updatedAt)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_STYLE[r.status] ?? ""}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
            <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Duración</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const Icon = typeIcon(r);
                  return (
                    <tr key={r.id} className="border-b border-[#F1F5F9]">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Icon className="shrink-0 text-[#27B1B8]" size={16} />
                          <div>
                            <p className="font-semibold text-[#1A1A1A]">{typeLabel(r)}</p>
                            {r.incapacityNumber && <p className="text-xs text-[#94A3B8]">{r.incapacityNumber}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">{fmt(r.startDate)}</td>
                      <td className="p-3">{durationLabel(r)}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[r.status] ?? ""}`}>
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <button onClick={() => setDetail(r)} className="flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
                          <MdDescription size={14} /> Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td className="p-3 text-[#94A3B8]" colSpan={5}>Sin solicitudes que coincidan con los filtros.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="text-sm font-black text-[#1A1A1A]">Resumen</h2>
            <div className="mt-3 space-y-2 text-sm">
              <p className="flex items-center justify-between"><span className="text-[#64748B]">Solicitudes este año</span><strong>{kpis.total}</strong></p>
              <p className="flex items-center justify-between text-[#16A34A]"><span className="flex items-center gap-1"><MdCheckCircle size={14} /> Aprobadas</span><strong>{kpis.approved}</strong></p>
              <p className="flex items-center justify-between text-[#B45309]"><span className="flex items-center gap-1"><MdPending size={14} /> Pendientes</span><strong>{kpis.pending}</strong></p>
              <p className="flex items-center justify-between text-[#DC2626]"><span className="flex items-center gap-1"><MdCancel size={14} /> Rechazadas</span><strong>{kpis.rejected}</strong></p>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="text-sm font-black text-[#1A1A1A]">Próximos eventos</h2>
            <div className="mt-3 space-y-3">
              {upcoming.length === 0 && <p className="text-sm text-[#94A3B8]">No tienes eventos programados.</p>}
              {upcoming.map((r) => {
                const Icon = typeIcon(r);
                return (
                  <div key={r.id} className="flex items-center gap-3 border-b border-[#F1F5F9] pb-3 text-sm last:border-b-0 last:pb-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#E6FAFB] text-[#27B1B8]">
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#1A1A1A]">{typeLabel(r)}</p>
                      <p className="text-xs text-[#94A3B8]">{fmt(r.startDate)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <h2 className="text-sm font-black text-[#1A1A1A]">Historial</h2>
            <div className="mt-3 space-y-3">
              {historial.length === 0 && <p className="text-sm text-[#94A3B8]">Sin historial todavía.</p>}
              {historial.map(([month, reqs]) => (
                <div key={month} className="border-b border-[#F1F5F9] pb-3 text-sm last:border-b-0 last:pb-0">
                  <p className="mb-1 text-xs font-bold uppercase text-[#94A3B8]">{month}</p>
                  {reqs.map((r) => (
                    <div key={r.id} className="flex items-center justify-between text-xs">
                      <span className="text-[#1A1A1A]">{typeLabel(r)}</span>
                      <span className={r.status === "APPROVED" ? "font-bold text-[#16A34A]" : "font-bold text-[#DC2626]"}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-black text-[#1A1A1A]">{typeLabel(detail)}</h3>
              <button onClick={() => setDetail(null)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose size={20} /></button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex justify-between"><span className="text-[#64748B]">Fecha</span><span>{fmt(detail.startDate)} – {fmt(detail.endDate)}</span></p>
              <p className="flex justify-between"><span className="text-[#64748B]">Duración</span><span>{durationLabel(detail)}</span></p>
              <p className="flex justify-between"><span className="text-[#64748B]">Estado</span>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[detail.status] ?? ""}`}>{STATUS_LABELS[detail.status] ?? detail.status}</span>
              </p>
              {detail.incapacityNumber && <p className="flex justify-between"><span className="text-[#64748B]">Código</span><span>{detail.incapacityNumber}</span></p>}
              {detail.reason && <p><span className="text-[#64748B]">Motivo:</span> {detail.reason}</p>}
              {detail.status === "REJECTED" && detail.reviewNote && (
                <p className="rounded-lg bg-[#FEE2E2] p-2 text-[#DC2626]"><strong>Motivo de rechazo:</strong> {detail.reviewNote}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
