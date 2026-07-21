"use client";
import { useEffect, useState } from "react";
import { MdAttachFile, MdDownload } from "react-icons/md";
import { SimpleSelect } from "../../_components/simple-select";

type EmployeeRow = {
  id: string;
  userId: string;
  employeeCode: string;
  jobTitle: string;
  status: string;
  salaryAmount: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  user: { fullName: string };
};

type Payslip = {
  id: string;
  period: string;
  grossAmount: number;
  deductions: number;
  netAmount: number;
  fileUrl: string | null;
  employee: { employeeCode: string; user: { fullName: string } };
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Activo",
  ON_LEAVE: "En licencia",
  TERMINATED: "Retirado",
};

const PERIOD_LABELS: Record<string, string> = {
  MONTHLY: "Mensual",
  BIWEEKLY: "Quincenal",
  HOURLY: "Por hora",
};

function formatMoney(amount: number, currency = "COP") {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function NominaPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ employeeId: "", period: "", grossAmount: "", deductions: "", filePath: "", fileName: "" });

  const load = async () => {
    setLoading(true);
    const [empRes, paySlipRes] = await Promise.all([
      fetch("/api/rrhh-local/employees"),
      fetch("/api/rrhh-local/payslips"),
    ]);
    if (empRes.ok) setRows(await empRes.json());
    else setError("No fue posible cargar los empleados");
    if (paySlipRes.ok) setPayslips(await paySlipRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const uploadFile = async (file: File) => {
    const employee = rows.find((e) => e.id === form.employeeId);
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
    else setError(data.error || "No fue posible abrir el desprendible");
  };

  const submit = async () => {
    setError("");
    const gross = Number(form.grossAmount);
    const ded = Number(form.deductions);
    if (!form.employeeId || !form.period.trim() || !gross || Number.isNaN(ded)) {
      return setError("Empleado, periodo, devengado y deducciones son obligatorios");
    }
    setSaving(true);
    const res = await fetch("/api/rrhh-local/payslips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: form.employeeId,
        period: form.period.trim(),
        grossAmount: gross,
        deductions: ded,
        fileUrl: form.filePath || null,
        fileName: form.fileName || null,
      }),
    });
    if (res.ok) {
      setForm({ employeeId: "", period: "", grossAmount: "", deductions: "", filePath: "", fileName: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible crear el desprendible");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!window.confirm("¿Eliminar este desprendible?")) return;
    const res = await fetch(`/api/rrhh-local/payslips/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Nómina</h1>
        <button onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white">
          {creating ? "Cancelar" : "Subir desprendible"}
        </button>
      </div>
      <p className="text-sm text-[#64748B]">Salario base vigente por empleado y desprendibles de pago publicados.</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-3">
          <SimpleSelect
            value={form.employeeId}
            options={[
              { value: "", label: "Selecciona empleado…" },
              ...rows.map((e) => ({ value: e.id, label: `${e.user.fullName} (${e.employeeCode})` })),
            ]}
            onChange={(v) => setForm({ ...form, employeeId: v })}
          />
          <input placeholder="Periodo (ej. 2026-07)" value={form.period}
            onChange={(e) => setForm({ ...form, period: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input type="number" placeholder="Devengado" value={form.grossAmount}
            onChange={(e) => setForm({ ...form, grossAmount: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input type="number" placeholder="Deducciones" value={form.deductions}
            onChange={(e) => setForm({ ...form, deductions: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />

          <div className="col-span-full flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#64748B] hover:border-[#27B1B8]">
              <MdAttachFile size={16} />
              {uploading ? "Subiendo…" : "Adjuntar PDF (opcional)"}
              <input type="file" className="hidden" accept="application/pdf"
                onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
            </label>
            {form.fileName && <span className="text-xs text-[#16A34A]">{form.fileName}</span>}
          </div>

          <button onClick={submit} disabled={saving || uploading}
            className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
            {saving ? "Guardando…" : "Publicar"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Código</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Cargo</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Salario base</th>
              <th className="p-3">Periodicidad</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F5F9]">
                <td className="p-3 font-semibold">{r.employeeCode}</td>
                <td className="p-3">{r.user.fullName}</td>
                <td className="p-3">{r.jobTitle}</td>
                <td className="p-3">{STATUS_LABELS[r.status] ?? r.status}</td>
                <td className="p-3">{r.salaryAmount != null ? formatMoney(r.salaryAmount, r.salaryCurrency) : "—"}</td>
                <td className="p-3">{PERIOD_LABELS[r.salaryPeriod] ?? r.salaryPeriod}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="p-3 text-[#94A3B8]" colSpan={6}>Sin empleados registrados todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-lg font-black text-[#1A1A1A]">Desprendibles publicados</h2>
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[700px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Empleado</th>
              <th className="p-3">Periodo</th>
              <th className="p-3">Devengado</th>
              <th className="p-3">Deducciones</th>
              <th className="p-3">Neto</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {payslips.map((p) => (
              <tr key={p.id} className="border-b border-[#F1F5F9]">
                <td className="p-3">{p.employee.user.fullName}</td>
                <td className="p-3 font-bold text-[#1A1A1A]">{p.period}</td>
                <td className="p-3">{formatMoney(p.grossAmount)}</td>
                <td className="p-3 text-[#DC2626]">-{formatMoney(p.deductions)}</td>
                <td className="p-3 font-bold text-[#16A34A]">{formatMoney(p.netAmount)}</td>
                <td className="p-3">
                  <div className="flex gap-3">
                    {p.fileUrl && (
                      <button onClick={() => view(p.fileUrl!)} className="flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
                        <MdDownload size={14} /> Ver
                      </button>
                    )}
                    <button onClick={() => remove(p.id)} className="text-xs font-bold text-[#DC2626] hover:underline">
                      Eliminar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {payslips.length === 0 && (
              <tr><td className="p-3 text-[#94A3B8]" colSpan={6}>Sin desprendibles publicados todavía.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
