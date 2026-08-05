"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdAccountBalanceWallet, MdEventBusy, MdCheckCircle, MdHourglassEmpty,
  MdCalendarToday, MdCheck,
} from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type Payslip = {
  id: string;
  period: string;
  netAmount: number;
  paymentDueDate: string | null;
  isPaid: boolean;
  paidAt: string | null;
  employee: { user: { fullName: string } };
};

type Kpis = {
  montoPendiente: number;
  cantidadPendiente: number;
  proximos7Dias: number;
  sinFecha: number;
  pagadoEsteMes: number;
};

function money(amount: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);
}

function fmt(d: string | null) {
  if (!d) return "Sin fecha";
  return fmtDateOnly(d, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default function TesoreriaPanelPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"PENDIENTE" | "PAGADO" | "TODOS">("PENDIENTE");
  const [savingId, setSavingId] = useState<string | null>(null);
  const [dueDraft, setDueDraft] = useState<Record<string, string>>({});

  const load = async () => {
    const res = await fetch("/api/rrhh-local/tesoreria");
    if (res.ok) {
      const data = await res.json();
      setPayslips(data.payslips);
      setKpis(data.kpis);
    } else {
      setError("No fue posible cargar la tesorería");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useRealtimeRefresh(["payslips"], load);

  const filtered = useMemo(() => payslips.filter((p) => {
    if (statusFilter === "PENDIENTE") return !p.isPaid;
    if (statusFilter === "PAGADO") return p.isPaid;
    return true;
  }), [payslips, statusFilter]);

  const markPaid = async (id: string) => {
    setSavingId(id);
    setError("");
    const res = await fetch(`/api/rrhh-local/payslips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaid: true }),
    });
    if (res.ok) await load();
    else setError("No fue posible marcar el pago");
    setSavingId(null);
  };

  const saveDueDate = async (id: string) => {
    const value = dueDraft[id];
    if (value === undefined) return;
    setSavingId(id);
    setError("");
    const res = await fetch(`/api/rrhh-local/payslips/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentDueDate: value || null }),
    });
    if (res.ok) {
      await load();
      setDueDraft((prev) => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      setError("No fue posible actualizar la fecha");
    }
    setSavingId(null);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-black text-[#1A1A1A]">Tesorería</h1>
        <p className="text-xs text-[#64748B]">Flujo de caja de nómina: qué desprendible se paga y cuándo.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {kpis && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <Kpi value={money(kpis.montoPendiente)} label="Monto pendiente" hint={`${kpis.cantidadPendiente} desprendibles`} icon={<MdAccountBalanceWallet size={20} />} tone="bg-[#FEF3C7] text-[#B45309]" />
          <Kpi value={String(kpis.proximos7Dias)} label="Vencen en 7 días" hint="Requieren atención" icon={<MdEventBusy size={20} />} tone="bg-[#FEE2E2] text-[#DC2626]" />
          <Kpi value={String(kpis.sinFecha)} label="Sin fecha de pago" hint="Falta programar" icon={<MdHourglassEmpty size={20} />} tone="bg-[#DBEAFE] text-[#2563EB]" />
          <Kpi value={money(kpis.pagadoEsteMes)} label="Pagado este mes" hint="Confirmado" icon={<MdCheckCircle size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
        </div>
      )}

      <div className="flex gap-2">
        {(["PENDIENTE", "PAGADO", "TODOS"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${statusFilter === s ? "bg-[#27B1B8] text-white" : "border border-[#E2E8F0] bg-white text-[#64748B]"}`}>
            {s === "PENDIENTE" ? "Pendientes" : s === "PAGADO" ? "Pagados" : "Todos"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Colaborador</th>
              <th className="p-3">Periodo</th>
              <th className="p-3">Neto</th>
              <th className="p-3">Fecha de pago</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                <td className="p-3 text-[#1A1A1A]">{p.employee.user.fullName}</td>
                <td className="p-3 text-[#64748B]">{p.period}</td>
                <td className="p-3 font-bold text-[#1A1A1A]">{money(p.netAmount)}</td>
                <td className="p-3">
                  {p.isPaid ? (
                    <span className="text-[#64748B]">{fmt(p.paidAt)}</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <input type="date"
                        value={dueDraft[p.id] ?? (p.paymentDueDate ? p.paymentDueDate.slice(0, 10) : "")}
                        onChange={(e) => setDueDraft((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs" />
                      {dueDraft[p.id] !== undefined && (
                        <button onClick={() => saveDueDate(p.id)} disabled={savingId === p.id}
                          className="rounded-lg bg-[#27B1B8] p-1.5 text-white disabled:opacity-50">
                          <MdCalendarToday size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.isPaid ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEF3C7] text-[#B45309]"}`}>
                    {p.isPaid ? "Pagado" : "Pendiente"}
                  </span>
                </td>
                <td className="p-3">
                  {!p.isPaid && (
                    <button onClick={() => markPaid(p.id)} disabled={savingId === p.id}
                      className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-bold text-[#16A34A] hover:bg-[#F0FDF4] disabled:opacity-50">
                      <MdCheck size={14} /> Marcar pagado
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-sm text-[#94A3B8]">No hay desprendibles con este filtro.</p>
        )}
      </div>
    </div>
  );
}

function Kpi({ value, label, hint, icon, tone }: { value: string; label: string; hint: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="truncate text-lg font-black text-[#1A1A1A]">{value}</p>
        <p className="text-xs font-bold text-[#64748B]">{label}</p>
        <p className="truncate text-[11px] text-[#94A3B8]">{hint}</p>
      </div>
    </div>
  );
}
