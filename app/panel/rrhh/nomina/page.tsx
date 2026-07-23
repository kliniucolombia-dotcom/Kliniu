"use client";
import { useEffect, useMemo, useState } from "react";
import { MdAttachFile, MdDownload, MdPictureAsPdf, MdTableChart, MdAttachMoney, MdGroup, MdDescription, MdCalendarMonth, MdSearch, MdFileDownload, MdFileUpload, MdMoreVert, MdClose } from "react-icons/md";
import { SimpleSelect } from "../../_components/simple-select";

type EmployeeRow = {
  id: string;
  userId: string;
  employeeCode: string;
  jobTitle: string;
  status: string;
  departmentId: string | null;
  salaryAmount: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  user: { fullName: string };
  department: { name: string } | null;
};

type DepartmentOption = { id: string; name: string };

type Payslip = {
  id: string;
  period: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  fileUrl: string | null;
  employeeId: string;
  employee: { employeeCode: string; user: { fullName: string } };
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  ON_LEAVE: "En licencia",
  TERMINATED: "Retirado",
};

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-[#DCFCE7] text-[#16A34A]",
  ON_LEAVE: "bg-[#FEF3C7] text-[#B45309]",
  TERMINATED: "bg-[#F1F5F9] text-[#64748B]",
};

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "Mensual",
  BIWEEKLY: "Quincenal",
  HOURLY: "Por hora",
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

function formatMoney(amount: number, currency = "COP") {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function nextPayrollDate() {
  const now = new Date();
  const day = 15;
  const candidate = new Date(now.getFullYear(), now.getMonth(), day);
  if (now.getDate() >= day) candidate.setMonth(candidate.getMonth() + 1);
  return candidate.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function NominaPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeId: "", period: "", grossAmount: "", deductions: "", filePath: "", fileName: "" });

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [periodFilter, setPeriodFilter] = useState("all");
  const [payslipsOpenFor, setPayslipsOpenFor] = useState<EmployeeRow | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const load = async () => {
    setLoading(true);
    const [empRes, deptRes, paySlipRes] = await Promise.all([
      fetch("/api/rrhh-local/employees"),
      fetch("/api/rrhh-local/departments"),
      fetch("/api/rrhh-local/payslips"),
    ]);
    if (empRes.ok) setRows(await empRes.json());
    else setError("No fue posible cargar los empleados");
    if (deptRes.ok) setDepartments(await deptRes.json());
    if (paySlipRes.ok) setPayslips(await paySlipRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const uploadFile = async (file: File) => {
    const employee = rows.find((e) => e.id === form.employeeId);
    if (!employee) return setError("Selecciona el empleado primero");
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/rrhh-local/time-off/upload?forUserId=${employee.userId}`, { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok) setForm((f) => ({ ...f, filePath: data.path, fileName: data.name }));
    else setError(data.error || "No fue posible subir el archivo");
  };

  const view = async (fileUrl: string) => {
    const res = await fetch(`/api/rrhh-local/time-off/upload?path=${encodeURIComponent(fileUrl)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.open(data.url, "_blank");
    else setError(data.error || "No fue posible abrir el desprendible");
  };

  const submit = async () => {
    setError("");
    const gross = Number(form.grossAmount);
    const ded = Number(form.deductions);
    if (!form.employeeId || !form.period.trim() || !gross || Number.isNaN(ded)) {
      return setError("Empleado, periodo, devengado y deducciones son obligatorios");
    }
    setSaving(true);
    const res = await fetch("/api/rrhh-local/payslips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: form.employeeId,
        period: form.period.trim(),
        grossAmount: gross,
        deductions: ded,
        fileUrl: form.filePath || null,
        fileName: form.fileName || null,
      }),
    });
    if (res.ok) {
      setForm({ employeeId: "", period: "", grossAmount: "", deductions: "", filePath: "", fileName: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible crear el desprendible");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar este desprendible?")) return;
    const res = await fetch(`/api/rrhh-local/payslips/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const exportCsv = () => {
    const header = ["Codigo", "Nombre", "Cargo", "Estado", "Salario base", "Periodicidad"];
    const rowsCsv = filtered.map((r) => [
      r.employeeCode, r.user.fullName, r.jobTitle, STATUS_LABELS[r.status] ?? r.status,
      String(r.salaryAmount ?? ""), PERIOD_LABELS[r.salaryPeriod] ?? r.salaryPeriod,
    ]);
    const csv = [header, ...rowsCsv].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nomina-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q || r.user.fullName.toLowerCase().includes(q) || r.employeeCode.toLowerCase().includes(q);
      const matchesDept = deptFilter === "all" || r.departmentId === deptFilter;
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesPeriod = periodFilter === "all" || r.salaryPeriod === periodFilter;
      return matchesSearch && matchesDept && matchesStatus && matchesPeriod;
    });
  }, [rows, search, deptFilter, statusFilter, periodFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const kpis = useMemo(() => {
    const now = new Date();
    const active = rows.filter((r) => r.status === "ACTIVE");
    const totalBase = active.reduce((s, r) => s + (r.salaryAmount ?? 0), 0);
    const thisMonthSlips = payslips.filter((p) => p.period === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    return {
      activeCount: active.length,
      totalBase,
      slipsThisMonth: thisMonthSlips.length || payslips.length,
      nextDate: nextPayrollDate(),
    };
  }, [rows, payslips]);

  const employeePayslips = payslipsOpenFor ? payslips.filter((p) => p.employeeId === payslipsOpenFor.id) : [];

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF8F6] text-2xl"><MdAttachMoney /></span>
          <div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">Nómina</h1>
            <p className="mt-1 text-sm text-[#6e7379]">Salario base vigente por empleado y desprendibles de pago publicados.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setCreating(true); setError(""); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0C535B]"
        >
          <MdFileUpload /> Subir desprendible
        </button>
      </div>

      {error && !creating && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]"><MdGroup /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.activeCount}</p>
            <p className="text-xs text-[#8b8d91]">Empleados activos</p>
            <p className="text-[11px] text-[#8b8d91]">Este mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]"><MdAttachMoney /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{formatMoney(kpis.totalBase)}</p>
            <p className="text-xs text-[#8b8d91]">Total salario base</p>
            <p className="text-[11px] text-[#16A34A]">Total mensual</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]"><MdDescription /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.slipsThisMonth}</p>
            <p className="text-xs text-[#8b8d91]">Desprendibles publicados</p>
            <p className="text-[11px] text-[#8b8d91]">Este mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]"><MdCalendarMonth /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.nextDate}</p>
            <p className="text-xs text-[#8b8d91]">Próxima nómina</p>
            <p className="text-[11px] text-[#B45309]">Fecha estimada</p>
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
          value={deptFilter}
          options={[{ value: "all", label: "Todos los departamentos" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
          onChange={(v) => { setDeptFilter(v); setPage(1); }}
          className="w-52"
        />
        <SimpleSelect
          value={statusFilter}
          options={[
            { value: "all", label: "Todos los estados" },
            { value: "ACTIVE", label: "Activos" },
            { value: "ON_LEAVE", label: "En licencia" },
            { value: "TERMINATED", label: "Retirados" },
          ]}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          className="w-44"
        />
        <SimpleSelect
          value={periodFilter}
          options={[
            { value: "all", label: "Toda periodicidad" },
            { value: "MONTHLY", label: "Mensual" },
            { value: "BIWEEKLY", label: "Quincenal" },
            { value: "HOURLY", label: "Por hora" },
          ]}
          onChange={(v) => { setPeriodFilter(v); setPage(1); }}
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
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Código</th>
                <th className="p-4">Nombre</th>
                <th className="p-4">Cargo</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Salario base</th>
                <th className="p-4">Periodicidad</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={7} className="p-10 text-center text-sm text-[#6e7379]">Sin empleados registrados todavía.</td></tr>
              ) : (
                paged.map((r) => (
                  <tr key={r.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                    <td className="p-4 font-mono text-xs text-[#5d6167]">{r.employeeCode}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(r.user.fullName)}`}>
                          {initials(r.user.fullName)}
                        </span>
                        <span className="font-semibold text-[#1f2328]">{r.user.fullName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[#5d6167]">{r.jobTitle}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[r.status] ?? ""}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="p-4 font-semibold text-[#1f2328]">{r.salaryAmount != null ? formatMoney(r.salaryAmount, r.salaryCurrency) : "—"}</td>
                    <td className="p-4 text-[#5d6167]">{PERIOD_LABELS[r.salaryPeriod] ?? r.salaryPeriod}</td>
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
                          <div className="absolute right-0 top-9 z-10 w-48 rounded-xl border border-black/8 bg-white py-1.5 shadow-lg">
                            <button
                              onClick={() => { setPayslipsOpenFor(r); setMenuOpenId(null); }}
                              className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#1f2328] hover:bg-[#f8fafc]"
                            >
                              Ver desprendibles ({payslips.filter((p) => p.employeeId === r.id).length})
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
            Mostrando {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de {filtered.length} empleados
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
              <h3 className="font-black text-[#1A1A1A]">Subir desprendible</h3>
              <button onClick={() => setCreating(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SimpleSelect
                value={form.employeeId}
                options={[
                  { value: "", label: "Selecciona empleado…" },
                  ...rows.map((e) => ({ value: e.id, label: `${e.user.fullName} (${e.employeeCode})` })),
                ]}
                onChange={(v) => setForm({ ...form, employeeId: v })}
              />
              <input placeholder="Periodo (ej. 2026-07)" value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input type="number" placeholder="Devengado" value={form.grossAmount}
                onChange={(e) => setForm({ ...form, grossAmount: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input type="number" placeholder="Deducciones" value={form.deductions}
                onChange={(e) => setForm({ ...form, deductions: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <div className="col-span-full flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#64748B] hover:border-[#27B1B8]">
                  <MdAttachFile size={16} />
                  {uploading ? "Subiendo…" : "Adjuntar PDF (opcional)"}
                  <input type="file" className="hidden" accept="application/pdf"
                    onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </label>
                {form.fileName && <span className="text-xs text-[#16A34A]">{form.fileName}</span>}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button onClick={submit} disabled={saving || uploading} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {payslipsOpenFor && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">Desprendibles de {payslipsOpenFor.user.fullName}</h3>
              <button onClick={() => setPayslipsOpenFor(null)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            {employeePayslips.length > 0 && (
              <button onClick={exportCsv} className="mb-3 flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#16A34A] hover:bg-[#F0FDF4]">
                <MdTableChart size={14} /> Descargar Excel
              </button>
            )}
            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
                    <th className="p-3">Periodo</th>
                    <th className="p-3">Devengado</th>
                    <th className="p-3">Deducciones</th>
                    <th className="p-3">Neto</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employeePayslips.map((p) => (
                    <tr key={p.id} className="border-b border-[#F1F5F9]">
                      <td className="p-3 font-bold text-[#1A1A1A]">{p.period}</td>
                      <td className="p-3">{formatMoney(p.grossAmount)}</td>
                      <td className="p-3 text-[#DC2626]">-{formatMoney(p.deductions)}</td>
                      <td className="p-3 font-bold text-[#16A34A]">{formatMoney(p.netAmount)}</td>
                      <td className="p-3">
                        <div className="flex gap-3">
                          {p.fileUrl && (
                            <button onClick={() => view(p.fileUrl!)} className="flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
                              <MdDownload size={14} /> Ver
                            </button>
                          )}
                          <a href={`/nomina/desprendible/${p.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs font-bold text-[#B45309] hover:underline">
                            <MdPictureAsPdf size={14} /> PDF
                          </a>
                          <button onClick={() => remove(p.id)} className="text-xs font-bold text-[#DC2626] hover:underline">Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {employeePayslips.length === 0 && (
                    <tr><td className="p-3 text-[#94A3B8]" colSpan={5}>Sin desprendibles publicados.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
