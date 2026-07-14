"use client";
import { useEffect, useState } from "react";

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

type StaffUser = { id: string; fullName: string; email: string; role: string };
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

const initialForm = {
  userId: "",
  employeeCode: "",
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
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);

  const load = async () => {
    setLoading(true);
    const [empRes, usersRes, deptRes] = await Promise.all([
      fetch("/api/rrhh-local/employees"),
      fetch("/api/rrhh-local/staff-users"),
      fetch("/api/rrhh-local/departments"),
    ]);
    if (empRes.ok) setEmployees(await empRes.json());
    else setError("No fue posible cargar los empleados");
    if (usersRes.ok) setStaffUsers(await usersRes.json());
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
          userId: form.userId,
          employeeCode: form.employeeCode,
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
          <select value={form.userId}
            onChange={(e) => setForm({ ...form, userId: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
            <option value="">Selecciona usuario…</option>
            {staffUsers.map((u) => (
              <option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>
            ))}
          </select>
          <input placeholder="Código de empleado (ej. EMP-001)" value={form.employeeCode}
            onChange={(e) => setForm({ ...form, employeeCode: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Cargo" value={form.jobTitle}
            onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <select value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
            <option value="">Sin departamento</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select value={form.contractType}
            onChange={(e) => setForm({ ...form, contractType: e.target.value as typeof form.contractType })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
            {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="date" value={form.hireDate}
            onChange={(e) => setForm({ ...form, hireDate: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Salario (COP)" type="number" value={form.salaryAmount}
            onChange={(e) => setForm({ ...form, salaryAmount: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <select value={form.salaryPeriod}
            onChange={(e) => setForm({ ...form, salaryPeriod: e.target.value as typeof form.salaryPeriod })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
            {SALARY_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
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
            disabled={saving || !form.userId}
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
