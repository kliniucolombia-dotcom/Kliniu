"use client";
import { useEffect, useState } from "react";
import { MdAttachFile, MdDownload } from "react-icons/md";
import { SimpleSelect } from "../../_components/simple-select";

type EmployeeOption = { id: string; userId: string; employeeCode: string; user: { fullName: string } };
type DocumentRow = {
  id: string;
  category: string;
  name: string;
  fileUrl: string;
  fileName: string;
  createdAt: string;
  employee: { employeeCode: string; user: { fullName: string } };
};

const CATEGORIES = [
  { value: "CONTRATO", label: "Contrato" },
  { value: "CERTIFICADO", label: "Certificado" },
  { value: "COMPROBANTE_PAGO", label: "Comprobante de pago" },
  { value: "OTRO", label: "Otro" },
];

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

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Documentos</h1>
        <button onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white">
          {creating ? "Cancelar" : "Subir documento"}
        </button>
      </div>
      <p className="text-sm text-[#64748B]">Contratos, certificados y comprobantes compartidos con cada colaborador.</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-3">
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
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />

          <div className="col-span-full flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#64748B] hover:border-[#27B1B8]">
              <MdAttachFile size={16} />
              {uploading ? "Subiendo…" : "Elegir archivo"}
              <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
            </label>
            {form.fileName && <span className="text-xs text-[#16A34A]">{form.fileName}</span>}
          </div>

          <button onClick={submit} disabled={uploading}
            className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            Guardar
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Empleado</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Categoría</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((d) => (
              <tr key={d.id} className="border-b border-[#F1F5F9]">
                <td className="p-3">{d.employee.user.fullName}</td>
                <td className="p-3 font-bold text-[#1A1A1A]">{d.name}</td>
                <td className="p-3">{CATEGORIES.find((c) => c.value === d.category)?.label ?? d.category}</td>
                <td className="p-3 text-[#64748B]">{fmt(d.createdAt)}</td>
                <td className="p-3">
                  <div className="flex gap-3">
                    <button onClick={() => view(d.fileUrl)} className="flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
                      <MdDownload size={14} /> Ver
                    </button>
                    <button onClick={() => remove(d.id)} className="text-xs font-bold text-[#DC2626] hover:underline">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr><td className="p-3 text-[#94A3B8]" colSpan={5}>Sin documentos cargados todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
