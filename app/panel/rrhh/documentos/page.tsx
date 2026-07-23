"use client";
import { useEffect, useMemo, useState } from "react";
import { MdAttachFile, MdDownload, MdDescription, MdGroup, MdCalendarMonth, MdShield, MdSearch, MdRefresh, MdClose } from "react-icons/md";
import { SimpleSelect } from "../../_components/simple-select";

type EmployeeOption = { id: string; userId: string; employeeCode: string; user: { fullName: string } };
type DocumentRow = {
  id: string;
  category: string;
  name: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  createdAt: string;
  employee: { employeeCode: string; user: { fullName: string } };
};

const CATEGORIES = [
  { value: "CONTRATO", label: "Contrato" },
  { value: "CERTIFICADO", label: "Certificado" },
  { value: "COMPROBANTE_PAGO", label: "Comprobante de pago" },
  { value: "OTRO", label: "Otro" },
];

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

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}

export default function DocumentosRRHHPage() {
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ employeeId: "", category: "CONTRATO", name: "", filePath: "", fileName: "" });

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    const [docRes, empRes] = await Promise.all([
      fetch("/api/rrhh-local/documents"),
      fetch("/api/rrhh-local/employees"),
    ]);
    if (docRes.ok) setDocuments(await docRes.json());
    else setError("No fue posible cargar los documentos");
    if (empRes.ok) setEmployees(await empRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const uploadFile = async (file: File) => {
    const employee = employees.find((e) => e.id === form.employeeId);
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
    else setError(data.error || "No fue posible abrir el documento");
  };

  const submit = async () => {
    setError("");
    if (!form.employeeId || !form.name.trim() || !form.filePath) {
      return setError("Empleado, nombre y archivo son obligatorios");
    }
    const res = await fetch("/api/rrhh-local/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: form.employeeId,
        category: form.category,
        name: form.name.trim(),
        fileUrl: form.filePath,
        fileName: form.fileName,
      }),
    });
    if (res.ok) {
      setForm({ employeeId: "", category: "CONTRATO", name: "", filePath: "", fileName: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible guardar el documento");
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar este documento?")) return;
    const res = await fetch(`/api/rrhh-local/documents/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setEmployeeFilter("all"); };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      const matchesSearch = !q || d.name.toLowerCase().includes(q) || d.employee.user.fullName.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || d.category === categoryFilter;
      const matchesEmployee = employeeFilter === "all" || d.employee.employeeCode === employeeFilter;
      return matchesSearch && matchesCategory && matchesEmployee;
    });
  }, [documents, search, categoryFilter, employeeFilter]);

  const kpis = useMemo(() => {
    const now = new Date();
    const thisMonth = documents.filter((d) => {
      const dt = new Date(d.createdAt);
      return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
    });
    const employeesWithDocs = new Set(documents.map((d) => d.employee.employeeCode)).size;
    const totalBytes = documents.reduce((s, d) => s + (d.fileSize ?? 0), 0);
    const gb = totalBytes / (1024 * 1024 * 1024);
    return { total: documents.length, employeesWithDocs, thisMonth: thisMonth.length, gb };
  }, [documents]);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#1A1A1A]">Documentos</h1>
          <p className="mt-1 text-sm text-[#6e7379]">Contratos, certificados y comprobantes compartidos con cada colaborador.</p>
        </div>
        <button
          type="button"
          onClick={() => { setCreating(true); setError(""); }}
          className="inline-flex items-center gap-2 rounded-full bg-[#27B1B8] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#0C535B]"
        >
          + Subir documento
        </button>
      </div>

      {error && !creating && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]"><MdDescription /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.total}</p>
            <p className="text-xs text-[#8b8d91]">Total de documentos</p>
            <p className="text-[11px] text-[#8b8d91]">Documentos en total</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FEF3C7] text-[#B45309]"><MdGroup /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.employeesWithDocs}</p>
            <p className="text-xs text-[#8b8d91]">Empleados con documentos</p>
            <p className="text-[11px] text-[#8b8d91]">Con al menos un documento</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EDE9FE] text-[#6D28D9]"><MdCalendarMonth /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.thisMonth}</p>
            <p className="text-xs text-[#8b8d91]">Documentos este mes</p>
            <p className="text-[11px] text-[#8b8d91]">Subidos este mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]"><MdShield /></span>
          <div className="min-w-0">
            <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.gb.toFixed(2)} GB</p>
            <p className="text-xs text-[#8b8d91]">Almacenamiento</p>
            <p className="text-[11px] text-[#8b8d91]">Espacio utilizado</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[1.75rem] border border-black/8 bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
        <div className="relative flex-1 min-w-[220px]">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8b8d91]"><MdSearch /></span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre de documento o empleado…"
            className="w-full rounded-full border border-black/10 bg-[#fafaf9] py-2.5 pl-9 pr-4 text-sm text-[#1f2328] outline-none focus:border-[#27B1B8]"
          />
        </div>
        <SimpleSelect
          value={categoryFilter}
          options={[{ value: "all", label: "Todas las categorías" }, ...CATEGORIES]}
          onChange={setCategoryFilter}
          className="w-52"
        />
        <SimpleSelect
          value={employeeFilter}
          options={[{ value: "all", label: "Todos los empleados" }, ...employees.map((e) => ({ value: e.employeeCode, label: e.user.fullName }))]}
          onChange={setEmployeeFilter}
          className="w-52"
        />
        {(search || categoryFilter !== "all" || employeeFilter !== "all") && (
          <button type="button" onClick={clearFilters} className="text-sm font-semibold text-[#27B1B8] hover:underline">
            <MdRefresh /> Limpiar filtros
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Empleado</th>
                <th className="p-4">Nombre del documento</th>
                <th className="p-4">Categoría</th>
                <th className="p-4">Fecha</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-sm text-[#6e7379]">Sin documentos cargados todavía.</td></tr>
              ) : (
                filtered.map((d) => (
                  <tr key={d.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                    <td className="p-4">
                      <div className="flex items-center gap-2.5">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarColor(d.employee.user.fullName)}`}>
                          {initials(d.employee.user.fullName)}
                        </span>
                        <span className="font-semibold text-[#1f2328]">{d.employee.user.fullName}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-[#1f2328]">{d.name}</p>
                      <p className="text-xs text-[#8b8d91]">{d.fileName}</p>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-[#EAF8F6] px-2.5 py-0.5 text-xs font-semibold text-[#0C535B]">
                        {CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}
                      </span>
                    </td>
                    <td className="p-4 text-[#5d6167]">{fmt(d.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => view(d.fileUrl)} className="flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
                          <MdDownload size={14} /> Ver
                        </button>
                        <button onClick={() => remove(d.id)} className="text-xs font-bold text-[#DC2626] hover:underline">Eliminar</button>
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
              <h3 className="font-black text-[#1A1A1A]">Subir documento</h3>
              <button onClick={() => setCreating(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]"><MdClose /></button>
            </div>
            {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <SimpleSelect
                value={form.employeeId}
                options={[
                  { value: "", label: "Selecciona empleado…" },
                  ...employees.map((e) => ({ value: e.id, label: `${e.user.fullName} (${e.employeeCode})` })),
                ]}
                onChange={(v) => setForm({ ...form, employeeId: v })}
              />
              <SimpleSelect value={form.category} options={CATEGORIES} onChange={(v) => setForm({ ...form, category: v })} />
              <input placeholder="Nombre del documento" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="col-span-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
              <div className="col-span-full flex items-center gap-3">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#64748B] hover:border-[#27B1B8]">
                  <MdAttachFile size={16} />
                  {uploading ? "Subiendo…" : "Elegir archivo"}
                  <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                </label>
                {form.fileName && <span className="text-xs text-[#16A34A]">{form.fileName}</span>}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setCreating(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button onClick={submit} disabled={uploading} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
