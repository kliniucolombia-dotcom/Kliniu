"use client";
import { useEffect, useState } from "react";
import { SimpleSelect } from "../../_components/simple-select";

type EmployeeRow = {
  id: string;
  employeeCode: string;
  jobTitle: string;
  status: string;
  hireDate: string;
  salaryAmount: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  user: { fullName: string; email: string };
  department: { name: string } | null;
};

type DepartmentOption = { id: string; name: string };

const CONTRACT_TYPES = [
  "INDEFINITE",
  "FIXED_TERM",
  "WORK_OR_LABOR",
  "APPRENTICESHIP",
  "TEMPORARY",
  "CIVIL",
] as const;

const SALARY_PERIODS = ["MONTHLY", "BIWEEKLY", "HOURLY"] as const;

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

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINITE: "Indefinido",
  FIXED_TERM: "Término fijo",
  WORK_OR_LABOR: "Obra o labor",
  APPRENTICESHIP: "Aprendizaje",
  TEMPORARY: "Temporal",
  CIVIL: "Civil",
};

const initialForm = {
  fullName: "",
  email: "",
  cedula: "",
  jobTitle: "",
  departmentId: "",
  contractType: "INDEFINITE" as (typeof CONTRACT_TYPES)[number],
  hireDate: new Date().toISOString().slice(0, 10),
  salaryAmount: "",
  salaryPeriod: "MONTHLY" as (typeof SALARY_PERIODS)[number],
  eps: "",
  afp: "",
  arl: "",
};

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    setLoading(true);
    const [empRes, deptRes] = await Promise.all([
      fetch("/api/rrhh-local/employees"),
      fetch("/api/rrhh-local/departments"),
    ]);
    if (empRes.ok) setEmployees(await empRes.json());
    else setError("No fue posible cargar los empleados");
    if (deptRes.ok) setDepartments(await deptRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/rrhh-local/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          cedula: form.cedula,
          jobTitle: form.jobTitle,
          departmentId: form.departmentId || undefined,
          contractType: form.contractType,
          hireDate: form.hireDate,
          salaryAmount: form.salaryAmount ? Number(form.salaryAmount) : undefined,
          salaryPeriod: form.salaryPeriod,
          eps: form.eps || undefined,
          afp: form.afp || undefined,
          arl: form.arl || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No fue posible crear el empleado");
      }
      setForm(initialForm);
      setCreating(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear empleado");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Empleados</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white"
        >
          {creating ? "Cancelar" : "Nuevo empleado"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-3">
          <input placeholder="Nombre completo" value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Correo (para iniciar sesión)" type="email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Cédula de ciudadanía (será la contraseña)" value={form.cedula}
            onChange={(e) => setForm({ ...form, cedula: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Cargo" value={form.jobTitle}
            onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <SimpleSelect
            value={form.departmentId}
            options={[
              { value: "", label: "Sin departamento" },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
            onChange={(v) => setForm({ ...form, departmentId: v })}
          />
          <SimpleSelect
            value={form.contractType}
            options={CONTRACT_TYPES.map((c) => ({ value: c, label: CONTRACT_LABELS[c] }))}
            onChange={(v) => setForm({ ...form, contractType: v as typeof form.contractType })}
          />
          <input type="date" value={form.hireDate}
            onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Salario (COP)" type="number" value={form.salaryAmount}
            onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <SimpleSelect
            value={form.salaryPeriod}
            options={SALARY_PERIODS.map((p) => ({ value: p, label: PERIOD_LABELS[p] }))}
            onChange={(v) => setForm({ ...form, salaryPeriod: v as typeof form.salaryPeriod })}
          />
          <input placeholder="EPS" value={form.eps}
            onChange={(e) => setForm({ ...form, eps: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="AFP" value={form.afp}
            onChange={(e) => setForm({ ...form, afp: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="ARL" value={form.arl}
            onChange={(e) => setForm({ ...form, arl: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <button
            onClick={submit}
            disabled={saving || !form.fullName || !form.email || !form.cedula || !form.jobTitle}
            className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Contratar"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Código</th>
              <th className="p-3">Nombre</th>
              <th className="p-3">Cargo</th>
              <th className="p-3">Departamento</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Salario</th>
              <th className="p-3">Fecha de ingreso</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className="border-b border-[#F1F5F9]">
                <td className="p-3 font-semibold">{e.employeeCode}</td>
                <td className="p-3">{e.user.fullName}</td>
                <td className="p-3">{e.jobTitle}</td>
                <td className="p-3">{e.department?.name ?? "—"}</td>
                <td className="p-3">{STATUS_LABELS[e.status] ?? e.status}</td>
                <td className="p-3">
                  {e.salaryAmount != null ? formatMoney(e.salaryAmount, e.salaryCurrency) : "—"}
                  {e.salaryAmount != null && (
                    <span className="text-xs text-[#94A3B8]"> / {PERIOD_LABELS[e.salaryPeriod] ?? e.salaryPeriod}</span>
                  )}
                </td>
                <td className="p-3">{new Date(e.hireDate).toLocaleDateString("es-CO")}</td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td className="p-3 text-[#94A3B8]" colSpan={7}>Sin empleados registrados todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
