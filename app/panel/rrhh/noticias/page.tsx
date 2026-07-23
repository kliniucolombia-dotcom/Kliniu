"use client";
import { useEffect, useMemo, useState } from "react";
import { SimpleSelect } from "../../_components/simple-select";
import { MdCampaign, MdVisibility, MdGroup, MdCalendarMonth, MdSearch, MdRefresh, MdMoreVert, MdClose } from "react-icons/md";

type Announcement = {
  id: string;
  title: string;
  body: string;
  authorName: string | null;
  category: string;
  isImportant: boolean;
  isActive: boolean;
  createdAt: string;
  readCount: number;
  scheduledAt: string | null;
};

const CATEGORIES = [
  { value: "GENERAL", label: "General" },
  { value: "RRHH", label: "Recursos Humanos" },
  { value: "EVENTOS", label: "Eventos" },
  { value: "BIENESTAR", label: "Bienestar" },
  { value: "TECNOLOGIA", label: "Tecnología" },
  { value: "SST", label: "SST" },
  { value: "COMERCIAL", label: "Comercial" },
  { value: "PRODUCCION", label: "Producción" },
];
function categoryLabel(c: string) {
  return CATEGORIES.find((o) => o.value === c)?.label ?? c;
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

export default function NoticiasRRHHPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", authorName: "", category: "GENERAL", isImportant: false, scheduledAt: "" });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/rrhh-local/announcements");
    if (res.ok) setAnnouncements(await res.json());
    else setError("No fue posible cargar las noticias");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", body: "", authorName: "", category: "GENERAL", isImportant: false, scheduledAt: "" });
    setCreating(true);
    setError("");
  };

  const openEdit = (a: Announcement) => {
    setEditing(a);
    setForm({
      title: a.title, body: a.body, authorName: a.authorName ?? "", category: a.category,
      isImportant: a.isImportant, scheduledAt: a.scheduledAt ? a.scheduledAt.slice(0, 16) : "",
    });
    setCreating(true);
    setError("");
  };

  const submit = async () => {
    setError("");
    if (!form.title.trim() || !form.body.trim()) return setError("Título y contenido son obligatorios");
    setSaving(true);
    const res = await fetch(
      editing ? `/api/rrhh-local/announcements/${editing.id}` : "/api/rrhh-local/announcements",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, authorName: form.authorName.trim() || null, scheduledAt: form.scheduledAt || null }),
      },
    );
    if (res.ok) {
      setCreating(false);
      setEditing(null);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible guardar la noticia");
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    const res = await fetch(`/api/rrhh-local/announcements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    if (res.ok) await load();
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar esta noticia?")) return;
    const res = await fetch(`/api/rrhh-local/announcements/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setCategoryFilter("all"); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return announcements.filter((a) => {
      const matchesSearch = !q || a.title.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? a.isActive : !a.isActive);
      const matchesCategory = categoryFilter === "all" || a.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [announcements, search, statusFilter, categoryFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = announcements.filter((a) => {
      const d = new Date(a.createdAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const totalViews = thisMonth.reduce((s, a) => s + a.readCount, 0);
    const upcoming = announcements
      .filter((a) => a.scheduledAt && new Date(a.scheduledAt).getTime() > now.getTime())
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())[0];
    return { publishedThisMonth: thisMonth.length, totalViews, nextPublication: upcoming?.scheduledAt ?? null };
  }, [announcements]);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1A1A1A]">Noticias</h1>
          <p className="mt-1 text-sm text-[#6e7379]">Anuncios visibles para todos los colaboradores en el portal empleado.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0C535B]"
        >
          + Nueva noticia
        </button>
      </div>

      {error && !creating && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]"><MdCampaign /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.publishedThisMonth}</p>
            <p className="text-xs text-[#8b8d91]">Noticias publicadas</p>
            <p className="text-[11px] text-[#8b8d91]">Este mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]"><MdVisibility /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.totalViews}</p>
            <p className="text-xs text-[#8b8d91]">Vistas totales</p>
            <p className="text-[11px] text-[#8b8d91]">Este mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]"><MdGroup /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">100%</p>
            <p className="text-xs text-[#8b8d91]">Alcance</p>
            <p className="text-[11px] text-[#8b8d91]">Colaboradores</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]"><MdCalendarMonth /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">
              {kpis.nextPublication
                ? new Date(kpis.nextPublication).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })
                : "—"}
            </p>
            <p className="text-xs text-[#8b8d91]">Próxima publicación</p>
            <p className="text-[11px] text-[#8b8d91]">
              {kpis.nextPublication ? new Date(kpis.nextPublication).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "Sin programadas"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-black/8 bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
        <div className="relative flex-1 min-w-[200px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b8d91]"><MdSearch /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar noticias…"
            className="w-full rounded-full border border-black/10 bg-[#fafaf9] py-2.5 pl-9 pr-4 text-sm text-[#1f2328] outline-none focus:border-[#27B1B8]"
          />
        </div>
        <SimpleSelect
          value={statusFilter}
          options={[{ value: "all", label: "Todas" }, { value: "active", label: "Publicada" }, { value: "inactive", label: "Oculta" }]}
          onChange={setStatusFilter}
          className="w-40"
        />
        <SimpleSelect
          value={categoryFilter}
          options={[{ value: "all", label: "Todas" }, ...CATEGORIES]}
          onChange={setCategoryFilter}
          className="w-52"
        />
        {(search || statusFilter !== "all" || categoryFilter !== "all") && (
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-[#27B1B8] hover:underline">
            <MdRefresh /> Limpiar filtros
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Noticia</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Publicado por</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="p-10 text-center text-sm text-[#6e7379]">Sin noticias publicadas todavía.</td></tr>
              ) : (
                filtered.map((a) => (
                  <tr key={a.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                    <td className="p-4">
                      <p className="font-semibold text-[#1f2328]">{a.title}{a.isImportant && <span className="ml-1.5 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-[10px] font-bold text-[#DC2626]">Importante</span>}</p>
                      <p className="mt-0.5 max-w-sm truncate text-xs text-[#8b8d91]">{a.body}</p>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-[#EAF8F6] px-2.5 py-0.5 text-xs font-semibold text-[#0C535B]">{categoryLabel(a.category)}</span>
                    </td>
                    <td className="p-4 text-[#5d6167]">{a.authorName ?? "Recursos Humanos"}</td>
                    <td className="p-4 text-[#5d6167]">{fmt(a.createdAt)}</td>
                    <td className="p-4">
                      {a.scheduledAt && new Date(a.scheduledAt).getTime() > Date.now() ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#DBEAFE] px-2.5 py-0.5 text-xs font-semibold text-[#2563EB]">Programada</span>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${a.isActive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                          {a.isActive ? "Publicada" : "Oculta"}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="relative flex justify-end">
                        <button
                          type="button"
                          onClick={() => setMenuOpenId((id) => (id === a.id ? null : a.id))}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-[#8b8d91] hover:bg-[#f1f5f9]"
                        >
                          ⋮
                        </button>
                        {menuOpenId === a.id && (
                          <div className="absolute right-0 top-9 z-10 w-44 rounded-xl border border-black/8 bg-white py-1.5 shadow-lg">
                            <button
                              onClick={() => { openEdit(a); setMenuOpenId(null); }}
                              className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#1f2328] hover:bg-[#f8fafc]"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => { toggleActive(a.id, a.isActive); setMenuOpenId(null); }}
                              className="block w-full px-4 py-2 text-left text-xs font-semibold text-[#1f2328] hover:bg-[#f8fafc]"
                            >
                              {a.isActive ? "Ocultar" : "Publicar"}
                            </button>
                            <button
                              onClick={() => { remove(a.id); setMenuOpenId(null); }}
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
      </div>

      {creating && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">{editing ? "Editar noticia" : "Nueva noticia"}</h3>
              <button onClick={() => { setCreating(false); setEditing(null); }} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Título" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <SimpleSelect value={form.category} options={CATEGORIES} onChange={(v) => setForm({ ...form, category: v })} />
              <textarea placeholder="Contenido" rows={4} value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <input placeholder="Autor (opcional)" value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Programar publicación (opcional, vacío = ya publicada)</label>
                <input type="datetime-local" value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-[#64748B]">
                <input type="checkbox" checked={form.isImportant} onChange={(e) => setForm({ ...form, isImportant: e.target.checked })} />
                Marcar como importante
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setCreating(false); setEditing(null); }} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button onClick={submit} disabled={saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : editing ? "Guardar cambios" : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
