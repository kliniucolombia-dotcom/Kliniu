"use client";
import { useCallback, useEffect, useState } from "react";
import { MdEdit, MdDelete, MdApartment } from "react-icons/md";

type Department = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  isActive: boolean;
};

type FormState = { name: string; code: string; description: string; isActive: boolean };

const EMPTY_FORM: FormState = { name: "", code: "", description: "", isActive: true };

export default function DepartamentosProduccionPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "create" } | { mode: "edit"; id: string } | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [confirmDelete, setConfirmDelete] = useState<Department | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/panel/departamentos");
      const d = await r.json();
      setDepartments(Array.isArray(d) ? d : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setError(null); setModal({ mode: "create" }); };

  const openEdit = (d: Department) => {
    setForm({ name: d.name, code: d.code, description: d.description ?? "", isActive: d.isActive });
    setError(null);
    setModal({ mode: "edit", id: d.id });
  };

  const save = async () => {
    if (!form.name.trim() || !form.code.trim()) { setError("Nombre y código son obligatorios"); return; }
    setSaving(true);
    setError(null);
    try {
      const isEdit = modal?.mode === "edit";
      const r = await fetch(isEdit ? `/api/panel/departamentos/${modal.id}` : "/api/panel/departamentos", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo guardar"); return; }
      setModal(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch(`/api/panel/departamentos/${confirmDelete.id}`, { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo eliminar"); return; }
      setConfirmDelete(null);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Departamentos</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Departamentos internos del área de producción</p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition hover:bg-[#1F9AA0]"
        >
          + Nuevo departamento
        </button>
      </div>

      {error && !modal && !confirmDelete && (
        <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
        </div>
      ) : departments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#94A3B8]">
          <MdApartment size={28} className="mx-auto mb-2 text-[#CBD5E1]" />
          Sin departamentos todavía. Crea el primero.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {["Código", "Nombre", "Descripción", "Estado", ""].map((h) => (
                  <th key={h} className="border-b border-[#E2E8F0] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id} className="hover:bg-[#F8FAFC]">
                  <td className="border-b border-[#F1F5F9] px-4 py-3 font-bold text-[#27B1B8]">{d.code}</td>
                  <td className="border-b border-[#F1F5F9] px-4 py-3 font-semibold text-[#1A1A1A]">{d.name}</td>
                  <td className="border-b border-[#F1F5F9] px-4 py-3 text-[#64748B]">{d.description || "—"}</td>
                  <td className="border-b border-[#F1F5F9] px-4 py-3">
                    <span
                      className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest"
                      style={d.isActive ? { color: "#16A34A", background: "#DCFCE7" } : { color: "#64748B", background: "#F1F5F9" }}
                    >
                      {d.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="border-b border-[#F1F5F9] px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openEdit(d)} aria-label={`Editar ${d.name}`} className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#F1F5F9] hover:text-[#27B1B8]">
                        <MdEdit size={16} />
                      </button>
                      <button onClick={() => { setError(null); setConfirmDelete(d); }} aria-label={`Eliminar ${d.name}`} className="rounded-lg p-2 text-[#64748B] transition hover:bg-[#FEE2E2] hover:text-[#DC2626]">
                        <MdDelete size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">{modal.mode === "create" ? "Nuevo departamento" : "Editar departamento"}</h3>
            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-[#64748B]">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748B]">Código</label>
                <input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm uppercase outline-none focus:border-[#27B1B8]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-[#64748B]">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  className="mt-1 w-full resize-none rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                />
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                  className="h-4 w-4 accent-[#27B1B8]"
                />
                Activo
              </label>
            </div>
            {error && <p className="mt-3 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setModal(null); setError(null); }} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={save} disabled={saving} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0] disabled:opacity-60">
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">Eliminar departamento</h3>
            <p className="mt-2 text-sm text-[#64748B]">
              ¿Eliminar <span className="font-bold text-[#1A1A1A]">{confirmDelete.name}</span>? Esta acción no se puede deshacer.
            </p>
            {error && <p className="mt-3 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => { setConfirmDelete(null); setError(null); }} className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={remove} disabled={saving} className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-bold text-white hover:bg-[#B91C1C] disabled:opacity-60">
                {saving ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
