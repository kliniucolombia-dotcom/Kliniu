"use client";
import { useEffect, useMemo, useState } from "react";
import { fmtDateOnly } from "@/lib/date";
import Link from "next/link";
import {
  MdBeachAccess, MdCalendarToday, MdInfoOutline, MdArrowForward, MdClose,
} from "react-icons/md";
import { calcVacationBalance, type VacationTimeOff } from "@/lib/vacation";
import { DonutChart } from "@/app/panel/_components/mini-charts";

type VacationRequest = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string | null;
  reviewNote: string | null;
};

type MeResponse = {
  fullName: string;
  jobTitle: string;
  hireDate: string;
  vacationBalance: { earnedDays: number; takenDays: number; pendingDays: number; availableDays: number };
  nextVacation: { startDate: string; endDate: string; durationDays: number } | null;
  vacationRequests: VacationRequest[];
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
  return fmtDateOnly(d, { day: "numeric", month: "short", year: "numeric" });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default function VacacionesPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "" });
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const load = async () => {
    const res = await fetch("/api/empleado/me");
    if (res.ok) {
      const data = (await res.json()) as MeResponse;
      setMe(data);
    } else {
      setError("No fue posible cargar tu información de vacaciones");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const requestedDays =
    form.startDate && form.endDate
      ? Math.max(1, Math.round((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1)
      : 0;
  const saldoDespues = me ? round2(me.vacationBalance.availableDays - requestedDays) : null;

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

  const cancel = async (id: string) => {
    setCancelingId(id);
    const res = await fetch(`/api/rrhh-local/time-off/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    if (res.ok) await load();
    else setError("No fue posible cancelar la solicitud");
    setCancelingId(null);
  };

  const years = useMemo(() => {
    if (!me) return [new Date().getFullYear()];
    const hireYear = new Date(me.hireDate).getFullYear();
    const currentYear = new Date().getFullYear();
    const list: number[] = [];
    for (let y = currentYear; y >= hireYear; y--) list.push(y);
    return list;
  }, [me]);

  const yearBalance = useMemo(() => {
    if (!me) return null;
    const currentYear = new Date().getFullYear();

    if (selectedYear === currentYear) {
      return {
        diasCausados: me.vacationBalance.earnedDays,
        diasTomados: me.vacationBalance.takenDays,
        diasPendientes: me.vacationBalance.pendingDays,
        diasDisponibles: me.vacationBalance.availableDays,
      };
    }

    const asOf = new Date(selectedYear, 11, 31);
    const requestsUntilAsOf: VacationTimeOff[] = me.vacationRequests
      .filter((r) => r.status === "APPROVED" && new Date(r.startDate) <= asOf)
      .map((r) => ({ type: "VACATION", status: r.status, durationDays: r.durationDays }));
    return calcVacationBalance(new Date(me.hireDate), requestsUntilAsOf, asOf);
  }, [me, selectedYear]);

  const historial = useMemo(() => {
    if (!me) return { thisYear: 0, lastYear: 0, total: 0 };
    const currentYear = new Date().getFullYear();
    const approved = me.vacationRequests.filter((r) => r.status === "APPROVED");
    const sumYear = (y: number) =>
      round2(approved.filter((r) => new Date(r.startDate).getFullYear() === y).reduce((s, r) => s + r.durationDays, 0));
    return {
      thisYear: sumYear(currentYear),
      lastYear: sumYear(currentYear - 1),
      total: round2(approved.reduce((s, r) => s + r.durationDays, 0)),
    };
  }, [me]);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;
  if (!me) return <div className="p-6 text-sm text-red-500">{error || "No fue posible cargar tu información"}</div>;

  const upcoming = [...me.vacationRequests]
    .filter((r) => r.status !== "CANCELLED")
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
    .slice(0, 3);

  const progressPct = me.vacationBalance.earnedDays > 0
    ? Math.min(100, (me.vacationBalance.availableDays / me.vacationBalance.earnedDays) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Mis vacaciones</h1>
          <p className="text-sm text-[#64748B]">Solicita y revisa el estado de tus vacaciones.</p>
        </div>
        <button
          onClick={() => setCreating((c) => !c)}
          className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1F9BA1]"
        >
          {creating ? <MdClose size={16} /> : null}
          {creating ? "Cancelar" : "Nueva solicitud"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {creating && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
          {me.vacationBalance.availableDays > 0 && (
            <p className="mb-3 text-xs font-bold text-[#64748B]">
              Días disponibles: <span className="text-[#16A34A]">{me.vacationBalance.availableDays.toFixed(2)}</span>
            </p>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input type="date" value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            <input type="date" value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            <input placeholder="Motivo (opcional)" value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
          </div>
          {requestedDays > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg bg-[#F8FAFC] p-3 text-sm">
              <span><strong>{requestedDays}</strong> días solicitados</span>
              {saldoDespues !== null && (
                <span className={saldoDespues < 0 ? "font-bold text-[#DC2626]" : "font-bold text-[#16A34A]"}>
                  Saldo después de aprobar: {saldoDespues.toFixed(2)} días
                </span>
              )}
            </div>
          )}
          <button
            onClick={submit}
            disabled={saving || !form.startDate || !form.endDate || (saldoDespues !== null && saldoDespues < 0)}
            className="mt-3 w-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Enviar solicitud"}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center gap-2">
            <MdBeachAccess className="text-[#27B1B8]" size={18} />
            <h2 className="text-sm font-black text-[#1A1A1A]">Resumen de vacaciones</h2>
          </div>
          <p className="mt-2 text-3xl font-black text-[#16A34A]">{me.vacationBalance.availableDays.toFixed(2)}</p>
          <p className="text-xs text-[#94A3B8]">Días disponibles</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div className="h-full rounded-full bg-[#27B1B8]" style={{ width: `${progressPct}%` }} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <p className="font-black text-[#1A1A1A]">{me.vacationBalance.earnedDays.toFixed(2)}</p>
              <p className="text-[#94A3B8]">Días causados</p>
            </div>
            <div>
              <p className="font-black text-[#1A1A1A]">{me.vacationBalance.takenDays.toFixed(2)}</p>
              <p className="text-[#94A3B8]">Días disfrutados</p>
            </div>
            <div>
              <p className="font-black text-[#1A1A1A]">{me.vacationBalance.pendingDays.toFixed(2)}</p>
              <p className="text-[#94A3B8]">Pendientes</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center gap-2">
            <MdCalendarToday className="text-[#27B1B8]" size={16} />
            <h2 className="text-sm font-black text-[#1A1A1A]">Próximo descanso</h2>
          </div>
          {me.nextVacation ? (
            <div className="mt-4">
              <p className="text-sm font-bold text-[#1A1A1A]">{fmt(me.nextVacation.startDate)} – {fmt(me.nextVacation.endDate)}</p>
              <p className="text-xs text-[#94A3B8]">{me.nextVacation.durationDays} días</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-[#94A3B8]">No tienes vacaciones programadas.</p>
              <p className="text-xs text-[#94A3B8]">¡Planifica tu próximo descanso!</p>
            </div>
          )}
          <button
            onClick={() => setCreating(true)}
            className="mt-4 w-full rounded-xl bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white hover:bg-[#1F9BA1]"
          >
            Nueva solicitud
          </button>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#1A1A1A]">Mis solicitudes</h2>
            <Link href="/empleado/solicitudes" className="text-xs font-bold text-[#27B1B8] hover:underline">Ver todas</Link>
          </div>
          <div className="mt-3 space-y-2">
            {upcoming.length === 0 && <p className="text-sm text-[#94A3B8]">Sin solicitudes todavía.</p>}
            {upcoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 text-xs last:border-b-0 last:pb-0">
                <div>
                  <p className="font-semibold text-[#1A1A1A]">{fmt(r.startDate)} – {fmt(r.endDate)}</p>
                  <p className="text-[#94A3B8]">{r.durationDays} días</p>
                </div>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${STATUS_STYLE[r.status] ?? ""}`}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#1A1A1A]">Días por año</h2>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs font-bold text-[#1A1A1A]"
            >
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {yearBalance && (
            <div className="mt-3 flex flex-col items-center gap-3">
              <DonutChart
                size={92}
                thickness={14}
                slices={[
                  { label: "Disponibles", value: yearBalance.diasDisponibles, color: "#27B1B8" },
                  { label: "Disfrutados", value: yearBalance.diasTomados, color: "#16A34A" },
                  { label: "Pendientes", value: yearBalance.diasPendientes, color: "#F59E0B" },
                ]}
              />
              <div className="w-full space-y-1 text-xs">
                <p className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[#64748B]"><span className="size-2 shrink-0 rounded-full bg-[#0EA5E9]" />Causados</span><strong>{yearBalance.diasCausados.toFixed(2)}</strong></p>
                <p className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[#64748B]"><span className="size-2 shrink-0 rounded-full bg-[#16A34A]" />Disfrutados</span><strong>{yearBalance.diasTomados.toFixed(2)}</strong></p>
                <p className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[#64748B]"><span className="size-2 shrink-0 rounded-full bg-[#F59E0B]" />Pendientes</span><strong>{yearBalance.diasPendientes.toFixed(2)}</strong></p>
                <p className="flex items-center justify-between"><span className="flex items-center gap-1.5 text-[#64748B]"><span className="size-2 shrink-0 rounded-full bg-[#27B1B8]" />Disponibles</span><strong>{yearBalance.diasDisponibles.toFixed(2)}</strong></p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[650px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-[11px] font-bold uppercase tracking-wide text-[#94A3B8]">
              <th className="p-3">Desde</th>
              <th className="p-3">Hasta</th>
              <th className="p-3">Días</th>
              <th className="p-3">Motivo</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {me.vacationRequests.map((r) => (
              <tr key={r.id} className="border-b border-[#F1F5F9]">
                <td className="p-3">{fmt(r.startDate)}</td>
                <td className="p-3">{fmt(r.endDate)}</td>
                <td className="p-3">{r.durationDays}</td>
                <td className="p-3">{r.reason ?? "—"}</td>
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
                    <button
                      onClick={() => cancel(r.id)}
                      disabled={cancelingId === r.id}
                      className="text-xs font-bold text-[#DC2626] hover:underline disabled:opacity-50"
                    >
                      {cancelingId === r.id ? "Cancelando…" : "Cancelar"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {me.vacationRequests.length === 0 && (
              <tr>
                <td className="p-3 text-[#94A3B8]" colSpan={6}>Sin solicitudes todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex items-start gap-4 rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
            <MdInfoOutline size={22} />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#1A1A1A]">¿Cómo se calculan mis vacaciones?</h2>
            <p className="mt-1 text-xs text-[#64748B]">
              En Colombia tienes derecho a 15 días hábiles de vacaciones por cada 365 días trabajados.
            </p>
            <p className="mt-3 rounded-lg bg-[#F8FAFC] p-3 text-center text-xs font-bold text-[#1A1A1A]">
              Días trabajados × 15 ÷ 365 = Días causados
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-[#1A1A1A]">Historial de vacaciones</h2>
            <Link href="/empleado/solicitudes" className="flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
              Ver todo <MdArrowForward size={12} />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-black text-[#16A34A]">{historial.thisYear.toFixed(2)}</p>
              <p className="text-[11px] text-[#94A3B8]">Este año</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#1A1A1A]">{historial.lastYear.toFixed(2)}</p>
              <p className="text-[11px] text-[#94A3B8]">Año anterior</p>
            </div>
            <div>
              <p className="text-2xl font-black text-[#27B1B8]">{historial.total.toFixed(2)}</p>
              <p className="text-[11px] text-[#94A3B8]">Total acumulado</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
