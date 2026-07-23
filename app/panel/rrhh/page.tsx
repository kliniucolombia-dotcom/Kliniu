"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import {
  MdPeople,
  MdBeachAccess,
  MdAccessTime,
  MdDescription,
  MdCheckCircle,
  MdWarningAmber,
  MdArrowForward,
} from "react-icons/md";

type TimeOffRequestView = { type: string; status: string };
type AttendanceView = { status: string };

type Summary = {
  employees: number;
  pendingTimeOff: number;
  attendanceRecords: number;
  timeOffByType: Record<string, number>;
};

const TIME_OFF_TYPE_LABELS: Record<string, string> = {
  VACATION: "Vacaciones",
  PERMIT: "Permisos",
  LEAVE: "Licencias",
  INCAPACITY: "Incapacidades",
  UNPAID: "No remunerado",
};

function MetricCard({
  href,
  label,
  value,
  hint,
  icon,
}: {
  href: string;
  label: string;
  value: number | null;
  hint: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-4 rounded-xl border border-[#E2E8F0] bg-white p-5 transition-colors hover:border-[#27B1B8]"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#27B1B8]/10 text-[#27B1B8]">
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-[#64748B]">{label}</p>
        <p className="mt-1 text-3xl font-black text-[#1A1A1A]">
          {value === null ? "—" : value}
        </p>
        <p className="mt-0.5 text-[11px] text-[#94A3B8]">{hint}</p>
      </div>
    </Link>
  );
}

export default function RrhhResumenPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const load = () => {
    (async () => {
      try {
        const [employeesRes, timeOffRes, attendanceRes] = await Promise.all([
          fetch("/api/rrhh-local/employees"),
          fetch("/api/rrhh-local/time-off"),
          fetch("/api/rrhh-local/attendance"),
        ]);

        if (!employeesRes.ok || !timeOffRes.ok || !attendanceRes.ok) {
          setError("No fue posible cargar el resumen de Recursos Humanos");
          return;
        }

        const employees = await employeesRes.json();
        const timeOffRequests: TimeOffRequestView[] = await timeOffRes.json();
        const attendance: AttendanceView[] = await attendanceRes.json();

        const pending = Array.isArray(timeOffRequests)
          ? timeOffRequests.filter((r) => r.status === "PENDING")
          : [];

        const timeOffByType: Record<string, number> = {};
        for (const a of pending) {
          timeOffByType[a.type] = (timeOffByType[a.type] ?? 0) + 1;
        }

        setSummary({
          employees: Array.isArray(employees) ? employees.length : 0,
          pendingTimeOff: pending.length,
          attendanceRecords: Array.isArray(attendance) ? attendance.length : 0,
          timeOffByType,
        });
      } catch {
        setError("No fue posible cargar los datos reales de Kliniu");
      }
    })();
  };

  useEffect(load, []);
  useRealtimeRefresh(["timeoff"], load);

  const typeEntries = summary
    ? Object.entries(summary.timeOffByType).sort((a, b) => b[1] - a[1])
    : [];
  const maxTypeValue = Math.max(1, ...typeEntries.map(([, v]) => v));

  return (
    <div className="space-y-6 p-6">
      <p className="text-xs font-semibold text-[#94A3B8]">
        Panel <span className="mx-1">/</span>{" "}
        <span className="text-[#64748B]">Recursos Humanos</span>
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Recursos Humanos</h1>
          <p className="text-sm text-[#64748B]">
            Datos reales de Kliniu — gestión de Recursos Humanos y talento del equipo.
          </p>
        </div>
        <Link
          href="/panel/rrhh/reportes"
          className="flex items-center gap-1.5 self-start rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-bold text-[#1A1A1A] transition-colors hover:border-[#27B1B8] sm:self-auto"
        >
          Ver reportes <MdArrowForward size={16} />
        </Link>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!summary && !error && <div className="text-sm text-[#64748B]">Cargando…</div>}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              href="/panel/rrhh/empleados"
              label="Empleados activos"
              value={summary.employees}
              hint="dato real"
              icon={<MdPeople size={20} />}
            />
            <MetricCard
              href="/panel/rrhh/vacaciones"
              label="Solicitudes pendientes"
              value={summary.pendingTimeOff}
              hint="dato real"
              icon={<MdWarningAmber size={20} />}
            />
            <MetricCard
              href="/panel/rrhh/vacaciones"
              label="Vacaciones pendientes de aprobar"
              value={summary.timeOffByType.VACATION ?? 0}
              hint="dato real"
              icon={<MdBeachAccess size={20} />}
            />
            <MetricCard
              href="/panel/rrhh/documentos"
              label="Documentos por vencer"
              value={null}
              hint="pendiente de conectar"
              icon={<MdDescription size={20} />}
            />
            <MetricCard
              href="/panel/rrhh/asistencia"
              label="Registros de asistencia"
              value={summary.attendanceRecords}
              hint="dato real"
              icon={<MdAccessTime size={20} />}
            />
            <MetricCard
              href="/panel/rrhh/reportes"
              label="Alertas activas"
              value={null}
              hint="pendiente de conectar (Auditoría)"
              icon={<MdCheckCircle size={20} />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 lg:col-span-2">
              <p className="text-sm font-bold text-[#1A1A1A]">Solicitudes de tiempo libre por tipo</p>
              <p className="text-xs text-[#64748B]">Pendientes de aprobación</p>

              {typeEntries.length === 0 ? (
                <p className="mt-4 text-sm text-[#64748B]">No hay solicitudes pendientes.</p>
              ) : (
                <div className="mt-5 space-y-3">
                  {typeEntries.map(([type, value]) => (
                    <div key={type} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-sm text-[#64748B]">
                        {TIME_OFF_TYPE_LABELS[type] ?? type}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[#E2E8F0]">
                        <div
                          className="h-full rounded-full bg-[#27B1B8]"
                          style={{ width: `${(value / maxTypeValue) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right text-sm font-bold text-[#1A1A1A]">
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5">
              <p className="text-sm font-bold text-[#1A1A1A]">Actividad reciente</p>
              <p className="mt-4 text-sm text-[#64748B]">
                Aún no hay un módulo de auditoría conectado a datos reales de Kliniu —
                se habilitará en una próxima fase.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
