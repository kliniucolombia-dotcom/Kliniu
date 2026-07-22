"use client";
import { useEffect, useMemo, useState } from "react";
import { MdAccessTime, MdClose, MdSchedule, MdAttachMoney } from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";

type OvertimeRequest = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  overtimeType: string;
  reason: string | null;
  status: string;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
};

type MeResponse = { salaryAmount: number | null };

const OVERTIME_TYPES: { key: string; label: string; surcharge: number }[] = [
  { key: "DIURNA", label: "Diurna", surcharge: 0.25 },
  { key: "NOCTURNA", label: "Nocturna", surcharge: 0.75 },
  { key: "DOMINICAL_FESTIVA_DIURNA", label: "Dominical/festiva diurna", surcharge: 1.0 },
  { key: "DOMINICAL_FESTIVA_NOCTURNA", label: "Dominical/festiva nocturna", surcharge: 1.5 },
];
const OVERTIME_TYPE_MAP = Object.fromEntries(OVERTIME_TYPES.map((t) => [t.key, t]));

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada", CANCELLED: "Cancelada",
};
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  APPROVED: "bg-[#DCFCE7] text-[#16A34A]",
  REJECTED: "bg-[#FEE2E2] text-[#DC2626]",
  CANCELLED: "bg-[#F1F5F9] text-[#64748B]",
};

function fmt(d: string) {
  return fmtDateOnly(d, { day: "numeric", month: "short", year: "numeric" });
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}
function hoursBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}
function estimatedValue(hours: number, overtimeType: string, salaryAmount: number | null) {
  if (!salaryAmount) return null;
  const type = OVERTIME_TYPE_MAP[overtimeType];
  if (!type) return null;
  const hourlyRate = salaryAmount / 230;
  return Math.round(hourlyRate * (1 + type.surcharge) * hours);
}

const EMPTY_FORM = { date: "", startTime: "", endTime: "", overtimeType: "DIURNA", reason: "" };

export default function HorasExtrasPage() {
  const [requests, setRequests] = useState<OvertimeRequest[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  const load = async () => {
    setLoading(true);
    const [res, meRes] = await Promise.all([fetch("/api/rrhh-local/overtime"), fetch("/api/empleado/me")]);
    if (res.ok) setRequests(await res.json());
    else setError("No fue posible cargar tus horas extras");
    if (meRes.ok) {
      const data = await meRes.json();
      setMe({ salaryAmount: data.salaryAmount });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    setError("");
    if (!form.date || !form.startTime || !form.endTime) return setError("Completa fecha y horas");
    setSaving(true);
    const res = await fetch("/api/rrhh-local/overtime", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, reason: form.reason.trim() || null }),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible registrar las horas extras");
    }
    setSaving(false);
  };

  const cancel = async (id: string) => {
    setCancelingId(id);
    const res = await fetch(`/api/rrhh-local/overtime/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    if (res.ok) await load();
    else setError("No fue posible cancelar la solicitud");
    setCancelingId(null);
  };

  const now = new Date();
  const kpis = useMemo(() => {
    const thisMonth = requests.filter((r) => {
      const d = new Date(r.date);
      return d.getUTCMonth() === now.getMonth() && d.getUTCFullYear() === now.getFullYear();
    });
    const approvedThisMonth = thisMonth.filter((r) => r.status === "APPROVED");
    const hoursThisMonth = approvedThisMonth.reduce((s, r) => s + r.hours, 0);
    const amounts = approvedThisMonth.map((r) => estimatedValue(r.hours, r.overtimeType, me?.salaryAmount ?? null));
    const hasAmounts = amounts.some((a) => a !== null);
    const totalAmount = amounts.reduce((s: number, a) => s + (a ?? 0), 0);
    return {
      pending: requests.filter((r) => r.status === "PENDING").length,
      hoursThisMonth,
      totalAmount,
      hasAmounts,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, me]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterType && r.overtimeType !== filterType) return false;
      return true;
    });
  }, [requests, filterStatus, filterType]);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
            <MdAccessTime size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A]">Horas extras</h1>
            <p className="text-xs text-[#64748B]">Registra y consulta tus horas extras trabajadas</p>
          </div>
        </div>
        <button
          onClick={() => { setCreating((c) => !c); setForm(EMPTY_FORM); }}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1F9BA1]"
        >
          {creating ? "Cancelar" : "Registrar horas extras"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]">
            <MdSchedule size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1A1A1A]">{kpis.pending}</p>
            <p className="text-xs font-bold text-[#64748B]">Pendientes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6FAFB] text-[#27B1B8]">
            <MdAccessTime size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1A1A1A]">{kpis.hoursThisMonth.toFixed(1)}h</p>
            <p className="text-xs font-bold text-[#64748B]">Aprobadas este mes</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#16A34A]">
            <MdAttachMoney size={20} />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A]">{kpis.hasAmounts ? fmtMoney(kpis.totalAmount) : "—"}</p>
            <p className="text-xs font-bold text-[#64748B]">Valor estimado este mes</p>
          </div>
        </div>
      </div>

      {creating && (
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 md:grid-cols-3">
          <label className="text-xs font-bold text-[#64748B]">
            Fecha
            <input type="date" value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-[#64748B]">
            Hora inicio
            <input type="time" value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-[#64748B]">
            Hora fin
            <input type="time" value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-[#64748B]">
            Tipo de recargo
            <select value={form.overtimeType}
              onChange={(e) => setForm({ ...form, overtimeType: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
              {OVERTIME_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="col-span-full text-xs font-bold text-[#64748B]">
            Motivo (opcional)
            <input value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          </label>

          {form.startTime && form.endTime && (
            <p className="col-span-full text-xs text-[#64748B]">
              <strong>{hoursBetween(form.startTime, form.endTime).toFixed(1)}h</strong> a registrar
            </p>
          )}

          <button
            onClick={submit}
            disabled={saving}
            className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Enviando…" : "Registrar"}
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {OVERTIME_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Fecha</th>
              <th className="p-3">Horario</th>
              <th className="p-3">Horas</th>
              <th className="p-3">Tipo</th>
              <th className="p-3">Valor estimado</th>
              <th className="p-3">Estado</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const type = OVERTIME_TYPE_MAP[r.overtimeType];
              const amount = estimatedValue(r.hours, r.overtimeType, me?.salaryAmount ?? null);
              return (
                <tr key={r.id} className="border-b border-[#F1F5F9]">
                  <td className="p-3">{fmt(r.date)}</td>
                  <td className="p-3">{r.startTime} – {r.endTime}</td>
                  <td className="p-3">{r.hours.toFixed(1)}h</td>
                  <td className="p-3">{type ? `${type.label} (+${(type.surcharge * 100).toFixed(0)}%)` : r.overtimeType}</td>
                  <td className="p-3">{amount !== null ? fmtMoney(amount) : "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[r.status] ?? ""}`}>
                      {STATUS_LABELS[r.status] ?? r.status}
                    </span>
                    {r.status === "REJECTED" && r.reviewNote && (
                      <span className="mt-1 block text-xs text-red-500">Motivo: {r.reviewNote}</span>
                    )}
                  </td>
                  <td className="p-3">
                    {r.status === "PENDING" && (
                      <button onClick={() => cancel(r.id)} disabled={cancelingId === r.id}
                        className="flex items-center gap-1 text-xs font-bold text-[#DC2626] hover:underline disabled:opacity-50">
                        <MdClose size={14} /> {cancelingId === r.id ? "Cancelando…" : "Cancelar"}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td className="p-3 text-[#94A3B8]" colSpan={7}>Sin registros que coincidan.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
