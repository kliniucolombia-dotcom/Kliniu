"use client";
import { useEffect, useMemo, useState } from "react";
import { SimpleSelect } from "../../_components/simple-select";
import { fmtDateOnly } from "@/lib/date";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { MdTimer, MdSchedule, MdCheckCircle, MdHourglassEmpty, MdCalendarMonth, MdSearch, MdFileDownload, MdMoreVert, MdClose, MdInfo } from "react-icons/md";

type EmployeeOption = { id: string; employeeCode: string; jobTitle: string; user: { fullName: string } };

type OvertimeRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  overtimeType: string;
  reason: string | null;
  status: string;
  reviewNote: string | null;
  employee: { employeeCode: string; jobTitle: string; user: { fullName: string } };
};

const TYPE_LABELS: Record<string, string> = {
  DIURNA: "Diurna",
  NOCTURNA: "Nocturna",
  DOMINICAL_FESTIVA_DIURNA: "Dominical/festiva diurna",
  DOMINICAL_FESTIVA_NOCTURNA: "Dominical/festiva nocturna",
};

const TYPE_SURCHARGE: Record<string, string> = {
  DIURNA: "25%",
  NOCTURNA: "75%",
  DOMINICAL_FESTIVA_DIURNA: "100%",
  DOMINICAL_FESTIVA_NOCTURNA: "150%",
};

const TYPE_STYLE: Record<string, string> = {
  DIURNA: "bg-[#DBEAFE] text-[#2563EB]",
  NOCTURNA: "bg-[#EDE9FE] text-[#6D28D9]",
  DOMINICAL_FESTIVA_DIURNA: "bg-[#FEF3C7] text-[#B45309]",
  DOMINICAL_FESTIVA_NOCTURNA: "bg-[#FEE2E2] text-[#DC2626]",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada", CANCELLED: "Cancelada",
};
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  APPROVED: "bg-[#DCFCE7] text-[#16A34A]",
  REJECTED: "bg-[#FEE2E2] text-[#DC2626]",
  CANCELLED: "bg-[#F1F5F9] text-[#64748B]",
};

const AVATAR_COLORS = [
  "bg-[#DCFCE7] text-[#16A34A]", "bg-[#DBEAFE] text-[#2563EB]", "bg-[#FEF3C7] text-[#B45309]",
  "bg-[#FCE7F3] text-[#BE185D]", "bg-[#EDE9FE] text-[#6D28D9]", "bg-[#E0F2FE] text-[#0369A1]",
];
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}
function avatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function fmt(d: string) {
  return fmtDateOnly(d);
}

export default function HorasExtrasRRHHPage() {
  const [requests, setRequests] = useState<OvertimeRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeId: "", date: "", startTime: "", endTime: "", overtimeType: "DIURNA", reason: "" });

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [recRes, empRes] = await Promise.all([
      fetch("/api/rrhh-local/overtime"),
      fetch("/api/rrhh-local/employees"),
    ]);
    if (recRes.ok) setRequests(await recRes.json());
    else setError("No fue posible cargar las horas extras");
    if (empRes.ok) setEmployees(await empRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
    fetch("/api/panel/permissions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setIsSuperAdmin(d.role === "SUPERADMIN"));
  }, []);

  useRealtimeRefresh(["timeoff"], load);

  const resolve = async (id: string, status: "APPROVED" | "REJECTED") => {
    let reviewNote: string | null = null;
    if (status === "REJECTED") {
      reviewNote = window.prompt("Motivo de rechazo:");
      if (!reviewNote?.trim()) return;
    }
    setBusyId(id);
    const res = await fetch(`/api/rrhh-local/overtime/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    if (res.ok) { setDetailId(null); await load(); } else setError("No fue posible resolver la solicitud");
    setBusyId(null);
  };

  const submit = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ employeeId: "", date: "", startTime: "", endTime: "", overtimeType: "DIURNA", reason: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible registrar la hora extra");
    }
    setSaving(false);
  };

  const exportCsv = () => {
    const header = ["Empleado", "Fecha", "Horario", "Horas", "Tipo", "Motivo", "Estado"];
    const rows = filtered.map((r) => [
      r.employee.user.fullName, fmt(r.date), `${r.startTime}-${r.endTime}`, r.hours.toFixed(1),
      TYPE_LABELS[r.overtimeType] ?? r.overtimeType, r.reason ?? "", STATUS_LABELS[r.status] ?? r.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horas-extras-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesSearch = !q || r.employee.user.fullName.toLowerCase().includes(q);
      const matchesType = typeFilter === "all" || r.overtimeType === typeFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [requests, search, typeFilter, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = requests.filter((r) => {
      const d = new Date(r.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalH = thisMonth.reduce((s, r) => s + r.hours, 0);
    const approvedH = thisMonth.filter((r) => r.status === "APPROVED").reduce((s, r) => s + r.hours, 0);
    const pendingH = thisMonth.filter((r) => r.status === "PENDING").reduce((s, r) => s + r.hours, 0);
    const pendingCount = thisMonth.filter((r) => r.status === "PENDING").length;
    const employeeCount = new Set(thisMonth.map((r) => r.employee.user.fullName)).size;
    return {
      totalH,
      approvedH,
      approvedPct: totalH ? Math.round((approvedH / totalH) * 100) : 0,
      pendingCount,
      pendingH,
      avg: employeeCount ? totalH / employeeCount : 0,
    };
  }, [requests]);

  const detail = requests.find((r) => r.id === detailId) ?? null;

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF8F6] text-2xl"><MdTimer /></span>
          <div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">Horas extras</h1>
            <p className="mt-1 text-sm text-[#6e7379]">Solicitudes de horas extras registradas por el personal.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setCreating(true); setError(""); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0C535B]"
        >
          + Nueva hora extra
        </button>
      </div>

      <p className="flex items-center gap-2 rounded-lg bg-[#EFF6FF] px-3 py-2.5 text-xs font-medium text-[#1D4ED8]">
        <MdInfo className="inline" />{" "}
        {isSuperAdmin
          ? "Como SUPERADMIN puedes aprobar o rechazar cualquier solicitud."
          : "Solo lectura: la aprobación o gestión de solicitudes la realiza el jefe directo de cada empleado."}
      </p>

      {error && !creating && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]"><MdSchedule /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.totalH.toFixed(1)}h</p>
            <p className="text-xs text-[#8b8d91]">Total horas extras</p>
            <p className="text-[11px] text-[#8b8d91]">Este mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]"><MdCheckCircle /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.approvedH.toFixed(1)}h</p>
            <p className="text-xs text-[#8b8d91]">Aprobadas</p>
            <p className="text-[11px] text-[#16A34A]">{kpis.approvedPct}% del total</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]"><MdHourglassEmpty /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.pendingCount}</p>
            <p className="text-xs text-[#8b8d91]">Pendientes</p>
            <p className="text-[11px] text-[#8b8d91]">{kpis.pendingH.toFixed(1)}h pendientes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]"><MdCalendarMonth /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.avg.toFixed(1)}h</p>
            <p className="text-xs text-[#8b8d91]">Promedio por empleado</p>
            <p className="text-[11px] text-[#8b8d91]">Este mes</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-black/8 bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
        <div className="relative flex-1 min-w-[200px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b8d91]"><MdSearch /></span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar empleado…"
            className="w-full rounded-full border border-black/10 bg-[#fafaf9] py-2.5 pl-9 pr-4 text-sm text-[#1f2328] outline-none focus:border-[#27B1B8]"
          />
        </div>
        <SimpleSelect
          value={typeFilter}
          options={[{ value: "all", label: "Todos los tipos" }, ...Object.keys(TYPE_LABELS).map((t) => ({ value: t, label: TYPE_LABELS[t] }))]}
          onChange={(v) => { setTypeFilter(v); setPage(1); }}
          className="w-52"
        />
        <SimpleSelect
          value={statusFilter}
          options={[
            { value: "all", label: "Todos los estados" },
            { value: "PENDING", label: "Pendiente" },
            { value: "APPROVED", label: "Aprobada" },
            { value: "REJECTED", label: "Rechazada" },
            { value: "CANCELLED", label: "Cancelada" },
          ]}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          className="w-44"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:text-[#0C535B]"
        >
          <MdFileDownload /> Exportar
        </button>
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Empleado</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Horario</th>
                <th className="p-4">Horas</th>
                <th className="p-4">Tipo</th>
                <th className="p-4">Motivo</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={8} className="p-10 text-center text-sm text-[#6e7379]">Sin solicitudes registradas.</td></tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(r.employee.user.fullName)}`}>
                          {initials(r.employee.user.fullName)}
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[#1f2328]">{r.employee.user.fullName}</p>
                          <p className="text-xs text-[#8b8d91]">{r.employee.jobTitle}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-[#5d6167]">{fmt(r.date)}</td>
                    <td className="p-4 text-[#5d6167]">{r.startTime} – {r.endTime}</td>
                    <td className="p-4 font-semibold text-[#1f2328]">{r.hours.toFixed(1)}h</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TYPE_STYLE[r.overtimeType] ?? ""}`}>
                        {TYPE_LABELS[r.overtimeType] ?? r.overtimeType}
                      </span>
                      <p className="mt-1 text-[11px] text-[#8b8d91]">{TYPE_SURCHARGE[r.overtimeType] ?? ""} recargo</p>
                    </td>
                    <td className="p-4 text-[#5d6167]">{r.reason ?? "—"}</td>
                    <td className="p-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] ?? ""}`}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="relative flex justify-end">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((id) => (id === r.id ? null : r.id))}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b8d91] hover:bg-[#f1f5f9]"
                        >
                          ⋮
                        </button>
                        {menuOpenId === r.id && (
                          <div className="absolute right-0 top-9 z-10 w-40 rounded-xl border border-black/8 bg-white py-1.5 shadow-lg">
                            <button
                              onClick={() => { setDetailId(r.id); setMenuOpenId(null); }}
                              className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#1f2328] hover:bg-[#f8fafc]"
                            >
                              Ver detalle
                            </button>
                            {isSuperAdmin && r.status === "PENDING" && (
                              <>
                                <button
                                  onClick={() => { resolve(r.id, "APPROVED"); setMenuOpenId(null); }}
                                  className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#16A34A] hover:bg-[#F0FDF4]"
                                >
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => { resolve(r.id, "REJECTED"); setMenuOpenId(null); }}
                                  className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
                                >
                                  Rechazar
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-4 py-3 text-sm text-[#6e7379]">
          <span>
            Mostrando {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de {filtered.length} registros
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">‹</button>
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#0C535B] px-2 text-xs font-semibold text-white">{page}</span>
            <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">›</button>
          </div>
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">Nueva hora extra</h3>
              <button onClick={() => setCreating(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SimpleSelect
                value={form.employeeId}
                options={[
                  { value: "", label: "Selecciona empleado…" },
                  ...employees.map((e) => ({ value: e.id, label: `${e.user.fullName} (${e.employeeCode})` })),
                ]}
                onChange={(v) => setForm({ ...form, employeeId: v })}
              />
              <SimpleSelect
                value={form.overtimeType}
                options={Object.keys(TYPE_LABELS).map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
                onChange={(v) => setForm({ ...form, overtimeType: v })}
              />
              <input type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <input type="time" value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                <input type="time" value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              </div>
              <input placeholder="Motivo (opcional)" value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="col-span-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button
                onClick={submit}
                disabled={saving || !form.employeeId || !form.date || !form.startTime || !form.endTime}
                className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">Detalle de la solicitud</h3>
              <button onClick={() => setDetailId(null)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold text-[#64748B]">Empleado:</span> {detail.employee.user.fullName}</p>
              <p><span className="font-semibold text-[#64748B]">Fecha:</span> {fmt(detail.date)}</p>
              <p><span className="font-semibold text-[#64748B]">Horario:</span> {detail.startTime} – {detail.endTime}</p>
              <p><span className="font-semibold text-[#64748B]">Horas:</span> {detail.hours.toFixed(1)}h</p>
              <p><span className="font-semibold text-[#64748B]">Tipo:</span> {TYPE_LABELS[detail.overtimeType] ?? detail.overtimeType}</p>
              <p><span className="font-semibold text-[#64748B]">Motivo:</span> {detail.reason ?? "—"}</p>
              <p><span className="font-semibold text-[#64748B]">Estado:</span> {STATUS_LABELS[detail.status] ?? detail.status}</p>
              {detail.reviewNote && <p><span className="font-semibold text-[#64748B]">Nota del jefe:</span> {detail.reviewNote}</p>}
            </div>
            {isSuperAdmin && detail.status === "PENDING" && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => resolve(detail.id, "REJECTED")}
                  disabled={busyId === detail.id}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => resolve(detail.id, "APPROVED")}
                  disabled={busyId === detail.id}
                  className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
                >
                  {busyId === detail.id ? "Guardando…" : "Aprobar"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
