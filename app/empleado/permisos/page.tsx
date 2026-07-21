"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdLocalHospital, MdHome, MdEventBusy, MdPregnantWoman, MdChildCare, MdGavel,
  MdGroups, MdSchool, MdPerson, MdMoneyOff, MdWbSunny, MdAccessTime, MdMoreHoriz,
  MdAttachFile, MdDownload, MdClose, MdSearch, MdEventNote, MdSchedule, MdCheckCircle,
  MdCancel, MdVisibility, MdMoreVert, MdChevronLeft, MdChevronRight, MdInfoOutline,
} from "react-icons/md";
import type { IconType } from "react-icons";
import { fmtDateOnly } from "@/lib/date";

type PermitRequest = {
  id: string;
  subType: string | null;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  hours: number | null;
  startTime: string | null;
  endTime: string | null;
  reason: string | null;
  reviewNote: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
};

type Mode = "range" | "single-day-hours" | "half-day" | "hours";

const SUBTYPES: { key: string; label: string; Icon: IconType; mode: Mode }[] = [
  { key: "CITA_MEDICA", label: "Cita médica", Icon: MdLocalHospital, mode: "single-day-hours" },
  { key: "CALAMIDAD_DOMESTICA", label: "Calamidad doméstica", Icon: MdHome, mode: "range" },
  { key: "LUTO", label: "Licencia por luto", Icon: MdEventBusy, mode: "range" },
  { key: "MATERNIDAD", label: "Licencia de maternidad", Icon: MdPregnantWoman, mode: "range" },
  { key: "PATERNIDAD", label: "Licencia de paternidad", Icon: MdChildCare, mode: "range" },
  { key: "DILIGENCIA_JUDICIAL", label: "Diligencia judicial", Icon: MdGavel, mode: "single-day-hours" },
  { key: "SINDICAL", label: "Permiso sindical", Icon: MdGroups, mode: "range" },
  { key: "ESTUDIO", label: "Estudio o capacitación", Icon: MdSchool, mode: "range" },
  { key: "PERSONAL", label: "Permiso personal", Icon: MdPerson, mode: "range" },
  { key: "NO_REMUNERADO", label: "Permiso no remunerado", Icon: MdMoneyOff, mode: "range" },
  { key: "MEDIO_DIA", label: "Medio día", Icon: MdWbSunny, mode: "half-day" },
  { key: "HORAS", label: "Salida por horas", Icon: MdAccessTime, mode: "hours" },
  { key: "OTRO", label: "Otro permiso", Icon: MdMoreHoriz, mode: "range" },
];

const SUBTYPE_MAP = Object.fromEntries(SUBTYPES.map((s) => [s.key, s]));

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobado", REJECTED: "Rechazado", CANCELLED: "Cancelado",
};
const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-[#FEF3C7] text-[#B45309]",
  APPROVED: "bg-[#DCFCE7] text-[#16A34A]",
  REJECTED: "bg-[#FEE2E2] text-[#DC2626]",
  CANCELLED: "bg-[#F1F5F9] text-[#64748B]",
};
const STATUS_DOT: Record<string, string> = {
  PENDING: "bg-[#F59E0B]", APPROVED: "bg-[#22C55E]", REJECTED: "bg-[#EF4444]", CANCELLED: "bg-[#94A3B8]",
};
const CAL_STATUS_ORDER = ["PENDING", "REJECTED", "APPROVED"];

function fmt(d: string) {
  return fmtDateOnly(d, { day: "numeric", month: "short", year: "numeric" });
}
function fmtCreated(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}
type FormState = {
  subType: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime: string;
  endTime: string;
  halfPeriod: "AM" | "PM";
  reason: string;
  attachmentPath: string;
  attachmentName: string;
};

const EMPTY_FORM: FormState = {
  subType: "", startDate: "", endDate: "", allDay: true, startTime: "", endTime: "",
  halfPeriod: "AM", reason: "", attachmentPath: "", attachmentName: "",
};

function hoursBetween(start: string, end: string) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push("...");
    result.push(p);
  });
  return result;
}

const WEEKDAYS = ["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"];
const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function PermisosPage() {
  const [requests, setRequests] = useState<PermitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);

  const [filterText, setFilterText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterSubType, setFilterSubType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/rrhh-local/time-off");
    if (res.ok) {
      const all = (await res.json()) as (PermitRequest & { type: string })[];
      setRequests(all.filter((r) => r.type === "PERMIT"));
    } else {
      setError("No fue posible cargar tus solicitudes");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const selected = form.subType ? SUBTYPE_MAP[form.subType] : null;

  const startNew = (key: string) => {
    setForm({ ...EMPTY_FORM, subType: key });
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/rrhh-local/time-off/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (res.ok) {
      setForm((f) => ({ ...f, attachmentPath: data.path, attachmentName: data.name }));
    } else {
      setError(data.error || "No fue posible subir el soporte");
    }
  };

  const viewAttachment = async (path: string) => {
    const res = await fetch(`/api/rrhh-local/time-off/upload?path=${encodeURIComponent(path)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.open(data.url, "_blank");
    else setError(data.error || "No fue posible abrir el soporte");
  };

  const submit = async () => {
    if (!selected) return;
    setError("");

    const date = form.startDate;
    let payload: Record<string, unknown> = {
      type: "PERMIT",
      subType: selected.key,
      reason: form.reason || null,
      attachmentUrl: form.attachmentPath || null,
      attachmentName: form.attachmentName || null,
    };

    if (selected.mode === "range") {
      if (!form.startDate || !form.endDate) return setError("Selecciona las fechas");
      payload = { ...payload, startDate: form.startDate, endDate: form.endDate };
    } else if (selected.mode === "single-day-hours") {
      if (!date) return setError("Selecciona la fecha");
      payload = {
        ...payload, startDate: date, endDate: date,
        startTime: form.allDay ? null : form.startTime || null,
        endTime: form.allDay ? null : form.endTime || null,
        hours: form.allDay ? null : hoursBetween(form.startTime, form.endTime),
      };
    } else if (selected.mode === "half-day") {
      if (!date) return setError("Selecciona la fecha");
      payload = { ...payload, startDate: date, endDate: date, hours: 4 };
    } else if (selected.mode === "hours") {
      if (!date || !form.startTime || !form.endTime) return setError("Completa fecha y horas");
      const h = hoursBetween(form.startTime, form.endTime);
      if (h <= 0) return setError("La hora de regreso debe ser posterior a la de salida");
      payload = {
        ...payload, startDate: date, endDate: date,
        startTime: form.startTime, endTime: form.endTime, hours: h,
      };
    }

    setSaving(true);
    const res = await fetch("/api/rrhh-local/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
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
    setMenuId(null);
  };

  const kpis = useMemo(() => {
    const pending = requests.filter((r) => r.status === "PENDING").length;
    const approved = requests.filter((r) => r.status === "APPROVED").length;
    const rejected = requests.filter((r) => r.status === "REJECTED").length;
    const hoursThisMonth = requests
      .filter((r) => {
        const d = new Date(r.startDate);
        return r.status === "APPROVED" && d.getUTCMonth() === now.getMonth() && d.getUTCFullYear() === now.getFullYear();
      })
      .reduce((sum, r) => sum + (r.hours ?? 0), 0);
    return { pending, approved, rejected, hoursThisMonth };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const summary = useMemo(() => {
    const thisYear = requests.filter((r) => new Date(r.createdAt).getFullYear() === now.getFullYear());
    const reviewed = requests.filter((r) => r.status === "APPROVED" || r.status === "REJECTED");
    const avgDays =
      reviewed.length > 0
        ? reviewed.reduce((sum, r) => sum + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()), 0) /
          reviewed.length /
          86400000
        : null;
    return {
      total: thisYear.length,
      approved: thisYear.filter((r) => r.status === "APPROVED").length,
      pending: thisYear.filter((r) => r.status === "PENDING").length,
      rejected: thisYear.filter((r) => r.status === "REJECTED").length,
      avgDays,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (filterText && !(r.reason ?? "").toLowerCase().includes(filterText.toLowerCase())) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterSubType && r.subType !== filterSubType) return false;
      if (filterFrom && new Date(r.startDate) < new Date(filterFrom)) return false;
      if (filterTo && new Date(r.startDate) > new Date(filterTo)) return false;
      return true;
    });
  }, [requests, filterText, filterStatus, filterSubType, filterFrom, filterTo]);

  useEffect(() => {
    setPage(1);
  }, [filterText, filterStatus, filterSubType, filterFrom, filterTo, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const paginated = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(calYear, calMonth + 1, 0)).getUTCDate();
    const firstWeekday = (new Date(Date.UTC(calYear, calMonth, 1)).getUTCDay() + 6) % 7;
    const cells: { day: number | null; status: string | null }[] = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ day: null, status: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const t = Date.UTC(calYear, calMonth, day);
      const matches = requests
        .filter((r) => r.status !== "CANCELLED")
        .filter((r) => new Date(r.startDate).getTime() <= t && t <= new Date(r.endDate).getTime());
      matches.sort((a, b) => CAL_STATUS_ORDER.indexOf(a.status) - CAL_STATUS_ORDER.indexOf(b.status));
      cells.push({ day, status: matches[0]?.status ?? null });
    }
    return cells;
  }, [requests, calYear, calMonth]);

  const detail = detailId ? requests.find((r) => r.id === detailId) : null;

  const goToPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };
  const goToNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
            <MdEventNote size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A]">Mis permisos</h1>
            <p className="text-xs text-[#64748B]">Solicita y consulta tus permisos laborales</p>
          </div>
        </div>
        <button
          onClick={() => {
            setCreating((c) => !c);
            setForm(EMPTY_FORM);
          }}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1F9BA1]"
        >
          {creating ? "Cancelar" : "Nueva solicitud"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#16A34A]">
            <MdCheckCircle size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1A1A1A]">{kpis.approved}</p>
            <p className="text-xs font-bold text-[#64748B]">Aprobados</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FEE2E2] text-[#DC2626]">
            <MdCancel size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1A1A1A]">{kpis.rejected}</p>
            <p className="text-xs font-bold text-[#64748B]">Rechazados</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6FAFB] text-[#27B1B8]">
            <MdAccessTime size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1A1A1A]">{kpis.hoursThisMonth.toFixed(1)}h</p>
            <p className="text-xs font-bold text-[#64748B]">Horas este mes</p>
          </div>
        </div>
      </div>

      {creating && (
        <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
          {!selected ? (
            <>
              <p className="text-sm font-bold text-[#1A1A1A]">¿Qué tipo de permiso necesitas?</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {SUBTYPES.map(({ key, label, Icon }) => (
                  <button
                    key={key}
                    onClick={() => startNew(key)}
                    className="flex flex-col items-center gap-2 rounded-xl border border-[#E2E8F0] p-4 text-center transition-colors hover:border-[#27B1B8] hover:bg-[#E6FAFB]"
                  >
                    <Icon size={22} className="text-[#27B1B8]" />
                    <span className="text-xs font-bold text-[#1A1A1A]">{label}</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold text-[#1A1A1A]">
                  <selected.Icon size={18} className="text-[#27B1B8]" /> {selected.label}
                </p>
                <button onClick={() => setForm(EMPTY_FORM)} className="text-[#94A3B8] hover:text-[#1A1A1A]">
                  <MdClose size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {selected.mode === "range" && (
                  <>
                    <label className="text-xs font-bold text-[#64748B]">
                      Fecha inicio
                      <input type="date" value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-bold text-[#64748B]">
                      Fecha fin
                      <input type="date" value={form.endDate}
                        onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                    </label>
                  </>
                )}

                {selected.mode === "single-day-hours" && (
                  <>
                    <label className="text-xs font-bold text-[#64748B]">
                      Fecha
                      <input type="date" value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                    </label>
                    <label className="flex items-center gap-2 pt-6 text-xs font-bold text-[#64748B]">
                      <input type="checkbox" checked={form.allDay}
                        onChange={(e) => setForm({ ...form, allDay: e.target.checked })} />
                      ¿Todo el día?
                    </label>
                    {!form.allDay && (
                      <div className="flex gap-2">
                        <label className="text-xs font-bold text-[#64748B]">
                          Hora salida
                          <input type="time" value={form.startTime}
                            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                        </label>
                        <label className="text-xs font-bold text-[#64748B]">
                          Hora regreso
                          <input type="time" value={form.endTime}
                            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                            className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                        </label>
                      </div>
                    )}
                  </>
                )}

                {selected.mode === "half-day" && (
                  <>
                    <label className="text-xs font-bold text-[#64748B]">
                      Fecha
                      <input type="date" value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-bold text-[#64748B]">
                      Jornada
                      <select value={form.halfPeriod}
                        onChange={(e) => setForm({ ...form, halfPeriod: e.target.value as "AM" | "PM" })}
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
                        <option value="AM">Mañana</option>
                        <option value="PM">Tarde</option>
                      </select>
                    </label>
                  </>
                )}

                {selected.mode === "hours" && (
                  <>
                    <label className="text-xs font-bold text-[#64748B]">
                      Fecha
                      <input type="date" value={form.startDate}
                        onChange={(e) => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-bold text-[#64748B]">
                      Hora salida
                      <input type="time" value={form.startTime}
                        onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                    </label>
                    <label className="text-xs font-bold text-[#64748B]">
                      Hora regreso
                      <input type="time" value={form.endTime}
                        onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                    </label>
                  </>
                )}

                <label className="col-span-full text-xs font-bold text-[#64748B]">
                  Observaciones
                  <input value={form.reason} placeholder="Motivo o detalle (opcional)"
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
                </label>

                <div className="col-span-full">
                  <label className="text-xs font-bold text-[#64748B]">Adjuntar soporte (opcional)</label>
                  <div className="mt-1 flex items-center gap-3">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] px-3 py-2 text-xs font-bold text-[#64748B] hover:border-[#27B1B8]">
                      <MdAttachFile size={16} />
                      {uploading ? "Subiendo…" : "Elegir archivo"}
                      <input type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0])} />
                    </label>
                    {form.attachmentName && <span className="text-xs text-[#16A34A]">{form.attachmentName}</span>}
                  </div>
                </div>

                <button
                  onClick={submit}
                  disabled={saving || uploading}
                  className="col-span-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                >
                  {saving ? "Enviando…" : "Enviar solicitud"}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
        <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2">
          <MdSearch className="text-[#94A3B8]" size={16} />
          <input value={filterText} onChange={(e) => setFilterText(e.target.value)}
            placeholder="Buscar por motivo" className="w-full text-sm outline-none" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterSubType} onChange={(e) => setFilterSubType(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {SUBTYPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
        <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
                  <th className="p-3">Tipo</th>
                  <th className="p-3">Fechas</th>
                  <th className="p-3">Duración</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Solicitado el</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => {
                  const sub = r.subType ? SUBTYPE_MAP[r.subType] : null;
                  return (
                    <tr key={r.id} className="border-b border-[#F1F5F9]">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {sub && <sub.Icon size={16} className="text-[#27B1B8]" />}
                          <span className="font-bold text-[#1A1A1A]">{sub?.label ?? "Permiso"}</span>
                        </div>
                        {r.reason && <p className="text-xs text-[#94A3B8]">{r.reason}</p>}
                      </td>
                      <td className="p-3">
                        {fmt(r.startDate)}{r.startDate !== r.endDate ? ` – ${fmt(r.endDate)}` : ""}
                        {r.startTime && r.endTime && (
                          <p className="text-xs text-[#94A3B8]">{r.startTime} – {r.endTime}</p>
                        )}
                      </td>
                      <td className="p-3">
                        {r.hours ? `${r.hours}h` : r.durationDays > 0 ? `${r.durationDays}d` : "—"}
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold ${STATUS_STYLE[r.status] ?? ""}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[r.status] ?? ""}`} />
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                        {r.status === "REJECTED" && r.reviewNote && (
                          <span className="mt-1 block text-xs text-red-500">Motivo: {r.reviewNote}</span>
                        )}
                      </td>
                      <td className="p-3 text-[#64748B]">{fmtCreated(r.createdAt)}</td>
                      <td className="relative p-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setDetailId(r.id)} title="Ver detalle"
                            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]">
                            <MdVisibility size={16} />
                          </button>
                          <button onClick={() => setMenuId(menuId === r.id ? null : r.id)} title="Más acciones"
                            className="rounded-lg p-1.5 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]">
                            <MdMoreVert size={16} />
                          </button>
                        </div>
                        {menuId === r.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuId(null)} />
                            <div className="absolute right-3 top-10 z-20 w-40 rounded-lg border border-[#E2E8F0] bg-white py-1 shadow-lg">
                              {r.attachmentUrl && (
                                <button onClick={() => { viewAttachment(r.attachmentUrl!); setMenuId(null); }}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-[#1A1A1A] hover:bg-[#F8FAFC]">
                                  <MdDownload size={14} /> Ver soporte
                                </button>
                              )}
                              {r.status === "PENDING" ? (
                                <button onClick={() => cancel(r.id)} disabled={cancelingId === r.id}
                                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-[#DC2626] hover:bg-[#FEF2F2] disabled:opacity-50">
                                  <MdClose size={14} /> {cancelingId === r.id ? "Cancelando…" : "Cancelar"}
                                </button>
                              ) : (
                                !r.attachmentUrl && <p className="px-3 py-2 text-xs text-[#94A3B8]">Sin acciones</p>
                              )}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr><td className="p-3 text-[#94A3B8]" colSpan={6}>Sin solicitudes que coincidan.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <p className="text-xs text-[#64748B]">
              {filtered.length === 0
                ? "Sin solicitudes"
                : `Mostrando ${(pageSafe - 1) * pageSize + 1} a ${Math.min(pageSafe * pageSize, filtered.length)} de ${filtered.length} solicitudes`}
            </p>
            <div className="flex items-center gap-3">
              <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs">
                <option value={10}>10 por página</option>
                <option value={25}>25 por página</option>
                <option value={50}>50 por página</option>
              </select>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={pageSafe <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] disabled:opacity-40">
                  ‹
                </button>
                {getPageNumbers(pageSafe, pageCount).map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-1 text-[#94A3B8]">…</span>
                  ) : (
                    <button key={p} onClick={() => setPage(p)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ${p === pageSafe ? "bg-[#27B1B8] text-white" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F1F5F9]"}`}>
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={pageSafe >= pageCount}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] text-[#64748B] disabled:opacity-40">
                  ›
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-sm font-black text-[#1A1A1A]">Resumen de permisos</p>
            <div className="mt-3 space-y-1 text-xs">
              <p className="flex justify-between"><span className="text-[#64748B]">Solicitudes este año</span><span className="font-bold text-[#1A1A1A]">{summary.total}</span></p>
              <p className="flex justify-between"><span className="text-[#64748B]">Aprobadas</span><span className="font-bold text-[#16A34A]">{summary.approved}</span></p>
              <p className="flex justify-between"><span className="text-[#64748B]">Pendientes</span><span className="font-bold text-[#B45309]">{summary.pending}</span></p>
              <p className="flex justify-between"><span className="text-[#64748B]">Rechazadas</span><span className="font-bold text-[#DC2626]">{summary.rejected}</span></p>
              <p className="flex justify-between"><span className="text-[#64748B]">Horas usadas este mes</span><span className="font-bold text-[#1A1A1A]">{kpis.hoursThisMonth.toFixed(1)} h</span></p>
            </div>
            <div className="mt-3 border-t border-[#F1F5F9] pt-3 text-xs">
              <p className="text-[#64748B]">Aprobador</p>
              <p className="font-bold text-[#1A1A1A]">Recursos Humanos</p>
            </div>
            <div className="mt-3 border-t border-[#F1F5F9] pt-3 text-xs">
              <p className="text-[#64748B]">Tiempo promedio de aprobación</p>
              <p className="font-bold text-[#1A1A1A]">
                {summary.avgDays !== null ? `${summary.avgDays.toFixed(1)} días` : "—"}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#1A1A1A]">Calendario de permisos</p>
              <div className="flex items-center gap-1">
                <button onClick={goToPrevMonth} className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9]">
                  <MdChevronLeft size={16} />
                </button>
                <button onClick={goToNextMonth} className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9]">
                  <MdChevronRight size={16} />
                </button>
              </div>
            </div>
            <p className="mt-1 text-xs font-bold text-[#1A1A1A]">{MONTH_NAMES[calMonth]} {calYear}</p>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#94A3B8]">
              {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarDays.map((c, i) => (
                <div key={i} className="flex items-center justify-center">
                  {c.day && (
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                        c.status ? `${STATUS_DOT[c.status]} text-white` : "text-[#1A1A1A]"
                      }`}
                    >
                      {c.day}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 border-t border-[#F1F5F9] pt-3 text-[10px] text-[#64748B]">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#F59E0B]" /> Pendiente</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#22C55E]" /> Aprobado</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#EF4444]" /> Rechazado</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="flex items-center gap-1 text-sm font-black text-[#1A1A1A]">
              <MdInfoOutline size={16} className="text-[#27B1B8]" /> Información importante
            </p>
            <p className="mt-2 text-xs text-[#64748B]">
              Los permisos están sujetos a aprobación de Recursos Humanos. Solicita con anticipación
              para asegurar una mejor planificación.
            </p>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailId(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-black text-[#1A1A1A]">
                {detail.subType && SUBTYPE_MAP[detail.subType] && (
                  <>{(() => { const Icon = SUBTYPE_MAP[detail.subType].Icon; return <Icon size={18} className="text-[#27B1B8]" />; })()}</>
                )}
                {detail.subType ? SUBTYPE_MAP[detail.subType]?.label ?? "Permiso" : "Permiso"}
              </p>
              <button onClick={() => setDetailId(null)} className="text-[#94A3B8] hover:text-[#1A1A1A]">
                <MdClose size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex justify-between"><span className="text-[#64748B]">Estado</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[detail.status] ?? ""}`}>
                  {STATUS_LABELS[detail.status] ?? detail.status}
                </span>
              </p>
              <p className="flex justify-between"><span className="text-[#64748B]">Fechas</span>
                <span className="font-bold text-[#1A1A1A]">
                  {fmt(detail.startDate)}{detail.startDate !== detail.endDate ? ` – ${fmt(detail.endDate)}` : ""}
                </span>
              </p>
              {detail.startTime && detail.endTime && (
                <p className="flex justify-between"><span className="text-[#64748B]">Horario</span>
                  <span className="font-bold text-[#1A1A1A]">{detail.startTime} – {detail.endTime}</span>
                </p>
              )}
              <p className="flex justify-between"><span className="text-[#64748B]">Duración</span>
                <span className="font-bold text-[#1A1A1A]">
                  {detail.hours ? `${detail.hours}h` : detail.durationDays > 0 ? `${detail.durationDays}d` : "—"}
                </span>
              </p>
              <p className="flex justify-between"><span className="text-[#64748B]">Solicitado el</span>
                <span className="font-bold text-[#1A1A1A]">{fmtCreated(detail.createdAt)}</span>
              </p>
              {detail.reason && (
                <p><span className="text-[#64748B]">Observaciones:</span> <span className="text-[#1A1A1A]">{detail.reason}</span></p>
              )}
              {detail.status === "REJECTED" && detail.reviewNote && (
                <p><span className="text-[#64748B]">Motivo de rechazo:</span> <span className="text-red-500">{detail.reviewNote}</span></p>
              )}
              {detail.attachmentUrl && (
                <button onClick={() => viewAttachment(detail.attachmentUrl!)}
                  className="flex items-center gap-1 text-xs font-bold text-[#27B1B8] hover:underline">
                  <MdDownload size={14} /> Ver soporte adjunto
                </button>
              )}
              {detail.status === "PENDING" && (
                <button onClick={() => { cancel(detail.id); setDetailId(null); }} disabled={cancelingId === detail.id}
                  className="mt-2 w-full rounded-lg border border-[#DC2626] px-3 py-2 text-xs font-bold text-[#DC2626] disabled:opacity-50">
                  {cancelingId === detail.id ? "Cancelando…" : "Cancelar solicitud"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
