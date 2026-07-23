"use client";
import { useEffect, useMemo, useState } from "react";
import { SimpleSelect } from "../../_components/simple-select";
import { fmtDateOnly } from "@/lib/date";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { MdBeachAccess, MdWbSunny, MdCalendarMonth, MdSearch, MdFileDownload, MdMoreVert, MdClose } from "react-icons/md";

type TimeOffRequestRow = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string | null;
  reviewNote: string | null;
  employee: { employeeCode: string; jobTitle: string; user: { fullName: string } };
};

type EmployeeOption = { id: string; employeeCode: string; jobTitle: string; user: { fullName: string } };

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

export default function VacacionesPage() {
  const [requests, setRequests] = useState<TimeOffRequestRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeId: "", startDate: "", endDate: "", reason: "" });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [reqRes, empRes] = await Promise.all([
      fetch("/api/rrhh-local/time-off"),
      fetch("/api/rrhh-local/employees"),
    ]);
    if (reqRes.ok) {
      const all: TimeOffRequestRow[] = await reqRes.json();
      setRequests(all.filter((r) => r.type === "VACATION"));
    } else {
      setError("No fue posible cargar las solicitudes de vacaciones");
    }
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

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/rrhh-local/time-off/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    if (res.ok) { setDetailId(null); await load(); } else setError("No fue posible aprobar la solicitud");
    setBusyId(null);
  };

  const confirmReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    setBusyId(rejectingId);
    const res = await fetch(`/api/rrhh-local/time-off/${rejectingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED", reviewNote: rejectReason.trim() }),
    });
    if (res.ok) { setRejectingId(null); setRejectReason(""); setDetailId(null); await load(); }
    else setError("No fue posible rechazar la solicitud");
    setBusyId(null);
  };

  const submit = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, type: "VACATION" }),
    });
    if (res.ok) {
      setForm({ employeeId: "", startDate: "", endDate: "", reason: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible crear la solicitud");
    }
    setSaving(false);
  };

  const exportCsv = () => {
    const header = ["Empleado", "Desde", "Hasta", "Dias", "Motivo", "Estado"];
    const rows = filtered.map((r) => [
      r.employee.user.fullName, fmt(r.startDate), fmt(r.endDate), String(r.durationDays), r.reason ?? "", STATUS_LABELS[r.status] ?? r.status,
    ]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vacaciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      const matchesSearch = !q || r.employee.user.fullName.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, search, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  if (loading) return <div className="p-6">Cargando…</div>;

  const now = new Date();
  const pending = requests.filter((r) => r.status === "PENDING");
  const active = requests.filter(
    (r) => r.status === "APPROVED" && new Date(r.startDate) <= now && new Date(r.endDate) >= now,
  );
  const upcoming = requests
    .filter((r) => r.status === "APPROVED" && new Date(r.startDate) > now)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  const detail = requests.find((r) => r.id === detailId) ?? null;

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF8F6] text-2xl"><MdBeachAccess /></span>
          <div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">Vacaciones</h1>
            <p className="mt-1 text-sm text-[#6e7379]">Solicitudes y consulta de vacaciones de todos los colaboradores.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setCreating(true); setError(""); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0C535B]"
        >
          + Nueva solicitud
        </button>
      </div>

      <p className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
        {isSuperAdmin
          ? "Como SUPERADMIN puedes aprobar o rechazar cualquier solicitud."
          : "Solo lectura: la aprobación la gestiona el jefe directo de cada empleado."}
      </p>

      {error && !creating && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]"><MdCalendarMonth /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{pending.length}</p>
            <p className="text-xs text-[#8b8d91]">Pendientes de aprobar</p>
            <p className="text-[11px] text-[#8b8d91]">Solicitudes en espera</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]"><MdWbSunny /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{active.length}</p>
            <p className="text-xs text-[#8b8d91]">En vacaciones ahora</p>
            <p className="text-[11px] text-[#8b8d91]">Colaboradores</p>
          </div>
        </div>
        <div className="rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]"><MdCalendarMonth /></span>
            <p className="text-xs text-[#8b8d91]">Próximas vacaciones</p>
          </div>
          {upcoming.length === 0 ? (
            <p className="mt-2 text-sm text-[#94A3B8]">Ninguna programada.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#1f2328]">{r.employee.user.fullName}</span>
                  <span className="text-[#8b8d91]">{fmt(r.startDate)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-black/8 bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
        <div className="relative flex-1 min-w-[220px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b8d91]"><MdSearch /></span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar empleado…"
            className="w-full rounded-full border border-black/10 bg-[#fafaf9] py-2.5 pl-9 pr-4 text-sm text-[#1f2328] outline-none focus:border-[#27B1B8]"
          />
        </div>
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
          className="w-48"
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
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Empleado</th>
                <th className="p-4">Desde</th>
                <th className="p-4">Hasta</th>
                <th className="p-4">Días</th>
                <th className="p-4">Motivo</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-sm text-[#6e7379]">Sin solicitudes de vacaciones.</td></tr>
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
                    <td className="p-4 text-[#5d6167]">{fmt(r.startDate)}</td>
                    <td className="p-4 text-[#5d6167]">{fmt(r.endDate)}</td>
                    <td className="p-4 text-[#5d6167]">{r.durationDays}</td>
                    <td className="p-4 text-[#5d6167]">
                      {r.status === "REJECTED" && r.reviewNote
                        ? <span className="text-[#DC2626]">Rechazada: {r.reviewNote}</span>
                        : r.reason ?? "—"}
                    </td>
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
                                  onClick={() => { approve(r.id); setMenuOpenId(null); }}
                                  className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#16A34A] hover:bg-[#F0FDF4]"
                                >
                                  Aprobar
                                </button>
                                <button
                                  onClick={() => { setRejectingId(r.id); setRejectReason(""); setMenuOpenId(null); }}
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
            Mostrando {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de {filtered.length} solicitudes
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
              <h3 className="font-black text-[#1A1A1A]">Nueva solicitud de vacaciones</h3>
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
              <div />
              <input type="date" value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input type="date" value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Motivo (opcional)" value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="col-span-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button
                onClick={submit}
                disabled={saving || !form.employeeId || !form.startDate || !form.endDate}
                className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">Detalle de solicitud</h3>
              <button onClick={() => setDetailId(null)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            <div className="space-y-2 text-sm">
              <p><span className="font-semibold text-[#64748B]">Empleado:</span> {detail.employee.user.fullName}</p>
              <p><span className="font-semibold text-[#64748B]">Cargo:</span> {detail.employee.jobTitle}</p>
              <p><span className="font-semibold text-[#64748B]">Desde:</span> {fmt(detail.startDate)}</p>
              <p><span className="font-semibold text-[#64748B]">Hasta:</span> {fmt(detail.endDate)}</p>
              <p><span className="font-semibold text-[#64748B]">Días:</span> {detail.durationDays}</p>
              <p><span className="font-semibold text-[#64748B]">Motivo:</span> {detail.reason ?? "—"}</p>
              <p><span className="font-semibold text-[#64748B]">Estado:</span> {STATUS_LABELS[detail.status] ?? detail.status}</p>
              {detail.reviewNote && <p><span className="font-semibold text-[#64748B]">Nota del jefe:</span> {detail.reviewNote}</p>}
            </div>
            {isSuperAdmin && detail.status === "PENDING" && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setRejectingId(detail.id)}
                  disabled={busyId === detail.id}
                  className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
                >
                  Rechazar
                </button>
                <button
                  onClick={() => approve(detail.id)}
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

      {rejectingId && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">Motivo de rechazo</h3>
              <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            <input
              placeholder="Motivo del rechazo"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm"
            />
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setRejectingId(null); setRejectReason(""); }} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button
                onClick={confirmReject}
                disabled={busyId === rejectingId || !rejectReason.trim()}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
              >
                {busyId === rejectingId ? "Guardando…" : "Confirmar rechazo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
