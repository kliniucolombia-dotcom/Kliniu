"use client";
import { useEffect, useMemo, useState } from "react";
import { SimpleSelect } from "../../_components/simple-select";
import { fmtDateOnly } from "@/lib/date";
import { MdEventNote, MdGroup, MdCheckCircle, MdSchedule, MdCalendarMonth, MdSearch, MdFileDownload, MdMoreVert, MdClose } from "react-icons/md";

type EmployeeOption = { id: string; employeeCode: string; jobTitle: string; user: { fullName: string } };

type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  note: string | null;
  checkIn: string | null;
  checkOut: string | null;
  employee: { employeeCode: string; jobTitle: string; user: { fullName: string } };
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  LATE: "Tarde",
};

const STATUS_STYLE: Record<string, string> = {
  PRESENT: "bg-[#DCFCE7] text-[#16A34A]",
  ABSENT: "bg-[#FEE2E2] text-[#DC2626]",
  LATE: "bg-[#FEF3C7] text-[#B45309]",
};

const STATUS_DOT: Record<string, string> = {
  PRESENT: "bg-[#16A34A]",
  ABSENT: "bg-[#DC2626]",
  LATE: "bg-[#B45309]",
};

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "LATE"] as const;

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

export default function AsistenciaPage() {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    status: "PRESENT" as (typeof STATUS_OPTIONS)[number],
    checkIn: "",
    checkOut: "",
    note: "",
  });

  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const load = async () => {
    setLoading(true);
    const [recRes, empRes] = await Promise.all([
      fetch("/api/rrhh-local/attendance"),
      fetch("/api/rrhh-local/employees"),
    ]);
    if (recRes.ok) setRecords(await recRes.json());
    else setError("No fue posible cargar la asistencia");
    if (empRes.ok) setEmployees(await empRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ ...form, checkIn: "", checkOut: "", note: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible registrar la asistencia");
    }
    setSaving(false);
  };

  const changeStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/rrhh-local/attendance/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  };

  const removeRecord = async (id: string) => {
    if (!confirm("¿Eliminar este registro de asistencia?")) return;
    await fetch(`/api/rrhh-local/attendance/${id}`, { method: "DELETE" });
    await load();
  };

  const exportCsv = () => {
    const header = ["Fecha", "Empleado", "Estado", "Entrada", "Salida", "Nota"];
    const rows = filtered.map((r) => [fmt(r.date), r.employee.user.fullName, STATUS_LABELS[r.status] ?? r.status, r.checkIn ?? "", r.checkOut ?? "", r.note ?? ""]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `asistencia-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchesDate = !dateFilter || r.date.slice(0, 10) === dateFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesSearch = !q || r.employee.user.fullName.toLowerCase().includes(q);
      return matchesDate && matchesStatus && matchesSearch;
    });
  }, [records, dateFilter, statusFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const today = new Date().toISOString().slice(0, 10);
  const kpis = useMemo(() => {
    const todays = records.filter((r) => r.date.slice(0, 10) === today);
    const present = todays.filter((r) => r.status === "PRESENT").length;
    return {
      registered: todays.length,
      present,
      rate: todays.length ? Math.round((present / todays.length) * 100) : 0,
      total: records.length,
    };
  }, [records, today]);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF8F6] text-2xl"><MdEventNote /></span>
          <div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">Asistencia</h1>
            <p className="mt-1 text-sm text-[#6e7379]">Registro diario de asistencia por empleado — datos reales de Kliniu.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setCreating(true); setError(""); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0C535B]"
        >
          + Registrar asistencia
        </button>
      </div>

      {error && !creating && <p className="text-sm text-red-500">{error}</p>}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]"><MdGroup /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.registered}</p>
            <p className="text-xs text-[#8b8d91]">Empleados registrados</p>
            <p className="text-[11px] text-[#8b8d91]">Hoy</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]"><MdCheckCircle /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.present}</p>
            <p className="text-xs text-[#8b8d91]">Presentes</p>
            <p className="text-[11px] text-[#16A34A]">{kpis.rate}% del total</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]"><MdSchedule /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.rate}%</p>
            <p className="text-xs text-[#8b8d91]">Tasa de asistencia</p>
            <p className="text-[11px] text-[#8b8d91]">Hoy</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]"><MdCalendarMonth /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.total}</p>
            <p className="text-xs text-[#8b8d91]">Registros totales</p>
            <p className="text-[11px] text-[#8b8d91]">Histórico</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-black/8 bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          className="rounded-full border border-black/10 bg-[#fafaf9] px-4 py-2.5 text-sm text-[#1f2328] outline-none focus:border-[#27B1B8]"
        />
        <SimpleSelect
          value={statusFilter}
          options={[
            { value: "all", label: "Todos los estados" },
            ...STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] })),
          ]}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          className="w-48"
        />
        <div className="relative flex-1 min-w-[200px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b8d91]"><MdSearch /></span>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Buscar empleado…"
            className="w-full rounded-full border border-black/10 bg-[#fafaf9] py-2.5 pl-9 pr-4 text-sm text-[#1f2328] outline-none focus:border-[#27B1B8]"
          />
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="ml-auto inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:text-[#0C535B]"
        >
          <MdFileDownload /> Exportar
        </button>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Fecha</th>
                <th className="p-4">Empleado</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Entrada</th>
                <th className="p-4">Salida</th>
                <th className="p-4">Notas</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-sm text-[#6e7379]">Sin registros de asistencia todavía.</td></tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                    <td className="p-4">
                      <p className="font-semibold text-[#1f2328]">{fmt(r.date)}</p>
                    </td>
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
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] ?? ""}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status] ?? "bg-[#94A3B8]"}`} />
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="p-4 text-[#5d6167]">{r.checkIn ?? "—"}</td>
                    <td className="p-4 text-[#5d6167]">{r.checkOut ?? "—"}</td>
                    <td className="p-4 text-[#5d6167]">{r.note ?? "—"}</td>
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
                          <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-black/8 bg-white py-1.5 shadow-lg">
                            {STATUS_OPTIONS.filter((s) => s !== r.status).map((s) => (
                              <button
                                key={s}
                                onClick={() => { changeStatus(r.id, s); setMenuOpenId(null); }}
                                className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#1f2328] hover:bg-[#f8fafc]"
                              >
                                Marcar {STATUS_LABELS[s].toLowerCase()}
                              </button>
                            ))}
                            <button
                              onClick={() => { removeRecord(r.id); setMenuOpenId(null); }}
                              className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
                            >
                              Eliminar
                            </button>
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
              <h3 className="font-black text-[#1A1A1A]">Registrar asistencia</h3>
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
              <input type="date" value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <SimpleSelect
                value={form.status}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                onChange={(v) => setForm({ ...form, status: v as typeof form.status })}
              />
              <input type="time" placeholder="Entrada" value={form.checkIn}
                onChange={(e) => setForm({ ...form, checkIn: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input type="time" placeholder="Salida" value={form.checkOut}
                onChange={(e) => setForm({ ...form, checkOut: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Nota (opcional)" value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="col-span-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button onClick={submit} disabled={saving || !form.employeeId} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
