"use client";
import { useEffect, useState } from "react";
import { SimpleSelect } from "../../_components/simple-select";

type EmployeeOption = { id: string; employeeCode: string; user: { fullName: string } };

type TimeOffRequestRow = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string | null;
  employee: { employeeCode: string; user: { fullName: string } };
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  APPROVED: "Aprobada",
  REJECTED: "Rechazada",
};

const TYPE_LABELS: Record<string, string> = {
  PERMIT: "Permiso",
  LEAVE: "Licencia",
  INCAPACITY: "Incapacidad",
  UNPAID: "No remunerado",
};

const ABSENCE_TYPES = ["PERMIT", "LEAVE", "INCAPACITY", "UNPAID"] as const;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO");
}

export default function AusenciasPage() {
  const [requests, setRequests] = useState<TimeOffRequestRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    type: "PERMIT" as (typeof ABSENCE_TYPES)[number],
    startDate: "",
    endDate: "",
    reason: "",
  });

  const load = async () => {
    setLoading(true);
    const [reqRes, empRes] = await Promise.all([
      fetch("/api/rrhh-local/time-off"),
      fetch("/api/rrhh-local/employees"),
    ]);
    if (reqRes.ok) {
      const all: TimeOffRequestRow[] = await reqRes.json();
      setRequests(all.filter((r) => r.type !== "VACATION"));
    } else {
      setError("No fue posible cargar las ausencias");
    }
    if (empRes.ok) setEmployees(await empRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const resolve = async (id: string, status: "APPROVED" | "REJECTED") => {
    setBusyId(id);
    const res = await fetch(`/api/rrhh-local/time-off/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
    else setError("No fue posible resolver la solicitud");
    setBusyId(null);
  };

  const submit = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ employeeId: "", type: "PERMIT", startDate: "", endDate: "", reason: "" });
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
        <h1 className="text-xl font-black text-[#1A1A1A]">Ausencias</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white"
        >
          {creating ? "Cancelar" : "Nueva ausencia"}
        </button>
      </div>
      <p className="text-sm text-[#64748B]">Registro de ausencias e incapacidades del personal.</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-3">
          <SimpleSelect
            value={form.employeeId}
            options={[
              { value: "", label: "Selecciona empleado…" },
              ...employees.map((e) => ({ value: e.id, label: `${e.user.fullName} (${e.employeeCode})` })),
            ]}
            onChange={(v) => setForm({ ...form, employeeId: v })}
          />
          <SimpleSelect
            value={form.type}
            options={ABSENCE_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }))}
            onChange={(v) => setForm({ ...form, type: v as typeof form.type })}
          />
          <input type="date" value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input type="date" value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <input placeholder="Motivo" value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            className="col-span-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <button
            onClick={submit}
            disabled={saving || !form.employeeId || !form.startDate || !form.endDate}
            className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Crear"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Empleado</th>
              <th className="p-3">Tipo</th>
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
                <td className="p-3">{TYPE_LABELS[r.type] ?? r.type}</td>
                <td className="p-3">{fmt(r.startDate)}</td>
                <td className="p-3">{fmt(r.endDate)}</td>
                <td className="p-3">{r.durationDays}</td>
                <td className="p-3">{r.reason ?? "—"}</td>
                <td className="p-3">{STATUS_LABELS[r.status] ?? r.status}</td>
                <td className="p-3">
                  {r.status === "PENDING" ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolve(r.id, "APPROVED")}
                        disabled={busyId === r.id}
                        className="rounded-lg bg-[#27B1B8] px-2 py-1 text-xs font-bold text-white disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => resolve(r.id, "REJECTED")}
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
                <td className="p-3 text-[#94A3B8]" colSpan={8}>Sin ausencias registradas.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
