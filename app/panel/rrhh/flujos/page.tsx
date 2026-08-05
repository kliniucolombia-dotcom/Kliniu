"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdSchedule, MdBeachAccess, MdAccessTime, MdCardGiftcard, MdDescription,
  MdSupportAgent, MdSearch, MdCheck, MdClose, MdInfoOutline,
} from "react-icons/md";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { fmtDateOnly } from "@/lib/date";
import { SimpleSelect } from "@/app/panel/_components/simple-select";

type EmployeeRef = { employee: { user: { fullName: string } } };

type TimeOff = EmployeeRef & { id: string; type: string; startDate: string; endDate: string; createdAt: string };
type Overtime = EmployeeRef & { id: string; date: string; hours: number; createdAt: string };
type BenefitReq = EmployeeRef & { id: string; benefit: { title: string }; createdAt: string };
type CertificateReq = EmployeeRef & { id: string; includeSalary: boolean; createdAt: string };
type TicketReq = EmployeeRef & { id: string; code: string; subject: string; category: { name: string }; status: string; createdAt: string };

type FlujosData = {
  timeOff: TimeOff[];
  overtime: Overtime[];
  benefitRequests: BenefitReq[];
  certificates: CertificateReq[];
  tickets: TicketReq[];
};

const TIME_OFF_LABELS: Record<string, string> = {
  VACATION: "Vacaciones",
  PERMIT: "Permiso",
  LEAVE: "Licencia",
  INCAPACITY: "Incapacidad",
  UNPAID: "Sin remuneración",
};

function fmt(d: string) {
  return fmtDateOnly(d, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function daysWaiting(createdAt: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)));
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

type Row = {
  id: string;
  kind: "timeOff" | "overtime" | "benefit" | "certificate" | "ticket";
  name: string;
  detail: string;
  createdAt: string;
  actionable: boolean;
};

export default function FlujosPanelPage() {
  const [data, setData] = useState<FlujosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectKind, setRejectKind] = useState<"benefit" | "certificate" | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = async () => {
    const res = await fetch("/api/rrhh-local/flujos");
    if (res.ok) setData(await res.json());
    else setError("No fue posible cargar los flujos pendientes");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useRealtimeRefresh(["timeoff", "tickets"], load);

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    return [
      ...data.timeOff.map((r): Row => ({
        id: r.id, kind: "timeOff", name: r.employee.user.fullName,
        detail: `${TIME_OFF_LABELS[r.type] || r.type} · ${fmt(r.startDate)} a ${fmt(r.endDate)}`,
        createdAt: r.createdAt, actionable: false,
      })),
      ...data.overtime.map((r): Row => ({
        id: r.id, kind: "overtime", name: r.employee.user.fullName,
        detail: `Horas extra · ${fmt(r.date)} · ${r.hours}h`,
        createdAt: r.createdAt, actionable: false,
      })),
      ...data.benefitRequests.map((r): Row => ({
        id: r.id, kind: "benefit", name: r.employee.user.fullName,
        detail: `Beneficio · ${r.benefit.title}`,
        createdAt: r.createdAt, actionable: true,
      })),
      ...data.certificates.map((r): Row => ({
        id: r.id, kind: "certificate", name: r.employee.user.fullName,
        detail: `Certificado laboral${r.includeSalary ? " (con salario)" : ""}`,
        createdAt: r.createdAt, actionable: true,
      })),
      ...data.tickets.map((r): Row => ({
        id: r.id, kind: "ticket", name: r.employee.user.fullName,
        detail: `Ticket ${r.code} · ${r.category.name} · ${r.subject}`,
        createdAt: r.createdAt, actionable: false,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [data]);

  const filtered = useMemo(() => rows.filter((r) => {
    if (kindFilter && r.kind !== kindFilter) return false;
    if (search) return r.name.toLowerCase().includes(search.toLowerCase()) || r.detail.toLowerCase().includes(search.toLowerCase());
    return true;
  }), [rows, search, kindFilter]);

  const kpis = useMemo(() => ({
    total: rows.length,
    vencidas: rows.filter((r) => daysWaiting(r.createdAt) > 3).length,
    tuyas: rows.filter((r) => r.actionable).length,
    tickets: data?.tickets.length ?? 0,
  }), [rows, data]);

  const review = async (kind: "benefit" | "certificate", id: string, status: "APPROVED" | "REJECTED", reviewNote?: string) => {
    setSaving(id);
    setError("");
    const url = kind === "benefit" ? `/api/rrhh-local/benefit-requests/${id}` : `/api/rrhh-local/certificates/${id}`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reviewNote }),
    });
    if (res.ok) {
      await load();
      setRejectId(null);
      setRejectKind(null);
      setRejectNote("");
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "No fue posible actualizar la solicitud");
    }
    setSaving(null);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-black text-[#1A1A1A]">Flujos</h1>
        <p className="text-xs text-[#64748B]">Todo lo pendiente de aprobar en un solo lugar, de todos los tipos de solicitud.</p>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Kpi value={kpis.total} label="Pendientes en total" hint="Todas las solicitudes activas" icon={<MdSchedule size={20} />} tone="bg-[#DBEAFE] text-[#2563EB]" />
        <Kpi value={kpis.vencidas} label="Con más de 3 días" hint="Riesgo de cuello de botella" icon={<MdInfoOutline size={20} />} tone="bg-[#FEE2E2] text-[#DC2626]" />
        <Kpi value={kpis.tuyas} label="Accionables por RRHH" hint="Beneficios y certificados" icon={<MdCheck size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
        <Kpi value={kpis.tickets} label="Tickets abiertos" hint="Centro de solicitudes" icon={<MdSupportAgent size={20} />} tone="bg-[#FEF3C7] text-[#B45309]" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3 py-2">
          <MdSearch size={16} className="text-[#94A3B8]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por colaborador o detalle…"
            className="w-full text-sm text-[#1A1A1A] outline-none" />
        </div>
        <SimpleSelect
          value={kindFilter}
          onChange={setKindFilter}
          options={[
            { value: "", label: "Tipo: Todos" },
            { value: "timeOff", label: "Vacaciones/permisos" },
            { value: "overtime", label: "Horas extra" },
            { value: "benefit", label: "Beneficios" },
            { value: "certificate", label: "Certificados" },
            { value: "ticket", label: "Tickets" },
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
              <th className="p-3">Colaborador</th>
              <th className="p-3">Detalle</th>
              <th className="p-3">Esperando</th>
              <th className="p-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const waiting = daysWaiting(r.createdAt);
              return (
                <tr key={`${r.kind}:${r.id}`} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#E6FAFB] text-[10px] font-bold text-[#27B1B8]">
                        {initials(r.name)}
                      </span>
                      <span className="text-[#1A1A1A]">{r.name}</span>
                    </div>
                  </td>
                  <td className="p-3 text-[#1A1A1A]">
                    <RowIcon kind={r.kind} /> {r.detail}
                  </td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${waiting > 3 ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                      {waiting === 0 ? "Hoy" : `${waiting} día${waiting === 1 ? "" : "s"}`}
                    </span>
                  </td>
                  <td className="p-3">
                    {r.kind === "benefit" || r.kind === "certificate" ? (
                      <div className="flex items-center gap-2">
                        <button onClick={() => review(r.kind as "benefit" | "certificate", r.id, "APPROVED")}
                          disabled={saving === r.id}
                          className="flex items-center gap-1 rounded-lg bg-[#DCFCE7] px-2.5 py-1 text-xs font-bold text-[#16A34A] disabled:opacity-50">
                          <MdCheck size={14} /> Aprobar
                        </button>
                        <button onClick={() => { setRejectId(r.id); setRejectKind(r.kind as "benefit" | "certificate"); }}
                          disabled={saving === r.id}
                          className="flex items-center gap-1 rounded-lg bg-[#FEE2E2] px-2.5 py-1 text-xs font-bold text-[#DC2626] disabled:opacity-50">
                          <MdClose size={14} /> Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-[#94A3B8]">
                        {r.kind === "ticket" ? "Gestionar en Solicitudes" : "Espera al jefe directo"}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-6 text-sm text-[#94A3B8]">Nada pendiente con estos filtros.</p>}
      </div>

      {rejectId && rejectKind && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => { setRejectId(null); setRejectKind(null); }}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-black text-[#1A1A1A]">Motivo de rechazo</h3>
            <p className="mt-1 text-xs text-[#64748B]">Es obligatorio explicar por qué se rechaza.</p>
            <textarea value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3}
              className="mt-3 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A] outline-none" />
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setRejectId(null); setRejectKind(null); }}
                className="flex-1 rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-bold text-[#64748B]">Cancelar</button>
              <button onClick={() => review(rejectKind, rejectId, "REJECTED", rejectNote)} disabled={!rejectNote.trim() || saving === rejectId}
                className="flex-1 rounded-lg bg-[#DC2626] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Rechazar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RowIcon({ kind }: { kind: Row["kind"] }) {
  const Icon = {
    timeOff: MdBeachAccess,
    overtime: MdAccessTime,
    benefit: MdCardGiftcard,
    certificate: MdDescription,
    ticket: MdSupportAgent,
  }[kind];
  return <Icon size={14} className="mr-1 inline-block text-[#94A3B8]" />;
}

function Kpi({ value, label, hint, icon, tone }: { value: number; label: string; hint: string; icon: React.ReactNode; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-[#1A1A1A]">{value}</p>
        <p className="text-xs font-bold text-[#64748B]">{label}</p>
        <p className="truncate text-[11px] text-[#94A3B8]">{hint}</p>
      </div>
    </div>
  );
}
