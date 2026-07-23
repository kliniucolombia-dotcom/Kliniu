"use client";
import { useEffect, useMemo, useState } from "react";
import { SimpleSelect } from "../../_components/simple-select";
import { fmtDateOnly } from "@/lib/date";
import { MdSearch, MdBusiness, MdAttachMoney, MdCalendarToday, MdClose, MdFileDownload, MdRefresh, MdMoreVert, MdGroup } from "react-icons/md";

type EmployeeRow = {
  id: string;
  employeeCode: string;
  jobTitle: string;
  status: string;
  hireDate: string;
  salaryAmount: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  managerId: string | null;
  site: string | null;
  departmentId: string | null;
  user: { fullName: string; email: string };
  department: { name: string } | null;
};

type DepartmentOption = { id: string; name: string };

const CONTRACT_TYPES = [
  "INDEFINITE",
  "FIXED_TERM",
  "WORK_OR_LABOR",
  "APPRENTICESHIP",
  "TEMPORARY",
  "CIVIL",
] as const;

const SALARY_PERIODS = ["MONTHLY", "BIWEEKLY", "HOURLY"] as const;

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

const STATUS_DOT: Record<string, string> = {
  ACTIVE: "bg-[#16A34A]",
  ON_LEAVE: "bg-[#B45309]",
  TERMINATED: "bg-[#94A3B8]",
};

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "Mensual",
  BIWEEKLY: "Quincenal",
  HOURLY: "Por hora",
};

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINITE: "Indefinido",
  FIXED_TERM: "Término fijo",
  WORK_OR_LABOR: "Obra o labor",
  APPRENTICESHIP: "Aprendizaje",
  TEMPORARY: "Temporal",
  CIVIL: "Civil",
};

const AVATAR_COLORS = [
  "bg-[#DCFCE7] text-[#16A34A]",
  "bg-[#DBEAFE] text-[#2563EB]",
  "bg-[#FEF3C7] text-[#B45309]",
  "bg-[#FCE7F3] text-[#BE185D]",
  "bg-[#EDE9FE] text-[#6D28D9]",
  "bg-[#E0F2FE] text-[#0369A1]",
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

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

function tenureYears(hireDate: string) {
  const ms = Date.now() - new Date(hireDate).getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push("...");
    result.push(p);
  });
  return result;
}

const initialForm = {
  fullName: "",
  email: "",
  cedula: "",
  jobTitle: "",
  departmentId: "",
  managerId: "",
  contractType: "INDEFINITE" as (typeof CONTRACT_TYPES)[number],
  hireDate: new Date().toISOString().slice(0, 10),
  salaryAmount: "",
  salaryPeriod: "MONTHLY" as (typeof SALARY_PERIODS)[number],
  eps: "",
  afp: "",
  arl: "",
};

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter, setDeptFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [empRes, deptRes] = await Promise.all([
      fetch("/api/rrhh-local/employees"),
      fetch("/api/rrhh-local/departments"),
    ]);
    if (empRes.ok) setEmployees(await empRes.json());
    else setError("No fue posible cargar los empleados");
    if (deptRes.ok) setDepartments(await deptRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/rrhh-local/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          cedula: form.cedula,
          jobTitle: form.jobTitle,
          departmentId: form.departmentId || undefined,
          managerId: form.managerId || undefined,
          contractType: form.contractType,
          hireDate: form.hireDate,
          salaryAmount: form.salaryAmount ? Number(form.salaryAmount) : undefined,
          salaryPeriod: form.salaryPeriod,
          eps: form.eps || undefined,
          afp: form.afp || undefined,
          arl: form.arl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No fue posible crear el empleado");
      }
      setForm(initialForm);
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear empleado");
    } finally {
      setSaving(false);
    }
  };

  const updateEmployee = async (id: string, data: { managerId?: string | null; site?: string | null; status?: string }) => {
    setError("");
    const res = await fetch(`/api/rrhh-local/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) await load();
    else {
      const payload = await res.json().catch(() => ({}));
      setError(payload.error || "No fue posible actualizar el empleado");
    }
  };

  const exportCsv = () => {
    const header = ["Codigo", "Nombre", "Cargo", "Departamento", "Jefe", "Sede", "Estado", "Salario", "Fecha de ingreso"];
    const rows = filtered.map((e) => [
      e.employeeCode,
      e.user.fullName,
      e.jobTitle,
      e.department?.name ?? "",
      employees.find((m) => m.id === e.managerId)?.user.fullName ?? "",
      e.site ?? "",
      STATUS_LABELS[e.status] ?? e.status,
      String(e.salaryAmount ?? ""),
      fmtDateOnly(e.hireDate),
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `empleados-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesSearch =
        !q ||
        e.user.fullName.toLowerCase().includes(q) ||
        e.employeeCode.toLowerCase().includes(q) ||
        e.jobTitle.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || e.status === statusFilter;
      const matchesDept = deptFilter === "all" || e.departmentId === deptFilter;
      return matchesSearch && matchesStatus && matchesDept;
    });
  }, [employees, search, statusFilter, deptFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter, deptFilter, perPage]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const kpis = useMemo(() => {
    const active = employees.filter((e) => e.status === "ACTIVE");
    const withSalary = employees.filter((e) => e.salaryAmount != null);
    const avgSalary = withSalary.length
      ? withSalary.reduce((s, e) => s + (e.salaryAmount ?? 0), 0) / withSalary.length
      : 0;
    const avgTenure = employees.length
      ? employees.reduce((s, e) => s + tenureYears(e.hireDate), 0) / employees.length
      : 0;
    const deptCount = new Set(employees.filter((e) => e.departmentId).map((e) => e.departmentId)).size;
    return {
      total: employees.length,
      active: active.length,
      deptCount,
      avgSalary,
      avgTenure,
    };
  }, [employees]);

  const hasFilters = search || statusFilter !== "all" || deptFilter !== "all";
  const filterCount = [search, statusFilter !== "all", deptFilter !== "all"].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setDeptFilter("all"); };

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1A1A1A]">Empleados</h1>
          <p className="mt-1 text-sm text-[#6e7379]">Gestiona la información y consulta de todos los colaboradores de la empresa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b8d91]"><MdSearch /></span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar empleado…"
              className="w-64 rounded-full border border-black/10 bg-white py-2.5 pl-9 pr-4 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:text-[#0C535B]"
          >
            Filtros {filterCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0C535B] px-1 text-[11px] font-bold text-white">{filterCount}</span>}
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:text-[#0C535B]"
          >
            <MdFileDownload /> Exportar
          </button>
          <button
            type="button"
            onClick={() => { setCreating(true); setForm(initialForm); setError(""); }}
            className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0C535B]"
          >
            + Nuevo empleado
          </button>
        </div>
      </div>

      {error && !creating && <p className="text-sm text-red-500">{error}</p>}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]"><MdGroup /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.total}</p>
            <p className="text-xs text-[#8b8d91]">Total empleados</p>
            <p className="text-[11px] text-[#8b8d91]">{kpis.active} Activos</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]"><MdBusiness /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.deptCount}</p>
            <p className="text-xs text-[#8b8d91]">Departamentos</p>
            <p className="text-[11px] text-[#8b8d91]">Áreas</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]"><MdAttachMoney /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{formatMoney(kpis.avgSalary, "COP")}</p>
            <p className="text-xs text-[#8b8d91]">Salario promedio</p>
            <p className="text-[11px] text-[#8b8d91]">Mensual</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]"><MdCalendarToday /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.avgTenure.toFixed(1)} años</p>
            <p className="text-xs text-[#8b8d91]">Antigüedad promedio</p>
            <p className="text-[11px] text-[#8b8d91]">En la empresa</p>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="rounded-[1.75rem] border border-black/8 bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8b8d91]">Estado</label>
              <SimpleSelect
                value={statusFilter}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "ACTIVE", label: "Activo" },
                  { value: "ON_LEAVE", label: "En licencia" },
                  { value: "TERMINATED", label: "Retirado" },
                ]}
                onChange={setStatusFilter}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-[#8b8d91]">Departamento</label>
              <SimpleSelect
                value={deptFilter}
                options={[{ value: "all", label: "Todos" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
                onChange={setDeptFilter}
              />
            </div>
          </div>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="mt-3 text-sm font-semibold text-[#27B1B8] hover:underline">
              <MdRefresh /> Limpiar filtros
            </button>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Código</th>
                <th className="p-4">Nombre</th>
                <th className="p-4">Cargo</th>
                <th className="p-4">Departamento</th>
                <th className="p-4">Jefe inmediato</th>
                <th className="p-4">Sede</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Salario</th>
                <th className="p-4">Fecha de ingreso</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={10} className="p-10 text-center text-sm text-[#6e7379]">Ningún empleado coincide con los filtros.</td></tr>
              ) : (
                paged.map((e) => (
                  <tr key={e.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                    <td className="p-4 font-mono text-xs text-[#5d6167]">{e.employeeCode}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(e.user.fullName)}`}>
                          {initials(e.user.fullName)}
                        </span>
                        <span className="max-w-[160px] truncate text-sm font-semibold text-[#1f2328]">{e.user.fullName}</span>
                      </div>
                    </td>
                    <td className="p-4 text-[#5d6167]">{e.jobTitle}</td>
                    <td className="p-4 text-[#5d6167]">{e.department?.name ?? "—"}</td>
                    <td className="p-4">
                      <SimpleSelect
                        value={e.managerId ?? ""}
                        onChange={(v) => updateEmployee(e.id, { managerId: v || null })}
                        options={[
                          { value: "", label: "Sin jefe" },
                          ...employees
                            .filter((o) => o.id !== e.id)
                            .map((o) => ({ value: o.id, label: o.user.fullName })),
                        ]}
                        triggerClassName="flex w-full min-w-[150px] items-center justify-between rounded-full border border-black/10 bg-[#fafaf9] px-3 py-1.5 text-left text-xs font-semibold text-[#1f2328]"
                      />
                    </td>
                    <td className="p-4">
                      <input
                        defaultValue={e.site ?? ""}
                        placeholder="Sede"
                        onBlur={(ev) => {
                          const value = ev.target.value.trim();
                          if (value !== (e.site ?? "")) updateEmployee(e.id, { site: value });
                        }}
                        className="w-24 rounded-full border border-black/10 bg-[#fafaf9] px-3 py-1.5 text-xs"
                      />
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLE[e.status] ?? ""}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[e.status] ?? "bg-[#94A3B8]"}`} />
                        {STATUS_LABELS[e.status] ?? e.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-[#1f2328]">{e.salaryAmount != null ? formatMoney(e.salaryAmount, e.salaryCurrency) : "—"}</p>
                      {e.salaryAmount != null && <p className="text-[11px] text-[#8b8d91]">{PERIOD_LABELS[e.salaryPeriod] ?? e.salaryPeriod}</p>}
                    </td>
                    <td className="p-4 text-[#5d6167]">{fmtDateOnly(e.hireDate)}</td>
                    <td className="p-4">
                      <div className="relative flex justify-end">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((id) => (id === e.id ? null : e.id))}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b8d91] hover:bg-[#f1f5f9]"
                        >
                          ⋮
                        </button>
                        {menuOpenId === e.id && (
                          <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-black/8 bg-white py-1.5 shadow-lg">
                            {e.status !== "ACTIVE" && (
                              <button
                                onClick={() => { updateEmployee(e.id, { status: "ACTIVE" }); setMenuOpenId(null); }}
                                className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#16A34A] hover:bg-[#F0FDF4]"
                              >
                                Marcar activo
                              </button>
                            )}
                            {e.status !== "ON_LEAVE" && (
                              <button
                                onClick={() => { updateEmployee(e.id, { status: "ON_LEAVE" }); setMenuOpenId(null); }}
                                className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#B45309] hover:bg-[#FFFBEB]"
                              >
                                Marcar en licencia
                              </button>
                            )}
                            {e.status !== "TERMINATED" && (
                              <button
                                onClick={() => { updateEmployee(e.id, { status: "TERMINATED" }); setMenuOpenId(null); }}
                                className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2]"
                              >
                                Marcar retirado
                              </button>
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
            Mostrando {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de {filtered.length} empleados
          </span>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">‹</button>
            {getPageNumbers(page, pageCount).map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="px-1 text-[#8b8d91]">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors duration-200 ${p === page ? "bg-[#0C535B] text-white" : "border border-black/10 text-[#5d6167] hover:bg-[#ececea]"}`}
                >
                  {p}
                </button>
              )
            )}
            <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">›</button>
          </div>
          <SimpleSelect
            value={String(perPage)}
            options={[{ value: "10", label: "10 por página" }, { value: "20", label: "20 por página" }, { value: "50", label: "50 por página" }]}
            onChange={(v) => setPerPage(Number(v))}
            className="w-40"
            openUp
          />
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">Nuevo empleado</h3>
              <button onClick={() => setCreating(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>

            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <input placeholder="Nombre completo" value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Correo (para iniciar sesión)" type="email" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Cédula de ciudadanía (será la contraseña)" value={form.cedula}
                onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Cargo" value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <SimpleSelect
                value={form.managerId}
                options={[
                  { value: "", label: employees.length === 0 ? "Sin jefe (primer empleado)" : "Selecciona jefe inmediato…" },
                  ...employees.map((e) => ({ value: e.id, label: `${e.user.fullName} (${e.jobTitle})` })),
                ]}
                onChange={(v) => setForm({ ...form, managerId: v })}
              />
              <SimpleSelect
                value={form.departmentId}
                options={[
                  { value: "", label: "Sin departamento" },
                  ...departments.map((d) => ({ value: d.id, label: d.name })),
                ]}
                onChange={(v) => setForm({ ...form, departmentId: v })}
              />
              <SimpleSelect
                value={form.contractType}
                options={CONTRACT_TYPES.map((c) => ({ value: c, label: CONTRACT_LABELS[c] }))}
                onChange={(v) => setForm({ ...form, contractType: v as typeof form.contractType })}
              />
              <input type="date" value={form.hireDate}
                onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Salario (COP)" type="number" value={form.salaryAmount}
                onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <SimpleSelect
                value={form.salaryPeriod}
                options={SALARY_PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
                onChange={(v) => setForm({ ...form, salaryPeriod: v as typeof form.salaryPeriod })}
              />
              <input placeholder="EPS" value={form.eps}
                onChange={(e) => setForm({ ...form, eps: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="AFP" value={form.afp}
                onChange={(e) => setForm({ ...form, afp: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="ARL" value={form.arl}
                onChange={(e) => setForm({ ...form, arl: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button
                onClick={submit}
                disabled={
                  saving ||
                  !form.fullName ||
                  !form.email ||
                  !form.cedula ||
                  !form.jobTitle ||
                  (employees.length > 0 && !form.managerId)
                }
                className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Contratar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
