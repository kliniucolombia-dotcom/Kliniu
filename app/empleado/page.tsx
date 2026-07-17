"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  MdBeachAccess, MdEventNote, MdHealthAndSafety, MdFolder,
  MdPayments, MdAccessTime, MdCardGiftcard, MdDescription, MdArticle, MdAccountTree,
} from "react-icons/md";

type TimeOffRequestRow = {
  id: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
};

type MeResponse = {
  fullName: string;
  jobTitle: string;
  vacationBalance: { earnedDays: number; takenDays: number; pendingDays: number; availableDays: number };
  nextVacation: { startDate: string; endDate: string; durationDays: number } | null;
};

const TYPE_LABELS: Record<string, string> = {
  VACATION: "Vacaciones", PERMIT: "Permiso", LEAVE: "Licencia", INCAPACITY: "Incapacidad", UNPAID: "No remunerado",
};
const STATUS_LABELS: Record<string, string> = { PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada", CANCELLED: "Cancelada" };
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  APPROVED: "bg-[#DCFCE7] text-[#16A34A]",
  REJECTED: "bg-[#FEE2E2] text-[#DC2626]",
  CANCELLED: "bg-[#F1F5F9] text-[#64748B]",
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

const ACTIONS = [
  { href: "/empleado/vacaciones", label: "Solicitar vacaciones", desc: "Elige tus fechas de descanso", Icon: MdBeachAccess },
  { href: "/empleado/permisos", label: "Solicitar permiso", desc: "Solicita un permiso personal", Icon: MdEventNote },
  { href: "/empleado/incapacidades", label: "Registrar incapacidad", desc: "Reporta una incapacidad médica", Icon: MdHealthAndSafety },
  { href: "/empleado/solicitudes", label: "Mis solicitudes", desc: "Revisa el estado de todas tus solicitudes", Icon: MdFolder },
];

const COMING_SOON = [
  { label: "Nómina", Icon: MdPayments },
  { label: "Horas extras", Icon: MdAccessTime },
  { label: "Beneficios", Icon: MdCardGiftcard },
  { label: "Documentos", Icon: MdDescription },
  { label: "Noticias", Icon: MdArticle },
  { label: "Organigrama", Icon: MdAccountTree },
];

export default function EmpleadoHomePage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [recent, setRecent] = useState<TimeOffRequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/empleado/me").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/rrhh-local/time-off").then((r) => (r.ok ? r.json() : [])),
    ]).then(([meData, requests]) => {
      setMe(meData);
      setRecent((requests as TimeOffRequestRow[]).slice(0, 5));
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  const firstName = me?.fullName?.split(" ")[0] ?? "";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-[#1A1A1A]">¡Hola, {firstName}! 👋</h1>
        <p className="mt-0.5 text-sm text-[#64748B]">Bienvenido a tu portal. Aquí puedes gestionar tus solicitudes.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <Link key={a.href} href={a.href}
            className="flex items-start gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4 transition-colors hover:border-[#27B1B8]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
              <a.Icon size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[#1A1A1A]">{a.label}</p>
              <p className="mt-0.5 text-xs text-[#64748B]">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-sm font-black text-[#1A1A1A]">Próximas vacaciones</h2>
          {me?.nextVacation ? (
            <p className="mt-3 text-sm text-[#1A1A1A]">
              Del <strong>{fmt(me.nextVacation.startDate)}</strong> al <strong>{fmt(me.nextVacation.endDate)}</strong>
              {" "}({me.nextVacation.durationDays} días)
            </p>
          ) : (
            <p className="mt-3 text-sm text-[#94A3B8]">Aún no tienes vacaciones aprobadas programadas.</p>
          )}
        </div>

        <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center gap-2">
            <MdBeachAccess className="text-[#27B1B8]" size={18} />
            <h2 className="text-sm font-black text-[#1A1A1A]">Mis vacaciones</h2>
          </div>
          <p className="mt-2 text-3xl font-black text-[#16A34A]">
            {(me?.vacationBalance.availableDays ?? 0).toFixed(2)} <span className="text-sm font-bold text-[#64748B]">días disponibles</span>
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-[#E6F7FF] p-2">
              <p className="font-black text-[#1A1A1A]">{(me?.vacationBalance.earnedDays ?? 0).toFixed(2)}</p>
              <p className="text-[#64748B]">causados</p>
            </div>
            <div className="rounded-lg bg-[#DCFCE7] p-2">
              <p className="font-black text-[#1A1A1A]">{(me?.vacationBalance.takenDays ?? 0).toFixed(2)}</p>
              <p className="text-[#64748B]">disfrutados</p>
            </div>
            <div className="rounded-lg bg-[#FEF3C7] p-2">
              <p className="font-black text-[#1A1A1A]">{(me?.vacationBalance.pendingDays ?? 0).toFixed(2)}</p>
              <p className="text-[#64748B]">pendientes</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
            <div
              className="h-full rounded-full bg-[#27B1B8]"
              style={{
                width: `${me && me.vacationBalance.earnedDays > 0 ? Math.min(100, (me.vacationBalance.availableDays / me.vacationBalance.earnedDays) * 100) : 0}%`,
              }}
            />
          </div>
          <Link href="/empleado/vacaciones" className="mt-3 inline-block text-xs font-bold text-[#27B1B8] hover:underline">
            Solicitar vacaciones →
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
        <h2 className="mb-3 text-sm font-black text-[#1A1A1A]">Mis solicitudes recientes</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-[#94A3B8]">Sin solicitudes todavía.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((r) => (
              <div key={r.id} className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 text-sm last:border-b-0 last:pb-0">
                <span className="font-semibold text-[#1A1A1A]">{TYPE_LABELS[r.type] ?? r.type}</span>
                <span className="text-[#64748B]">{fmt(r.startDate)} – {fmt(r.endDate)}</span>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[r.status] ?? ""}`}>
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-white p-5">
        <h2 className="mb-3 text-sm font-black text-[#94A3B8]">Próximamente</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {COMING_SOON.map((c) => (
            <div key={c.label} className="flex flex-col items-center gap-1.5 rounded-xl bg-[#F8FAFC] py-4 text-center opacity-60">
              <c.Icon size={20} className="text-[#94A3B8]" />
              <span className="text-xs font-semibold text-[#64748B]">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
