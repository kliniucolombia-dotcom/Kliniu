"use client";
import { useEffect, useState } from "react";

type Announcement = { id: string; title: string; body: string; authorName: string | null; isActive: boolean; createdAt: string };

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function NoticiasRRHHPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", authorName: "" });

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

  const submit = async () => {
    setError("");
    if (!form.title.trim() || !form.body.trim()) return setError("Título y contenido son obligatorios");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/announcements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, authorName: form.authorName.trim() || null }),
    });
    if (res.ok) {
      setForm({ title: "", body: "", authorName: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible crear la noticia");
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

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Noticias</h1>
        <button onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white">
          {creating ? "Cancelar" : "Nueva noticia"}
        </button>
      </div>
      <p className="text-sm text-[#64748B]">Anuncios visibles para todos los colaboradores en el portal empleado.</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <input placeholder="Título" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <textarea placeholder="Contenido" rows={4} value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Autor (opcional)" value={form.authorName}
            onChange={(e) => setForm({ ...form, authorName: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <button onClick={submit} disabled={saving}
            className="rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Publicando…" : "Publicar"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-black text-[#1A1A1A]">{a.title}</p>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${a.isActive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                  {a.isActive ? "Publicada" : "Oculta"}
                </span>
                <button onClick={() => toggleActive(a.id, a.isActive)} className="text-xs font-bold text-[#27B1B8] hover:underline">
                  {a.isActive ? "Ocultar" : "Publicar"}
                </button>
                <button onClick={() => remove(a.id)} className="text-xs font-bold text-[#DC2626] hover:underline">
                  Eliminar
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs text-[#94A3B8]">{fmt(a.createdAt)}{a.authorName ? ` · ${a.authorName}` : ""}</p>
            <p className="mt-2 whitespace-pre-line text-sm text-[#64748B]">{a.body}</p>
          </div>
        ))}
        {announcements.length === 0 && <p className="text-sm text-[#94A3B8]">Sin noticias publicadas todavía.</p>}
      </div>
    </div>
  );
}
