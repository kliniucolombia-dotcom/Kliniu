"use client";
import { useEffect, useState } from "react";
import { fmtDateOnly } from "@/lib/date";

type OvertimeRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  overtimeType: string;
  reason: string | null;
  status: string;
  reviewNote: string | null;
  employee: { employeeCode: string; user: { fullName: string } };
};

const TYPE_LABELS: Record<string, string> = {
  DIURNA: "Diurna (+25%)",
  NOCTURNA: "Nocturna (+75%)",
  DOMINICAL_FESTIVA_DIURNA: "Dominical/festiva diurna (+100%)",
  DOMINICAL_FESTIVA_NOCTURNA: "Dominical/festiva nocturna (+150%)",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada", CANCELLED: "Cancelada",
};

function fmt(d: string) {
  return fmtDateOnly(d);
}

export default function HorasExtrasRRHHPage() {
  const [requests, setRequests] = useState<OvertimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await fetch("/api/rrhh-local/overtime");
      if (res.ok) setRequests(await res.json());
      else setError("No fue posible cargar las horas extras");
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-black text-[#1A1A1A]">Horas extras</h1>
      <p className="text-sm text-[#64748B]">Solicitudes de horas extras registradas por el personal.</p>
      <p className="rounded-lg bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
        Solo lectura: la aprobación la gestiona el jefe directo de cada empleado.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Empleado</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Horario</th>
              <th className="p-3">Horas</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F5F9]">
                <td className="p-3">{r.employee.user.fullName}</td>
                <td className="p-3">{fmt(r.date)}</td>
                <td className="p-3">{r.startTime} – {r.endTime}</td>
                <td className="p-3">{r.hours.toFixed(1)}h</td>
                <td className="p-3">{TYPE_LABELS[r.overtimeType] ?? r.overtimeType}</td>
                <td className="p-3">{r.reason ?? "—"}</td>
                <td className="p-3">{STATUS_LABELS[r.status] ?? r.status}</td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr><td className="p-3 text-[#94A3B8]" colSpan={7}>Sin solicitudes registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
