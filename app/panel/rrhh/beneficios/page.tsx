"use client";
import { useEffect, useState } from "react";

type Benefit = { id: string; title: string; description: string; isActive: boolean; order: number };

export default function BeneficiosRRHHPage() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "" });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/rrhh-local/benefits");
    if (res.ok) setBenefits(await res.json());
    else setError("No fue posible cargar los beneficios");
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
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ title: "", description: "" });
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

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Beneficios</h1>
        <button onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white">
          {creating ? "Cancelar" : "Nuevo beneficio"}
        </button>
      </div>
      <p className="text-sm text-[#64748B]">Beneficios visibles para los colaboradores en el portal empleado.</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <input placeholder="Título" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <textarea placeholder="Descripción" rows={3} value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <button onClick={submit} disabled={saving}
            className="rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Guardando…" : "Crear"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {benefits.map((b) => (
          <div key={b.id} className="flex items-start justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div>
              <p className="text-sm font-black text-[#1A1A1A]">{b.title}</p>
              <p className="mt-1 text-xs text-[#64748B]">{b.description}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${b.isActive ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                {b.isActive ? "Activo" : "Oculto"}
              </span>
              <button onClick={() => toggleActive(b.id, b.isActive)} className="text-xs font-bold text-[#27B1B8] hover:underline">
                {b.isActive ? "Ocultar" : "Activar"}
              </button>
              <button onClick={() => remove(b.id)} className="text-xs font-bold text-[#DC2626] hover:underline">
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {benefits.length === 0 && <p className="text-sm text-[#94A3B8]">Sin beneficios creados todavía.</p>}
      </div>
    </div>
  );
}
