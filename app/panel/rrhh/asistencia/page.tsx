"use client";
import { useEffect, useState } from "react";

type EmployeeOption = { id: string; employeeCode: string; user: { fullName: string } };

type AttendanceRow = {
  id: string;
  date: string;
  status: string;
  note: string | null;
  employee: { employeeCode: string; user: { fullName: string } };
};

const STATUS_LABELS: Record<string, string> = {
  PRESENT: "Presente",
  ABSENT: "Ausente",
  LATE: "Tarde",
};

const STATUS_OPTIONS = ["PRESENT", "ABSENT", "LATE"] as const;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO");
}

export default function AsistenciaPage() {
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    date: new Date().toISOString().slice(0, 10),
    status: "PRESENT" as (typeof STATUS_OPTIONS)[number],
    note: "",
  });

  const load = async () => {
    setLoading(true);
    const [recRes, empRes] = await Promise.all([
      fetch("/api/rrhh-local/attendance"),
      fetch("/api/rrhh-local/employees"),
    ]);
    if (recRes.ok) setRecords(await recRes.json());
    else setError("No fue posible cargar la asistencia");
    if (empRes.ok) setEmployees(await empRes.json());
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setError("");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setForm({ ...form, note: "" });
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible registrar la asistencia");
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#1A1A1A]">Asistencia</h1>
        <button
          onClick={() => setCreating((c) => !c)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white"
        >
          {creating ? "Cancelar" : "Registrar asistencia"}
        </button>
      </div>
      <p className="text-sm text-[#64748B]">Registro diario de asistencia por empleado — datos reales de Kliniu.</p>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-4">
          <select value={form.employeeId}
            onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
            <option value="">Selecciona empleado…</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>{e.user.fullName} ({e.employeeCode})</option>
            ))}
          </select>
          <input type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <select value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <input placeholder="Nota (opcional)" value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          <button
            onClick={submit}
            disabled={saving || !form.employeeId}
            className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Fecha</th>
              <th className="p-3">Empleado</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Nota</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F5F9]">
                <td className="p-3">{fmt(r.date)}</td>
                <td className="p-3">{r.employee.user.fullName}</td>
                <td className="p-3">{STATUS_LABELS[r.status] ?? r.status}</td>
                <td className="p-3">{r.note ?? "—"}</td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td className="p-3 text-[#94A3B8]" colSpan={4}>Sin registros de asistencia todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
