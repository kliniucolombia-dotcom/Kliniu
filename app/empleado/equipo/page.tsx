"use client";
import { useEffect, useState } from "react";
import { fmtDateOnly } from "@/lib/date";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type TimeOffRow = {
  id: string;
  type: string;
  subType: string | null;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string | null;
  reviewNote: string | null;
  isPaid: boolean | null;
  incapacityNumber: string | null;
  incapacityType: string | null;
  employee: { fullName: string };
};

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
  employee: { fullName: string };
};

const TYPE_LABELS: Record<string, string> = {
  VACATION: "Vacaciones",
  PERMIT: "Permiso",
  LEAVE: "Licencia",
  INCAPACITY: "Incapacidad",
  UNPAID: "No remunerado",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada", CANCELLED: "Cancelada",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  APPROVED: "bg-[#DCFCE7] text-[#16A34A]",
  REJECTED: "bg-[#FEE2E2] text-[#DC2626]",
  CANCELLED: "bg-[#F1F5F9] text-[#64748B]",
};

const OVERTIME_TYPE_LABELS: Record<string, string> = {
  DIURNA: "Diurna (+25%)",
  NOCTURNA: "Nocturna (+75%)",
  DOMINICAL_FESTIVA_DIURNA: "Dominical/festiva diurna (+100%)",
  DOMINICAL_FESTIVA_NOCTURNA: "Dominical/festiva nocturna (+150%)",
};

function fmt(d: string) {
  return fmtDateOnly(d);
}

export default function EquipoPage() {
  const [timeOff, setTimeOff] = useState<TimeOffRow[]>([]);
  const [overtime, setOvertime] = useState<OvertimeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [payingId, setPayingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/empleado/equipo");
    if (res.ok) {
      const data = await res.json();
      setTimeOff(data.timeOff);
      setOvertime(data.overtime);
    } else {
      setError("No fue posible cargar las solicitudes de tu equipo");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useRealtimeRefresh(["timeoff"], load);

  const approveTimeOff = async (r: TimeOffRow, isPaid?: boolean) => {
    setBusyId(r.id);
    const res = await fetch(`/api/rrhh-local/time-off/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED", isPaid }),
    });
    if (res.ok) {
      setPayingId(null);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible aprobar la solicitud");
    }
    setBusyId(null);
  };

  const confirmReject = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    setBusyId(rejectingId);
    const res = await fetch(`/api/rrhh-local/time-off/${rejectingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED", reviewNote: rejectReason.trim() }),
    });
    if (res.ok) {
      setRejectingId(null);
      setRejectReason("");
      await load();
    } else {
      setError("No fue posible rechazar la solicitud");
    }
    setBusyId(null);
  };

  const resolveOvertime = async (id: string, status: "APPROVED" | "REJECTED") => {
    let reviewNote: string | null = null;
    if (status === "REJECTED") {
      reviewNote = window.prompt("Motivo de rechazo:");
      if (!reviewNote?.trim()) return;
    }
    setBusyId(id);
    const res = await fetch(`/api/rrhh-local/overtime/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    if (res.ok) await load();
    else setError("No fue posible resolver la solicitud");
    setBusyId(null);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  const timeOffPending = timeOff.filter((r) => r.status === "PENDING");
  const timeOffHistory = timeOff.filter((r) => r.status !== "PENDING");
  const overtimePending = overtime.filter((r) => r.status === "PENDING");
  const overtimeHistory = overtime.filter((r) => r.status !== "PENDING");

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-black text-[#1A1A1A]">Mi equipo</h1>
        <p className="text-sm text-[#64748B]">Aprueba vacaciones, permisos, incapacidades y horas extra de tu equipo.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {timeOff.length === 0 && overtime.length === 0 && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 text-center text-sm text-[#94A3B8]">
          No tienes personas a cargo o tu equipo no tiene solicitudes registradas.
        </div>
      )}

      {rejectingId && (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 md:grid-cols-3">
          <input
            placeholder="Motivo del rechazo"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="col-span-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm md:col-span-2"
          />
          <div className="flex gap-2">
            <button
              onClick={confirmReject}
              disabled={busyId === rejectingId || !rejectReason.trim()}
              className="flex-1 rounded-lg bg-red-500 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {busyId === rejectingId ? "Guardando…" : "Confirmar rechazo"}
            </button>
            <button
              onClick={() => { setRejectingId(null); setRejectReason(""); }}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-bold text-[#1A1A1A]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {timeOffPending.length > 0 && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="mb-3 text-sm font-black text-[#1A1A1A]">Pendientes de aprobar</h2>
          <div className="space-y-3">
            {timeOffPending.map((r) => (
              <div key={r.id} className="rounded-xl border border-[#E2E8F0] p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-[#1A1A1A]">
                      {r.employee.fullName} · {TYPE_LABELS[r.type] ?? r.type}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      {fmt(r.startDate)} – {fmt(r.endDate)} · {r.durationDays} días
                      {r.reason ? ` · ${r.reason}` : ""}
                    </p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                </div>

                {r.type === "PERMIT" && payingId === r.id ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-[#F8FAFC] p-3">
                    <span className="text-xs font-bold text-[#64748B]">¿Es remunerado?</span>
                    <button
                      onClick={() => approveTimeOff(r, true)}
                      disabled={busyId === r.id}
                      className="rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Remunerado
                    </button>
                    <button
                      onClick={() => approveTimeOff(r, false)}
                      disabled={busyId === r.id}
                      className="rounded-lg bg-[#64748B] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      No remunerado
                    </button>
                    <button
                      onClick={() => setPayingId(null)}
                      className="text-xs font-bold text-[#94A3B8] hover:underline"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => (r.type === "PERMIT" ? setPayingId(r.id) : approveTimeOff(r))}
                      disabled={busyId === r.id}
                      className="rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Aprobar
                    </button>
                    <button
                      onClick={() => { setRejectingId(r.id); setRejectReason(""); }}
                      disabled={busyId === r.id}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                    >
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {overtimePending.length > 0 && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="mb-3 text-sm font-black text-[#1A1A1A]">Horas extra pendientes</h2>
          <div className="space-y-3">
            {overtimePending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] p-3">
                <div>
                  <p className="text-sm font-bold text-[#1A1A1A]">{r.employee.fullName}</p>
                  <p className="text-xs text-[#64748B]">
                    {fmt(r.date)} · {r.startTime}–{r.endTime} · {r.hours.toFixed(1)}h · {OVERTIME_TYPE_LABELS[r.overtimeType] ?? r.overtimeType}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => resolveOvertime(r.id, "APPROVED")} disabled={busyId === r.id}
                    className="rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                    Aprobar
                  </button>
                  <button onClick={() => resolveOvertime(r.id, "REJECTED")} disabled={busyId === r.id}
                    className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(timeOffHistory.length > 0 || overtimeHistory.length > 0) && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="mb-3 text-sm font-black text-[#1A1A1A]">Historial de tu equipo</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
                  <th className="p-2">Empleado</th>
                  <th className="p-2">Tipo</th>
                  <th className="p-2">Fechas</th>
                  <th className="p-2">Estado</th>
                </tr>
              </thead>
              <tbody>
                {timeOffHistory.map((r) => (
                  <tr key={r.id} className="border-b border-[#F1F5F9]">
                    <td className="p-2">{r.employee.fullName}</td>
                    <td className="p-2">
                      {TYPE_LABELS[r.type] ?? r.type}
                      {r.type === "PERMIT" && r.isPaid !== null && (
                        <span className="text-xs text-[#94A3B8]"> · {r.isPaid ? "Remunerado" : "No remunerado"}</span>
                      )}
                    </td>
                    <td className="p-2">{fmt(r.startDate)} – {fmt(r.endDate)}</td>
                    <td className="p-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
                {overtimeHistory.map((r) => (
                  <tr key={r.id} className="border-b border-[#F1F5F9]">
                    <td className="p-2">{r.employee.fullName}</td>
                    <td className="p-2">Horas extra</td>
                    <td className="p-2">{fmt(r.date)}</td>
                    <td className="p-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[r.status]}`}>
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
