"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MdHealthAndSafety, MdDescription, MdAccessTime, MdApartment, MdAttachMoney, MdSchedule,
  MdAttachFile, MdClose, MdSearch, MdVisibility, MdMoreVert, MdDownload, MdInfoOutline,
} from "react-icons/md";
import { fmtDateOnly } from "@/lib/date";

type IncapacityRequest = {
  id: string;
  status: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  reason: string | null;
  reviewNote: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
  incapacityNumber: string | null;
  incapacityType: string | null;
  epsName: string | null;
  treatingDoctor: string | null;
  diagnosis: string | null;
  diagnosisCode: string | null;
  issueDate: string | null;
  createdAt: string;
  updatedAt: string;
};

type MeResponse = { eps: string | null; salaryAmount: number | null };

const INCAPACITY_TYPES: { key: string; label: string }[] = [
  { key: "ENFERMEDAD_GENERAL", label: "Enfermedad general" },
  { key: "ACCIDENTE_LABORAL", label: "Accidente laboral" },
  { key: "ENFERMEDAD_LABORAL", label: "Enfermedad laboral" },
  { key: "MATERNIDAD", label: "Licencia de maternidad" },
  { key: "PATERNIDAD", label: "Licencia de paternidad" },
];
const INCAPACITY_TYPE_MAP = Object.fromEntries(INCAPACITY_TYPES.map((t) => [t.key, t.label]));

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente", APPROVED: "Aprobada", REJECTED: "Rechazada", CANCELLED: "Cancelada",
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

function fmt(d: string) {
  return fmtDateOnly(d, { day: "numeric", month: "short", year: "numeric" });
}
function fmtCreated(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
}
function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

function companyDaysOf(durationDays: number) {
  return Math.min(2, durationDays);
}
function epsDaysOf(durationDays: number) {
  return Math.max(0, durationDays - 2);
}
function estimatedAmount(durationDays: number, salaryAmount: number | null) {
  if (!salaryAmount) return null;
  const dailyRate = salaryAmount / 30;
  return Math.round(dailyRate * 0.6667 * durationDays);
}

type FormState = {
  incapacityType: string;
  epsName: string;
  treatingDoctor: string;
  issueDate: string;
  startDate: string;
  endDate: string;
  diagnosis: string;
  diagnosisCode: string;
  reason: string;
  attachmentPath: string;
  attachmentName: string;
};

const EMPTY_FORM: FormState = {
  incapacityType: "ENFERMEDAD_GENERAL", epsName: "", treatingDoctor: "", issueDate: "",
  startDate: "", endDate: "", diagnosis: "", diagnosisCode: "", reason: "",
  attachmentPath: "", attachmentName: "",
};

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

export default function IncapacidadesPage() {
  const [requests, setRequests] = useState<IncapacityRequest[]>([]);
  const [me, setMe] = useState<MeResponse | null>(null);
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
  const [filterType, setFilterType] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = async () => {
    setLoading(true);
    const [res, meRes] = await Promise.all([
      fetch("/api/rrhh-local/time-off"),
      fetch("/api/empleado/me"),
    ]);
    if (res.ok) {
      const all = (await res.json()) as (IncapacityRequest & { type: string })[];
      setRequests(all.filter((r) => r.type === "INCAPACITY"));
    } else {
      setError("No fue posible cargar tus incapacidades");
    }
    if (meRes.ok) {
      const data = await meRes.json();
      setMe({ eps: data.eps, salaryAmount: data.salaryAmount });
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (creating && me?.eps && !form.epsName) {
      setForm((f) => ({ ...f, epsName: me.eps ?? "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [creating, me]);

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
      setError(data.error || "No fue posible subir el certificado");
    }
  };

  const viewAttachment = async (path: string) => {
    const res = await fetch(`/api/rrhh-local/time-off/upload?path=${encodeURIComponent(path)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.open(data.url, "_blank");
    else setError(data.error || "No fue posible abrir el certificado");
  };

  const submit = async () => {
    setError("");
    if (!form.startDate || !form.endDate) return setError("Selecciona las fechas de inicio y fin");
    if (!form.epsName.trim()) return setError("Ingresa la EPS que emitió la incapacidad");
    if (!form.attachmentPath) return setError("Adjunta el certificado médico");

    setSaving(true);
    const res = await fetch("/api/rrhh-local/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "INCAPACITY",
        incapacityType: form.incapacityType,
        epsName: form.epsName.trim(),
        treatingDoctor: form.treatingDoctor.trim() || null,
        issueDate: form.issueDate || null,
        startDate: form.startDate,
        endDate: form.endDate,
        diagnosis: form.diagnosis.trim() || null,
        diagnosisCode: form.diagnosisCode.trim() || null,
        reason: form.reason.trim() || null,
        attachmentUrl: form.attachmentPath,
        attachmentName: form.attachmentName,
      }),
    });
    if (res.ok) {
      setForm(EMPTY_FORM);
      setCreating(false);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible registrar la incapacidad");
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
    else setError("No fue posible cancelar la incapacidad");
    setCancelingId(null);
    setMenuId(null);
  };

  const now = new Date();
  const kpis = useMemo(() => {
    const thisYear = requests.filter((r) => new Date(r.createdAt).getFullYear() === now.getFullYear());
    const approvedThisYear = thisYear.filter((r) => r.status === "APPROVED");
    const totalDays = thisYear.reduce((s, r) => s + r.durationDays, 0);
    const companyDays = approvedThisYear.reduce((s, r) => s + companyDaysOf(r.durationDays), 0);
    const epsDays = approvedThisYear.reduce((s, r) => s + epsDaysOf(r.durationDays), 0);
    const amounts = approvedThisYear.map((r) => estimatedAmount(r.durationDays, me?.salaryAmount ?? null));
    const hasAmounts = amounts.some((a) => a !== null);
    const totalAmount = amounts.reduce((s: number, a) => s + (a ?? 0), 0);
    const reviewed = requests.filter((r) => r.status === "APPROVED" || r.status === "REJECTED");
    const avgDays =
      reviewed.length > 0
        ? reviewed.reduce((sum, r) => sum + (new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()), 0) /
          reviewed.length / 86400000
        : null;
    return { count: thisYear.length, totalDays, companyDays, epsDays, totalAmount, hasAmounts, avgDays };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, me]);

  const summary = useMemo(() => {
    const thisYear = requests.filter((r) => new Date(r.createdAt).getFullYear() === now.getFullYear());
    return {
      total: thisYear.length,
      approved: thisYear.filter((r) => r.status === "APPROVED").length,
      pending: thisYear.filter((r) => r.status === "PENDING").length,
      rejected: thisYear.filter((r) => r.status === "REJECTED").length,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests]);

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      const haystack = `${r.incapacityNumber ?? ""} ${r.diagnosis ?? ""} ${r.epsName ?? ""}`.toLowerCase();
      if (filterText && !haystack.includes(filterText.toLowerCase())) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterType && r.incapacityType !== filterType) return false;
      if (filterFrom && new Date(r.startDate) < new Date(filterFrom)) return false;
      if (filterTo && new Date(r.startDate) > new Date(filterTo)) return false;
      return true;
    });
  }, [requests, filterText, filterStatus, filterType, filterFrom, filterTo]);

  useEffect(() => {
    setPage(1);
  }, [filterText, filterStatus, filterType, filterFrom, filterTo, pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageSafe = Math.min(page, pageCount);
  const paginated = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const detail = detailId ? requests.find((r) => r.id === detailId) : null;

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
            <MdHealthAndSafety size={20} />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A]">Mis incapacidades</h1>
            <p className="text-xs text-[#64748B]">Consulta, carga y realiza seguimiento de tus incapacidades médicas</p>
          </div>
        </div>
        <button
          onClick={() => { setCreating((c) => !c); setForm(EMPTY_FORM); }}
          className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#1F9BA1]"
        >
          {creating ? "Cancelar" : "Nueva incapacidad"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E6FAFB] text-[#27B1B8]">
            <MdDescription size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1A1A1A]">{kpis.count}</p>
            <p className="text-xs font-bold text-[#64748B]">Incapacidades este año</p>
            <p className="text-[10px] text-[#94A3B8]">{kpis.totalDays} días en total</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF7ED] text-[#C2410C]">
            <MdAccessTime size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1A1A1A]">{kpis.companyDays.toFixed(1)}</p>
            <p className="text-xs font-bold text-[#64748B]">Días pagados</p>
            <p className="text-[10px] text-[#94A3B8]">A cargo de la empresa</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#F3E8FF] text-[#7E22CE]">
            <MdApartment size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1A1A1A]">{kpis.epsDays.toFixed(1)}</p>
            <p className="text-xs font-bold text-[#64748B]">Días EPS</p>
            <p className="text-[10px] text-[#94A3B8]">A cargo de la EPS</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#16A34A]">
            <MdAttachMoney size={20} />
          </div>
          <div>
            <p className="text-lg font-black text-[#1A1A1A]">{kpis.hasAmounts ? fmtMoney(kpis.totalAmount) : "—"}</p>
            <p className="text-xs font-bold text-[#64748B]">Valor reconocido</p>
            <p className="text-[10px] text-[#94A3B8]">Estimado este año</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7] text-[#B45309]">
            <MdSchedule size={20} />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1A1A1A]">{kpis.avgDays !== null ? kpis.avgDays.toFixed(1) : "—"}</p>
            <p className="text-xs font-bold text-[#64748B]">Promedio de respuesta</p>
            <p className="text-[10px] text-[#94A3B8]">Días para aprobación</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] p-4">
        <p className="flex items-center gap-1 text-sm font-black text-[#0C4A6E]">
          <MdInfoOutline size={16} /> Información importante
        </p>
        <p className="mt-1 text-xs text-[#0C4A6E]">Las incapacidades en Colombia están reguladas por la Ley 100 de 1993.</p>
        <ul className="mt-2 space-y-1 text-xs text-[#0C4A6E]">
          <li><strong>Días 1 a 2:</strong> a cargo del empleador (66.67% del salario base de cotización).</li>
          <li><strong>Días 3 a 180:</strong> a cargo de la EPS (66.67% del salario base de cotización).</li>
          <li><strong>Días 181 en adelante:</strong> a cargo del fondo de pensiones (50% del salario base de cotización).</li>
        </ul>
      </div>

      {creating && (
        <div className="space-y-4 rounded-xl border border-[#E2E8F0] bg-white p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="text-xs font-bold text-[#64748B]">
              Tipo de incapacidad
              <select value={form.incapacityType}
                onChange={(e) => setForm({ ...form, incapacityType: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
                {INCAPACITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
              </select>
            </label>
            <label className="text-xs font-bold text-[#64748B]">
              EPS que la emitió
              <input value={form.epsName} placeholder="Nombre de la EPS"
                onChange={(e) => setForm({ ...form, epsName: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-[#64748B]">
              Médico tratante (opcional)
              <input value={form.treatingDoctor}
                onChange={(e) => setForm({ ...form, treatingDoctor: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>

            <label className="text-xs font-bold text-[#64748B]">
              Fecha de expedición
              <input type="date" value={form.issueDate}
                onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>
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

            <label className="text-xs font-bold text-[#64748B]">
              Diagnóstico (opcional)
              <input value={form.diagnosis}
                onChange={(e) => setForm({ ...form, diagnosis: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-[#64748B]">
              Código CIE-10 (opcional)
              <input value={form.diagnosisCode} placeholder="Ej. J00X"
                onChange={(e) => setForm({ ...form, diagnosisCode: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-bold text-[#64748B]">
              Observaciones (opcional)
              <input value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
            </label>

            <div className="col-span-full">
              <label className="text-xs font-bold text-[#64748B]">Certificado médico (PDF o imagen)</label>
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
              {saving ? "Enviando…" : "Registrar incapacidad"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
        <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-[#E2E8F0] px-3 py-2">
          <MdSearch className="text-[#94A3B8]" size={16} />
          <input value={filterText} onChange={(e) => setFilterText(e.target.value)}
            placeholder="Buscar por número, diagnóstico o EPS" className="w-full text-sm outline-none" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {INCAPACITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
        <input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)}
          className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold text-[#64748B]">
                  <th className="p-3">Número</th>
                  <th className="p-3">Fechas</th>
                  <th className="p-3">Días</th>
                  <th className="p-3">Diagnóstico</th>
                  <th className="p-3">Origen del pago</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Valor estimado</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => {
                  const amount = estimatedAmount(r.durationDays, me?.salaryAmount ?? null);
                  return (
                    <tr key={r.id} className="border-b border-[#F1F5F9]">
                      <td className="p-3">
                        <span className="font-bold text-[#1A1A1A]">{r.incapacityNumber ?? "—"}</span>
                        <p className="text-xs text-[#94A3B8]">{r.epsName ?? "—"}</p>
                      </td>
                      <td className="p-3">{fmt(r.startDate)}{r.startDate !== r.endDate ? ` – ${fmt(r.endDate)}` : ""}</td>
                      <td className="p-3">{r.durationDays} días</td>
                      <td className="p-3">
                        {r.diagnosisCode ? `${r.diagnosisCode} — ` : ""}{r.diagnosis ?? "—"}
                      </td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${r.durationDays <= 2 ? "bg-[#FFF7ED] text-[#C2410C]" : "bg-[#F3E8FF] text-[#7E22CE]"}`}>
                          {r.durationDays <= 2 ? "Día 1-2 · Empresa" : "Día 3+ · EPS"}
                        </span>
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
                      <td className="p-3">{amount !== null ? fmtMoney(amount) : "—"}</td>
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
                                  <MdDownload size={14} /> Ver certificado
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
                  <tr><td className="p-3 text-[#94A3B8]" colSpan={8}>Sin incapacidades que coincidan.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] bg-white p-3">
            <p className="text-xs text-[#64748B]">
              {filtered.length === 0
                ? "Sin incapacidades"
                : `Mostrando ${(pageSafe - 1) * pageSize + 1} a ${Math.min(pageSafe * pageSize, filtered.length)} de ${filtered.length} incapacidades`}
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
            <p className="text-sm font-black text-[#1A1A1A]">Resumen</p>
            <div className="mt-3 space-y-1 text-xs">
              <p className="flex justify-between"><span className="text-[#64748B]">Incapacidades este año</span><span className="font-bold text-[#1A1A1A]">{summary.total}</span></p>
              <p className="flex justify-between"><span className="text-[#64748B]">Aprobadas</span><span className="font-bold text-[#16A34A]">{summary.approved}</span></p>
              <p className="flex justify-between"><span className="text-[#64748B]">Pendientes</span><span className="font-bold text-[#B45309]">{summary.pending}</span></p>
              <p className="flex justify-between"><span className="text-[#64748B]">Rechazadas</span><span className="font-bold text-[#DC2626]">{summary.rejected}</span></p>
            </div>
            <div className="mt-3 border-t border-[#F1F5F9] pt-3 text-xs">
              <p className="text-[#64748B]">Aprobador</p>
              <p className="font-bold text-[#1A1A1A]">Recursos Humanos</p>
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-sm font-black text-[#1A1A1A]">Documentos requeridos</p>
            <ul className="mt-2 space-y-1.5 text-xs text-[#64748B]">
              <li>✓ Certificado de incapacidad</li>
              <li>✓ Debe contener diagnóstico (CIE-10 si aplica)</li>
              <li>✓ Fecha de inicio y fin</li>
              <li>✓ Nombre y sello del médico</li>
              <li>✓ Entidad o EPS que lo emite</li>
            </ul>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <p className="text-sm font-black text-[#1A1A1A]">¿Dudas?</p>
            <p className="mt-2 text-xs text-[#64748B]">
              Entrega tu incapacidad máximo dentro de los 2 días hábiles siguientes a la emisión.
              Si tienes preguntas, contacta a Recursos Humanos.
            </p>
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" onClick={() => setDetailId(null)}>
          <div className="w-full max-w-md rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-[#1A1A1A]">{detail.incapacityNumber ?? "Incapacidad"}</p>
              <button onClick={() => setDetailId(null)} className="text-[#94A3B8] hover:text-[#1A1A1A]">
                <MdClose size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="flex justify-between"><span className="text-[#64748B]">Tipo</span>
                <span className="font-bold text-[#1A1A1A]">{detail.incapacityType ? INCAPACITY_TYPE_MAP[detail.incapacityType] : "—"}</span>
              </p>
              <p className="flex justify-between"><span className="text-[#64748B]">Estado</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[detail.status] ?? ""}`}>
                  {STATUS_LABELS[detail.status] ?? detail.status}
                </span>
              </p>
              <p className="flex justify-between"><span className="text-[#64748B]">EPS</span>
                <span className="font-bold text-[#1A1A1A]">{detail.epsName ?? "—"}</span>
              </p>
              {detail.treatingDoctor && (
                <p className="flex justify-between"><span className="text-[#64748B]">Médico tratante</span>
                  <span className="font-bold text-[#1A1A1A]">{detail.treatingDoctor}</span>
                </p>
              )}
              {detail.issueDate && (
                <p className="flex justify-between"><span className="text-[#64748B]">Fecha de expedición</span>
                  <span className="font-bold text-[#1A1A1A]">{fmt(detail.issueDate)}</span>
                </p>
              )}
              <p className="flex justify-between"><span className="text-[#64748B]">Fechas</span>
                <span className="font-bold text-[#1A1A1A]">
                  {fmt(detail.startDate)}{detail.startDate !== detail.endDate ? ` – ${fmt(detail.endDate)}` : ""}
                </span>
              </p>
              <p className="flex justify-between"><span className="text-[#64748B]">Días</span>
                <span className="font-bold text-[#1A1A1A]">{detail.durationDays} días ({companyDaysOf(detail.durationDays)} empresa / {epsDaysOf(detail.durationDays)} EPS)</span>
              </p>
              {(detail.diagnosis || detail.diagnosisCode) && (
                <p className="flex justify-between"><span className="text-[#64748B]">Diagnóstico</span>
                  <span className="font-bold text-[#1A1A1A]">{detail.diagnosisCode ? `${detail.diagnosisCode} — ` : ""}{detail.diagnosis ?? ""}</span>
                </p>
              )}
              <p className="flex justify-between"><span className="text-[#64748B]">Valor estimado</span>
                <span className="font-bold text-[#1A1A1A]">
                  {(() => { const a = estimatedAmount(detail.durationDays, me?.salaryAmount ?? null); return a !== null ? fmtMoney(a) : "—"; })()}
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
                  <MdDownload size={14} /> Ver certificado médico
                </button>
              )}
              {detail.status === "PENDING" && (
                <button onClick={() => { cancel(detail.id); setDetailId(null); }} disabled={cancelingId === detail.id}
                  className="mt-2 w-full rounded-lg border border-[#DC2626] px-3 py-2 text-xs font-bold text-[#DC2626] disabled:opacity-50">
                  {cancelingId === detail.id ? "Cancelando…" : "Cancelar incapacidad"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
