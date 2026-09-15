"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { MdAdd, MdArrowBack, MdClose, MdCheck, MdDeleteOutline } from "react-icons/md";
import { SimpleSelect } from "@/app/panel/_components/simple-select";

type StaffUser = { id: string; fullName: string };
type Department = { id: string; name: string; code: string };
type FieldDef = { key: string; label: string; type: string; options?: string[]; required?: boolean };
type Category = {
  id: string;
  name: string;
  icon: string | null;
  active: boolean;
  allowedDepartmentIds: string[];
  fieldsSchema: FieldDef[];
  defaultResponsible: { id: string; fullName: string } | null;
  _count: { tickets: number };
};

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Category | "new" | null>(null);

  const load = async () => {
    const res = await fetch("/api/rrhh-local/ticket-categories/admin");
    if (res.ok) {
      const data = await res.json();
      setCategories(data.categories);
      setDepartments(data.departments);
      setStaff(data.staff);
    } else setError("No fue posible cargar las categorías");
    setLoading(false);
  };

  useEffect(() => {
    void (async () => { await load(); })();
  }, []);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/panel/tickets" className="mb-1 flex items-center gap-1 text-xs font-bold text-[#64748B] hover:text-[#1A1A1A]">
            <MdArrowBack size={14} /> Solicitudes
          </Link>
          <h1 className="text-xl font-black text-[#1A1A1A]">Categorías</h1>
          <p className="text-xs text-[#64748B]">Tipos de solicitud y qué departamentos pueden verlos y crearlos.</p>
        </div>
        <button onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-3.5 py-2 text-sm font-bold text-white hover:opacity-80">
          <MdAdd size={16} /> Nueva categoría
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Departamentos con acceso</th>
              <th className="px-4 py-3">Responsable por defecto</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id} className="border-b border-[#F1F5F9]">
                <td className="px-4 py-3">
                  <p className="font-bold text-[#1A1A1A]">{c.name}</p>
                  <p className="text-xs text-[#94A3B8]">{c._count.tickets} solicitud{c._count.tickets === 1 ? "" : "es"}</p>
                </td>
                <td className="px-4 py-3">
                  {c.allowedDepartmentIds.length === 0 ? (
                    <span className="text-xs font-semibold text-[#94A3B8]">Todos los departamentos</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {c.allowedDepartmentIds.map((id) => {
                        const d = departments.find((x) => x.id === id);
                        return d ? <span key={id} className="rounded-full bg-[#FFF1E6] px-2.5 py-0.5 text-[11px] font-bold text-[#B45309]">{d.name}</span> : null;
                      })}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-[#1A1A1A]">{c.defaultResponsible?.fullName ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${c.active ? "bg-[#ECFDF5] text-[#0C7A54]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${c.active ? "bg-[#0C7A54]" : "bg-[#94A3B8]"}`} />
                    {c.active ? "Activa" : "Inactiva"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => setEditing(c)} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-[#94A3B8]">Sin categorías creadas todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <CategoryModal
          category={editing === "new" ? null : editing}
          departments={departments}
          staff={staff}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function CategoryModal({ category, departments, staff, onClose, onSaved }: {
  category: Category | null;
  departments: Department[];
  staff: StaffUser[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [icon, setIcon] = useState(category?.icon ?? "");
  const [responsibleId, setResponsibleId] = useState(category?.defaultResponsible?.id ?? "");
  const [deptIds, setDeptIds] = useState<string[]>(category?.allowedDepartmentIds ?? []);
  const [active, setActive] = useState(category?.active ?? true);
  const [fields, setFields] = useState<FieldDef[]>(category?.fieldsSchema ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleDept = (id: string) => setDeptIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const addField = () => setFields((prev) => [...prev, { key: "", label: "", type: "text", required: false }]);
  const updateField = (index: number, patch: Partial<FieldDef>) =>
    setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const removeField = (index: number) => setFields((prev) => prev.filter((_, i) => i !== index));

  const submit = async () => {
    setSaving(true);
    setError("");
    const body = { name, icon, defaultResponsibleId: responsibleId || null, allowedDepartmentIds: deptIds, active, fieldsSchema: fields };
    const res = await fetch(category ? `/api/rrhh-local/ticket-categories/admin/${category.id}` : "/api/rrhh-local/ticket-categories/admin", {
      method: category ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setError((await res.json().catch(() => ({}))).error || "No fue posible guardar");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h3 className="font-black text-[#1A1A1A]">{category ? "Editar categoría" : "Nueva categoría"}</h3>
              {category && <p className="mt-0.5 text-xs text-[#94A3B8]">{category.name}</p>}
            </div>
            <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1A1A1A]" aria-label="Cerrar"><MdClose size={18} /></button>
          </div>

          {error && <p className="mb-3 text-xs font-semibold text-red-500">{error}</p>}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Nombre de la categoría</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Icono (opcional)</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Ej. 🛠️ o deja vacío para usar el icono por defecto"
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm" />
              <p className="mt-1 text-xs text-[#94A3B8]">Puede ser un emoji. Si está vacío, se usa el icono según el nombre.</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Responsable por defecto</label>
              <SimpleSelect
                value={responsibleId}
                onChange={setResponsibleId}
                options={[{ value: "", label: "Sin asignar" }, ...staff.map((s) => ({ value: s.id, label: s.fullName }))]}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Departamentos con acceso</label>
              <p className="mb-2 text-xs text-[#94A3B8]">Sin selección = visible para todos los departamentos.</p>
              <div className="flex flex-wrap gap-1.5">
                {departments.map((d) => {
                  const on = deptIds.includes(d.id);
                  return (
                    <button key={d.id} type="button" onClick={() => toggleDept(d.id)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold ${on ? "border border-[#27B1B8] bg-[#EFF9FA] text-[#0C535B]" : "border border-[#E2E8F0] bg-white text-[#64748B]"}`}>
                      {on && <MdCheck size={12} />}
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-xs font-bold text-[#64748B]">Campos personalizados</label>
                <button type="button" onClick={addField} className="inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs font-bold text-[#27B1B8] hover:bg-[#F8FAFC]">
                  <MdAdd size={13} /> Agregar campo
                </button>
              </div>
              <p className="mb-2 text-xs text-[#94A3B8]">Se muestran al crear la solicitud (solo si la categoría está activa).</p>
              {fields.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#E2E8F0] py-3 text-center text-xs text-[#94A3B8]">Sin campos personalizados.</p>
              ) : (
                <div className="space-y-2">
                  {fields.map((f, i) => (
                    <div key={i} className="rounded-xl border border-[#E2E8F0] p-2.5">
                      <div className="flex items-center gap-2">
                        <input value={f.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="Etiqueta"
                          className="min-w-0 flex-1 rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-sm" />
                        <div className="w-28">
                          <SimpleSelect
                            value={f.type}
                            onChange={(v) => updateField(i, { type: v })}
                            options={[{ value: "text", label: "Texto" }, { value: "select", label: "Lista" }, { value: "boolean", label: "Sí/No" }]}
                          />
                        </div>
                        <button type="button" onClick={() => removeField(i)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]" aria-label="Eliminar campo">
                          <MdDeleteOutline size={16} />
                        </button>
                      </div>
                      <input value={f.key} onChange={(e) => updateField(i, { key: e.target.value })} placeholder="Clave (ej. color)"
                        className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs" />
                      {f.type === "select" && (
                        <input value={(f.options ?? []).join(", ")} onChange={(e) => updateField(i, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                          placeholder="Opciones separadas por coma"
                          className="mt-2 w-full rounded-lg border border-[#E2E8F0] px-2.5 py-1.5 text-xs" />
                      )}
                      <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-[#64748B]">
                        <input type="checkbox" checked={Boolean(f.required)} onChange={(e) => updateField(i, { required: e.target.checked })} className="h-3.5 w-3.5 accent-[#27B1B8]" />
                        Obligatorio
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-[#F8FAFC] px-3.5 py-2.5">
              <div>
                <p className="text-sm font-bold text-[#1A1A1A]">Categoría activa</p>
                <p className="text-xs text-[#94A3B8]">Visible al crear una nueva solicitud</p>
              </div>
              <button type="button" onClick={() => setActive((v) => !v)}
                className={`flex h-[22px] w-[38px] items-center rounded-full p-0.5 transition ${active ? "bg-[#27B1B8]" : "bg-[#E2E8F0]"}`}>
                <span className={`h-[18px] w-[18px] rounded-full bg-white transition ${active ? "ml-auto" : ""}`} />
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
            <button onClick={submit} disabled={!name.trim() || saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
