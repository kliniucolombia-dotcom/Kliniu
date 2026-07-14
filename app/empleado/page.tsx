"use client";
import { useEffect, useState } from "react";

type TimeOffRequestRow = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string | null;
  reviewNote: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO");
}

export default function EmpleadoVacacionesPage() {
  const [requests, setRequests] = useState<TimeOffRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "" });

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/rrhh-local/time-off");
    if (res.ok) setRequests(await res.json());
    else setError("No fue posible cargar tus solicitudes");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, type: "VACATION" }),
    });
    if (res.ok) {
      setForm({ startDate: "", endDate: "", reason: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible crear la solicitud");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Mis vacaciones</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white"
        >
          {creating ? "Cancelar" : "Nueva solicitud"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-3">
          <input type="date" value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input type="date" value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Motivo (opcional)" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <button
            onClick={submit}
            disabled={saving || !form.startDate || !form.endDate}
            className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Enviar solicitud"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
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
                <td className="p-3">{fmt(r.startDate)}</td>
                <td className="p-3">{fmt(r.endDate)}</td>
                <td className="p-3">{r.durationDays}</td>
                <td className="p-3">{r.reason ?? "—"}</td>
                <td className="p-3">
                  {STATUS_LABELS[r.status] ?? r.status}
                  {r.status === "REJECTED" && r.reviewNote && (
                    <span className="block text-xs text-red-500">Motivo: {r.reviewNote}</span>
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td className="p-3 text-[#94A3B8]" colSpan={5}>Sin solicitudes todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
