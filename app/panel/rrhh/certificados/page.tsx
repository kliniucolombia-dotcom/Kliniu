"use client";
import { useEffect, useState } from "react";
import { MdVerified, MdCheckCircle, MdCancel, MdHourglassEmpty } from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type CertificateRequestRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  includeSalary: boolean;
  reviewNote: string | null;
  createdAt: string;
  employee: { employeeCode: string; jobTitle: string; user: { fullName: string } };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En revisión",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  APPROVED: "bg-[#DCFCE7] text-[#16A34A]",
  REJECTED: "bg-[#FEE2E2] text-[#DC2626]",
};

export default function CertificadosPage() {
  const [requests, setRequests] = useState<CertificateRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/rrhh-local/certificates");
    if (res.ok) setRequests(await res.json());
    else setError("No fue posible cargar las solicitudes");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useRealtimeRefresh(["timeoff"], load);

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/rrhh-local/certificates/${id}`, {
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
    const res = await fetch(`/api/rrhh-local/certificates/${rejectingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED", reviewNote: rejectReason.trim() }),
    });
    if (res.ok) { setRejectingId(null); setRejectReason(""); await load(); }
    else setError("No fue posible rechazar la solicitud");
    setBusyId(null);
  };

  const pending = requests.filter((r) => r.status === "PENDING");

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdVerified size={22} />
        </div>
        <div>
          <h1 className="text-lg font-black text-[#1A1A1A]">Certificados laborales</h1>
          <p className="text-sm text-[#64748B]">Aprueba o rechaza las solicitudes de certificado de los empleados.</p>
        </div>
      </div>

      {error && <p className="mb-4 text-sm text-red-500">{error}</p>}

      {loading ? (
        <p className="text-sm text-[#64748B]">Cargando...</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-[#64748B]">Aún no hay solicitudes de certificado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-left text-xs font-semibold text-[#64748B]">
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Solicitado</th>
                <th className="px-4 py-3">Incluye salario</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r.id} className="border-b border-[#F1F5F9] last:border-0">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-[#1A1A1A]">{r.employee.user.fullName}</p>
                    <p className="text-xs text-[#94A3B8]">{r.employee.jobTitle}</p>
                  </td>
                  <td className="px-4 py-3 text-[#334155]">{fmtDateOnly(r.createdAt)}</td>
                  <td className="px-4 py-3 text-[#334155]">{r.includeSalary ? "Sí" : "No"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                      {r.status === "PENDING" && <MdHourglassEmpty size={13} />}
                      {r.status === "APPROVED" && <MdCheckCircle size={13} />}
                      {r.status === "REJECTED" && <MdCancel size={13} />}
                      {STATUS_LABELS[r.status]}
                    </span>
                    {r.status === "REJECTED" && r.reviewNote && (
                      <p className="mt-1 text-xs text-[#94A3B8]">{r.reviewNote}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => approve(r.id)}
                          disabled={busyId === r.id}
                          className="rounded-lg bg-[#16A34A] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#15803D] disabled:opacity-60"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => { setRejectingId(r.id); setRejectReason(""); }}
                          disabled={busyId === r.id}
                          className="rounded-lg bg-[#FEE2E2] px-3 py-1.5 text-xs font-bold text-[#DC2626] hover:bg-[#FECACA] disabled:opacity-60"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5">
            <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">Motivo de rechazo</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="mb-4 w-full rounded-lg border border-[#E2E8F0] p-2 text-sm"
              placeholder="Explica por qué se rechaza la solicitud"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setRejectingId(null)} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#64748B]">
                Cancelar
              </button>
              <button
                onClick={confirmReject}
                disabled={!rejectReason.trim() || busyId === rejectingId}
                className="rounded-lg bg-[#DC2626] px-3 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                Rechazar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
