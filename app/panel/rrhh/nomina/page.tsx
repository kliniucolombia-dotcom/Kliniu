"use client";
import { useEffect, useState } from "react";

type EmployeeRow = {
  id: string;
  employeeCode: string;
  jobTitle: string;
  status: string;
  salaryAmount: number | null;
  salaryCurrency: string;
  salaryPeriod: string;
  user: { fullName: string };
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

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export default function NominaPage() {
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await fetch("/api/rrhh-local/employees");
      if (res.ok) setRows(await res.json());
      else setError("No fue posible cargar los empleados");
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-black text-[#1A1A1A]">Nómina</h1>
      <p className="text-sm text-[#64748B]">Salario base vigente por empleado. Pagos, deducciones y liquidaciones aún no están conectados.</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

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
    </div>
  );
}
