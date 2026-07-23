"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdBusiness, MdInventory2, MdPalette, MdCampaign, MdFactory, MdGroup, MdAttachMoney, MdTrendingUp, MdAssignment,
  MdPerson, MdWork, MdSearch, MdFileDownload, MdMoreVert, MdClose,
} from "react-icons/md";

type DepartmentRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

type EmployeeMini = { departmentId: string | null };

const DEPT_ICONS = [MdBusiness, MdInventory2, MdPalette, MdCampaign, MdFactory, MdGroup, MdAttachMoney, MdTrendingUp, MdAssignment];

function iconFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return DEPT_ICONS[Math.abs(hash) % DEPT_ICONS.length];
}

export default function DepartamentosPage() {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeMini[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const perPage = 20;

  const load = async () => {
    setLoading(true);
    const [deptRes, empRes] = await Promise.all([
      fetch("/api/rrhh-local/departments"),
      fetch("/api/rrhh-local/employees"),
    ]);
    if (deptRes.ok) setDepartments(await deptRes.json());
    else setError("No fue posible cargar los departamentos");
    if (empRes.ok) setEmployees(await empRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ name: "", code: "", description: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible crear el departamento");
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/rrhh-local/departments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) await load();
  };

  const countFor = (id: string) => employees.filter((e) => e.departmentId === id).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) => d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q));
  }, [departments, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const exportCsv = () => {
    const header = ["Nombre", "Codigo", "Descripcion", "Colaboradores", "Activo"];
    const rows = filtered.map((d) => [d.name, d.code, d.description ?? "", String(countFor(d.id)), d.isActive ? "Si" : "No"]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "departamentos-kliniu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpis = useMemo(() => {
    const active = departments.filter((d) => d.isActive);
    const totalColab = employees.length;
    const avg = departments.length ? totalColab / departments.length : 0;
    return { total: departments.length, active: active.length, totalColab, avg };
  }, [departments, employees]);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF8F6] text-2xl"><MdBusiness /></span>
          <div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">Departamentos</h1>
            <p className="mt-1 text-sm text-[#6e7379]">Estructura organizacional y departamentos de la empresa.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setCreating(true); setError(""); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0C535B]"
        >
          + Nuevo departamento
        </button>
      </div>

      {error && !creating && <p className="text-sm text-red-500">{error}</p>}

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]"><MdGroup /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.total}</p>
            <p className="text-xs text-[#8b8d91]">Total departamentos</p>
            <p className="text-[11px] text-[#16A34A]">Activos</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]"><MdAssignment /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.active}</p>
            <p className="text-xs text-[#8b8d91]">Departamentos activos</p>
            <p className="text-[11px] text-[#2563EB]">{kpis.total ? Math.round((kpis.active / kpis.total) * 100) : 0}% del total</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]"><MdPerson /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.totalColab}</p>
            <p className="text-xs text-[#8b8d91]">Total colaboradores</p>
            <p className="text-[11px] text-[#8b8d91]">En toda la organización</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]"><MdWork /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.avg.toFixed(1)}</p>
            <p className="text-xs text-[#8b8d91]">Promedio por departamento</p>
            <p className="text-[11px] text-[#8b8d91]">Colaboradores</p>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 p-5">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b8d91]"><MdSearch /></span>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Buscar departamento…"
              className="w-72 rounded-full border border-black/10 bg-[#fafaf9] py-2.5 pl-9 pr-4 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:text-[#0C535B]"
          >
<MdFileDownload /> Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Nombre</th>
                <th className="p-4">Código</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Colaboradores</th>
                <th className="p-4">Activo</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-sm text-[#6e7379]">Sin departamentos registrados todavía.</td></tr>
              ) : (
                paged.map((d) => {
                  const DeptIcon = iconFor(d.name);
                  return (
                  <tr key={d.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF8F6] text-base"><DeptIcon /></span>
                        <span className="font-semibold text-[#1f2328]">{d.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-[#f1f5f9] px-2.5 py-0.5 font-mono text-xs text-[#5d6167]">{d.code}</span>
                    </td>
                    <td className="p-4 text-[#5d6167]">{d.description ?? "—"}</td>
                    <td className="p-4 flex items-center gap-1 text-[#5d6167]"><MdPerson size={14} /> {countFor(d.id)}</td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => toggleActive(d.id, d.isActive)}
                        className={`flex h-6 w-11 items-center rounded-full p-0.5 transition-colors duration-200 ${d.isActive ? "justify-end bg-[#27B1B8]" : "justify-start bg-[#E2E8F0]"}`}
                      >
                        <span className="h-5 w-5 rounded-full bg-white shadow" />
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="relative flex justify-end">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((id) => (id === d.id ? null : d.id))}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b8d91] hover:bg-[#f1f5f9]"
                        >
                          <MdMoreVert />
                        </button>
                        {menuOpenId === d.id && (
                          <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-black/8 bg-white py-1.5 shadow-lg">
                            <button
                              onClick={() => { toggleActive(d.id, d.isActive); setMenuOpenId(null); }}
                              className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#1f2328] hover:bg-[#f8fafc]"
                            >
                              {d.isActive ? "Desactivar" : "Activar"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-4 py-3 text-sm text-[#6e7379]">
          <span>
            Mostrando {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de {filtered.length} departamentos
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
          <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">Nuevo departamento</h3>
              <button onClick={() => setCreating(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Nombre" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Código (ej. VENTAS)" value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Descripción (opcional)" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button onClick={submit} disabled={saving || !form.name || !form.code} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
