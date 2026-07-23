"use client";
import { useEffect, useMemo, useState } from "react";
import { SimpleSelect } from "../../_components/simple-select";
import {
  MdCardGiftcard, MdLocalHospital, MdSchool, MdFitnessCenter, MdLink, MdEmojiEvents, MdStarBorder,
  MdGroup, MdFavorite, MdCalendarMonth, MdCelebration, MdSearch, MdFileDownload, MdMoreVert, MdClose,
} from "react-icons/md";

type Benefit = {
  id: string;
  title: string;
  description: string;
  detail: string | null;
  category: string;
  frequency: string | null;
  isFeatured: boolean;
  isActive: boolean;
  order: number;
  approvedCount: number;
  expiresAt: string | null;
};

function fmtShort(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const CATEGORIES = [
  { value: "SALUD", label: "Salud", icon: MdLocalHospital },
  { value: "EDUCACION", label: "Educación", icon: MdSchool },
  { value: "BIENESTAR", label: "Bienestar", icon: MdFitnessCenter },
  { value: "CONVENIOS", label: "Convenios", icon: MdLink },
  { value: "BONIFICACIONES", label: "Bonificaciones", icon: MdCardGiftcard },
  { value: "RECONOCIMIENTOS", label: "Reconocimientos", icon: MdEmojiEvents },
  { value: "OTRO", label: "Otro", icon: MdStarBorder },
];
function categoryIcon(c: string) {
  return CATEGORIES.find((o) => o.value === c)?.icon ?? MdCardGiftcard;
}
function categoryLabel(c: string) {
  return CATEGORIES.find((o) => o.value === c)?.label ?? c;
}

const TABS = [
  { value: "all", label: "Todos los beneficios" },
  { value: "active", label: "Activos" },
  { value: "expiring", label: "Próximos a vencer" },
  { value: "inactive", label: "Inactivos" },
] as const;

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false;
  const days = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return days >= 0 && days <= 30;
}

export default function BeneficiosRRHHPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", detail: "", category: "OTRO", frequency: "", isFeatured: false, expiresAt: "" });

  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [benRes, empRes] = await Promise.all([
      fetch("/api/rrhh-local/benefits"),
      fetch("/api/rrhh-local/employees"),
    ]);
    if (benRes.ok) setBenefits(await benRes.json());
    else setError("No fue posible cargar los beneficios");
    if (empRes.ok) setEmployeeCount((await empRes.json()).length);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setError("");
    if (!form.title.trim() || !form.description.trim()) return setError("Título y descripción son obligatorios");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/benefits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description, detail: form.detail || undefined,
        category: form.category, frequency: form.frequency || undefined, isFeatured: form.isFeatured,
        expiresAt: form.expiresAt || undefined,
      }),
    });
    if (res.ok) {
      setForm({ title: "", description: "", detail: "", category: "OTRO", frequency: "", isFeatured: false, expiresAt: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible crear el beneficio");
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/rrhh-local/benefits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar este beneficio?")) return;
    const res = await fetch(`/api/rrhh-local/benefits/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const exportCsv = () => {
    const header = ["Beneficio", "Categoria", "Descripcion", "Estado"];
    const rows = filtered.map((b) => [b.title, categoryLabel(b.category), b.description, b.isActive ? "Activo" : "Inactivo"]);
    const csv = [header, ...rows].map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "beneficios-kliniu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return benefits.filter((b) => {
      const matchesSearch = !q || b.title.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || b.category === categoryFilter;
      const matchesTab =
        tab === "all" ||
        (tab === "active" && b.isActive) ||
        (tab === "inactive" && !b.isActive) ||
        (tab === "expiring" && isExpiringSoon(b.expiresAt));
      return matchesSearch && matchesCategory && matchesTab;
    });
  }, [benefits, search, categoryFilter, tab]);

  const kpis = useMemo(() => {
    const active = benefits.filter((b) => b.isActive);
    const participation = employeeCount ? Math.min(100, Math.round((benefits.reduce((s, b) => s + b.approvedCount, 0) / employeeCount) * 100)) : 0;
    const birthday = benefits.find((b) => b.title.toLowerCase().includes("cumpleaños"));
    const expiringCount = benefits.filter((b) => isExpiringSoon(b.expiresAt)).length;
    return { activeCount: active.length, participation, birthdayActive: birthday?.isActive ?? false, birthday, expiringCount };
  }, [benefits, employeeCount]);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF8F6] text-2xl"><MdCardGiftcard /></span>
          <div>
            <h1 className="text-3xl font-black text-[#1A1A1A]">Beneficios</h1>
            <p className="mt-1 text-sm text-[#6e7379]">Beneficios y bienestar para los colaboradores en el portal empleado.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => { setCreating(true); setError(""); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0C535B]"
        >
          + Nuevo beneficio
        </button>
      </div>

      {error && !creating && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]"><MdCardGiftcard /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.activeCount}</p>
            <p className="text-xs text-[#8b8d91]">Beneficios activos</p>
            <p className="text-[11px] text-[#8b8d91]">Beneficios disponibles</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]"><MdGroup /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.participation}%</p>
            <p className="text-xs text-[#8b8d91]">Participación</p>
            <p className="text-[11px] text-[#8b8d91]">Colaboradores beneficiados</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-[#C2410C]"><MdFavorite /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.expiringCount}</p>
            <p className="text-xs text-[#8b8d91]">Próximos a vencer</p>
            <p className="text-[11px] text-[#C2410C]">En los próximos 30 días</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DBEAFE] text-[#2563EB]"><MdCalendarMonth /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.birthdayActive ? "Activo" : "Inactivo"}</p>
            <p className="text-xs text-[#8b8d91]">Día de cumpleaños libre</p>
            <p className="text-[11px] text-[#8b8d91]">Política vigente</p>
          </div>
        </div>
      </div>

      {kpis.birthday && (
        <div className="flex items-center justify-between gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3">
            <span className="text-2xl"><MdCelebration /></span>
            <div>
              <p className="font-semibold text-[#1f2328]">{kpis.birthday.title}</p>
              <p className="text-xs text-[#8b8d91]">{kpis.birthday.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${kpis.birthday.isActive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
              {kpis.birthday.isActive ? "Activo" : "Inactivo"}
            </span>
            <button onClick={() => toggleActive(kpis.birthday!.id, kpis.birthday!.isActive)} className="text-xs font-bold text-[#27B1B8] hover:underline">
              {kpis.birthday.isActive ? "Ocultar" : "Activar"}
            </button>
            <button onClick={() => remove(kpis.birthday!.id)} className="text-xs font-bold text-[#DC2626] hover:underline">Eliminar</button>
          </div>
        </div>
      )}

      <div className="rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap gap-1 border-b border-black/8 px-5 pt-4">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`rounded-t-lg px-3 pb-3 text-sm font-semibold transition-colors duration-200 ${tab === t.value ? "border-b-2 border-[#27B1B8] text-[#0C535B]" : "text-[#8b8d91] hover:text-[#5d6167]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 p-5">
          <div className="relative flex-1 min-w-[200px]">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b8d91]"><MdSearch /></span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar beneficio…"
              className="w-full rounded-full border border-black/10 bg-[#fafaf9] py-2.5 pl-9 pr-4 text-sm text-[#1f2328] outline-none focus:border-[#27B1B8]"
            />
          </div>
          <SimpleSelect
            value={categoryFilter}
            options={[{ value: "all", label: "Todas las categorías" }, ...CATEGORIES.map((c) => ({ value: c.value, label: c.label }))]}
            onChange={setCategoryFilter}
            className="w-56"
          />
          <button
            type="button"
            onClick={exportCsv}
            className="ml-auto inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:text-[#0C535B]"
          >
            <MdFileDownload /> Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Beneficio</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Descripción</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Vigencia</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-sm text-[#6e7379]">Sin beneficios que coincidan con los filtros.</td></tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF8F6] text-base">{(() => { const Icon = categoryIcon(b.category); return <Icon />; })()}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#1f2328]">{b.title}</span>
                            {b.isFeatured && <span className="rounded-full bg-[#FFF7ED] px-2 py-0.5 text-[10px] font-bold text-[#C2410C]">Destacado</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-[#5d6167]">{categoryLabel(b.category)}</td>
                    <td className="p-4 max-w-xs text-[#5d6167]">{b.description}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${b.isActive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                        {b.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="p-4 text-[#5d6167]">
                      {b.expiresAt ? fmtShort(b.expiresAt) : "Indefinida"}
                      {isExpiringSoon(b.expiresAt) && <p className="text-[10px] font-semibold text-[#C2410C]">Vence pronto</p>}
                    </td>
                    <td className="p-4">
                      <div className="relative flex justify-end">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((id) => (id === b.id ? null : b.id))}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b8d91] hover:bg-[#f1f5f9]"
                        >
                          ⋮
                        </button>
                        {menuOpenId === b.id && (
                          <div className="absolute right-0 top-9 z-10 w-40 rounded-xl border border-black/8 bg-white py-1.5 shadow-lg">
                            <button
                              onClick={() => { toggleActive(b.id, b.isActive); setMenuOpenId(null); }}
                              className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#1f2328] hover:bg-[#f8fafc]"
                            >
                              {b.isActive ? "Ocultar" : "Activar"}
                            </button>
                            <button
                              onClick={() => { remove(b.id); setMenuOpenId(null); }}
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

        <div className="flex items-center justify-between border-t border-black/8 px-4 py-3 text-sm text-[#6e7379]">
          <span>Mostrando 1 a {filtered.length} de {filtered.length} beneficios</span>
        </div>
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">Nuevo beneficio</h3>
              <button onClick={() => setCreating(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Título" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <SimpleSelect
                value={form.category}
                options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
                onChange={(v) => setForm({ ...form, category: v })}
              />
              <textarea placeholder="Descripción" rows={2} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <textarea placeholder="Detalle adicional (opcional)" rows={2} value={form.detail}
                onChange={(e) => setForm({ ...form, detail: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Frecuencia (ej. Anual, Mensual)" value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Vigencia (opcional, vacío = indefinida)</label>
                <input type="date" value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#64748B]">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} />
                Destacado
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button onClick={submit} disabled={saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
