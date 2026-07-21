"use client";
import { useEffect, useState } from "react";
import { fmtDateOnly } from "@/lib/date";

type TimeOffRequestRow = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string | null;
  reviewNote: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  VACATION: "Vacaciones",
  PERMIT: "Permiso",
  LEAVE: "Licencia",
  INCAPACITY: "Incapacidad",
  UNPAID: "No remunerado",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
  CANCELLED: "Cancelada",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  APPROVED: "bg-[#DCFCE7] text-[#16A34A]",
  REJECTED: "bg-[#FEE2E2] text-[#DC2626]",
  CANCELLED: "bg-[#F1F5F9] text-[#64748B]",
};

function fmt(d: string) {
  return fmtDateOnly(d);
}

export default function SolicitudesPage() {
  const [requests, setRequests] = useState<TimeOffRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/rrhh-local/time-off")
      .then((r) => (r.ok ? r.json() : []))
      .then(setRequests)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-black text-[#1A1A1A]">Mis solicitudes</h1>
      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[650px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Tipo</th>
              <th className="p-3">Desde</th>
              <th className="p-3">Hasta</th>
              <th className="p-3">Días</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F5F9]">
                <td className="p-3 font-semibold">{TYPE_LABELS[r.type] ?? r.type}</td>
                <td className="p-3">{fmt(r.startDate)}</td>
                <td className="p-3">{fmt(r.endDate)}</td>
                <td className="p-3">{r.durationDays}</td>
                <td className="p-3">{r.reason ?? "—"}</td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[r.status] ?? ""}`}>
                    {STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td className="p-3 text-[#94A3B8]" colSpan={6}>Sin solicitudes todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
