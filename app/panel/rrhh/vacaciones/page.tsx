"use client";
import { useEffect, useState } from "react";

type TimeOffRequestRow = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string | null;
  reviewNote: string | null;
  employee: { employeeCode: string; user: { fullName: string } };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO");
}

export default function VacacionesPage() {
  const [requests, setRequests] = useState<TimeOffRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const reqRes = await fetch("/api/rrhh-local/time-off");
    if (reqRes.ok) {
      const all: TimeOffRequestRow[] = await reqRes.json();
      setRequests(all.filter((r) => r.type === "VACATION"));
    } else {
      setError("No fue posible cargar las solicitudes de vacaciones");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/rrhh-local/time-off/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "APPROVED" }),
    });
    if (res.ok) await load();
    else setError("No fue posible aprobar la solicitud");
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

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Vacaciones</h1>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {rejectingId && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-red-200 bg-red-50 p-4 md:grid-cols-3">
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

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Empleado</th>
              <th className="p-3">Desde</th>
              <th className="p-3">Hasta</th>
              <th className="p-3">Días</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F5F9]">
                <td className="p-3">{r.employee.user.fullName}</td>
                <td className="p-3">{fmt(r.startDate)}</td>
                <td className="p-3">{fmt(r.endDate)}</td>
                <td className="p-3">{r.durationDays}</td>
                <td className="p-3">
                  {r.status === "REJECTED" && r.reviewNote
                    ? <span className="text-red-500">Rechazada: {r.reviewNote}</span>
                    : r.reason ?? "—"}
                </td>
                <td className="p-3">{STATUS_LABELS[r.status] ?? r.status}</td>
                <td className="p-3">
                  {r.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(r.id)}
                        disabled={busyId === r.id}
                        className="rounded-lg bg-[#27B1B8] px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => { setRejectingId(r.id); setRejectReason(""); }}
                        disabled={busyId === r.id}
                        className="rounded-lg bg-red-500 px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-[#94A3B8]">—</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td className="p-3 text-[#94A3B8]" colSpan={7}>Sin solicitudes de vacaciones.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
