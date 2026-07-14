"use client";
import { useEffect, useState } from "react";

type DepartmentRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

export default function DepartamentosPage() {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/rrhh-local/departments");
    if (res.ok) setDepartments(await res.json());
    else setError("No fue posible cargar los departamentos");
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

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Departamentos</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white"
        >
          {creating ? "Cancelar" : "Nuevo departamento"}
        </button>
      </div>
      <p className="text-sm text-[#64748B]">Estructura organizacional y departamentos de la empresa.</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-3">
          <input placeholder="Nombre" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Código (ej. VENTAS)" value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Descripción" value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <button
            onClick={submit}
            disabled={saving}
            className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Crear"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Nombre</th>
              <th className="p-3">Código</th>
              <th className="p-3">Descripción</th>
              <th className="p-3">Activo</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => (
              <tr key={d.id} className="border-b border-[#F1F5F9]">
                <td className="p-3 font-bold text-[#1A1A1A]">{d.name}</td>
                <td className="p-3">{d.code}</td>
                <td className="p-3">{d.description ?? "—"}</td>
                <td className="p-3">{d.isActive ? "Sí" : "No"}</td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td className="p-3 text-[#94A3B8]" colSpan={4}>Sin departamentos registrados todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
