"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  MdDescription, MdDownload, MdVisibility, MdSearch, MdUploadFile, MdClose,
  MdSchedule, MdInfoOutline, MdShield, MdDelete, MdChevronLeft, MdChevronRight,
} from "react-icons/md";
import { SimpleSelect } from "@/app/panel/_components/simple-select";
import { fmtDateOnly } from "@/lib/date";

type EmployeeDocument = {
  id: string;
  category: string;
  name: string;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  expiresAt: string | null;
  uploadedBySelf: boolean;
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  CONTRATO: "Contrato",
  CERTIFICADO: "Certificado",
  COMPROBANTE_PAGO: "Comprobante de pago",
  OTRO: "Otro",
};

const TABS = [
  { key: "", label: "Todos" },
  { key: "CONTRATO", label: "Contratos" },
  { key: "CERTIFICADO", label: "Certificados" },
  { key: "COMPROBANTE_PAGO", label: "Comprobantes" },
  { key: "OTRO", label: "Otros" },
];

const PER_PAGE = 10;
const SOON_DAYS = 60;

function fmt(d: string) {
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

/** expiresAt es fecha de calendario: sin timeZone UTC se corre un día. */
function fmtExpiry(d: string) {
  return fmtDateOnly(d, { day: "2-digit", month: "short", year: "numeric" });
}

function fmtSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024) return "< 1 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function extOf(fileName: string) {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
}

/** Vigente | Por vencer (<= 60 días) | Vencido | sin vencimiento */
function expiryState(expiresAt: string | null) {
  if (!expiresAt) return { key: "none", label: "Vigente", style: "bg-[#DCFCE7] text-[#16A34A]" };
  const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (days < 0) return { key: "expired", label: "Vencido", style: "bg-[#FEE2E2] text-[#DC2626]", days };
  if (days <= SOON_DAYS) return { key: "soon", label: "Por vencer", style: "bg-[#DBEAFE] text-[#2563EB]", days };
  return { key: "valid", label: "Vigente", style: "bg-[#DCFCE7] text-[#16A34A]", days };
}

function relative(days: number) {
  if (days <= 0) return "Vencido";
  if (days < 30) return `En ${days} día${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  return `En ${months} mes${months === 1 ? "" : "es"}`;
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

const EMPTY_FORM = { name: "", category: "OTRO", expiresAt: "" };

export default function DocumentosPage() {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [showBanner, setShowBanner] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [file, setFile] = useState<File | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await fetch("/api/rrhh-local/documents");
    if (res.ok) setDocuments(await res.json());
    else setError("No fue posible cargar tus documentos");
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [tab, search, filterStatus, from, to]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (tab && d.category !== tab) return false;
      if (term && !d.name.toLowerCase().includes(term) && !d.fileName.toLowerCase().includes(term)) return false;
      if (filterStatus && expiryState(d.expiresAt).key !== filterStatus) return false;
      if (from && new Date(d.createdAt) < new Date(from)) return false;
      if (to && new Date(d.createdAt) > new Date(`${to}T23:59:59`)) return false;
      return true;
    });
  }, [documents, tab, search, filterStatus, from, to]);

  const kpis = useMemo(() => {
    let soon = 0;
    let expired = 0;
    let mine = 0;
    documents.forEach((d) => {
      const state = expiryState(d.expiresAt);
      if (state.key === "soon") soon += 1;
      if (state.key === "expired") expired += 1;
      if (d.uploadedBySelf) mine += 1;
    });
    return { total: documents.length, soon, expired, mine };
  }, [documents]);

  const expiringSoon = useMemo(
    () =>
      documents
        .filter((d) => ["soon", "expired"].includes(expiryState(d.expiresAt).key))
        .sort((a, b) => new Date(a.expiresAt!).getTime() - new Date(b.expiresAt!).getTime()),
    [documents],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const view = async (fileUrl: string) => {
    const res = await fetch(`/api/rrhh-local/time-off/upload?path=${encodeURIComponent(fileUrl)}`);
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.url) window.open(data.url, "_blank");
    else setError(data.error || "No fue posible abrir el documento");
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este documento?")) return;
    const res = await fetch(`/api/rrhh-local/documents/${id}`, { method: "DELETE" });
    if (res.ok) await load();
    else setError("No fue posible eliminar el documento");
  };

  const submit = async () => {
    if (!file) return setError("Debes seleccionar un archivo");
    setUploading(true);
    setError("");

    const fd = new FormData();
    fd.append("file", file);
    const uploadRes = await fetch("/api/rrhh-local/time-off/upload", { method: "POST", body: fd });
    const uploaded = await uploadRes.json().catch(() => ({}));
    if (!uploadRes.ok) {
      setError(uploaded.error || "No fue posible subir el archivo");
      setUploading(false);
      return;
    }

    const res = await fetch("/api/rrhh-local/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category: form.category,
        name: form.name.trim() || file.name,
        fileUrl: uploaded.path,
        fileName: file.name,
        fileSize: file.size,
        expiresAt: form.expiresAt || null,
      }),
    });

    if (res.ok) {
      setModalOpen(false);
      setForm(EMPTY_FORM);
      setFile(null);
      await load();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No fue posible registrar el documento");
    }
    setUploading(false);
  };

  if (loading) return <div className="p-6 text-sm text-[#64748B]">Cargando…</div>;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E6FAFB] text-[#27B1B8]">
          <MdDescription size={20} />
        </div>
        <div>
          <h1 className="text-xl font-black text-[#1A1A1A]">Mis documentos</h1>
          <p className="text-xs text-[#64748B]">Contratos, certificados y comprobantes que RRHH ha compartido contigo.</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi value={kpis.total} label="Total documentos" hint="Todos tus documentos" icon={<MdDescription size={20} />} tone="bg-[#E6FAFB] text-[#27B1B8]" />
        <Kpi value={kpis.soon} label="Por vencer" hint={`Vencen en ${SOON_DAYS} días o menos`} icon={<MdSchedule size={20} />} tone="bg-[#DBEAFE] text-[#2563EB]" />
        <Kpi value={kpis.expired} label="Vencidos" hint="Requieren actualización" icon={<MdSchedule size={20} />} tone="bg-[#FEE2E2] text-[#DC2626]" />
        <Kpi value={kpis.mine} label="Subidos por ti" hint="Cargados desde el portal" icon={<MdUploadFile size={20} />} tone="bg-[#DCFCE7] text-[#16A34A]" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
            <div className="flex gap-4 overflow-x-auto border-b border-[#E2E8F0] px-4">
              {TABS.map((t) => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-bold ${
                    tab === t.key ? "border-[#27B1B8] text-[#27B1B8]" : "border-transparent text-[#64748B]"
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-3 border-b border-[#E2E8F0] p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar documento…"
                  className="w-full rounded-lg border border-[#E2E8F0] py-2 pl-9 pr-3 text-sm" />
              </div>
              <div className="text-[10px] font-bold uppercase text-[#94A3B8]">
                Estado
                <SimpleSelect value={filterStatus} onChange={setFilterStatus}
                  options={[
                    { value: "", label: "Todos" },
                    { value: "none", label: "Sin vencimiento" },
                    { value: "valid", label: "Vigente" },
                    { value: "soon", label: "Por vencer" },
                    { value: "expired", label: "Vencido" },
                  ]}
                  triggerClassName="mt-1 flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] px-3 py-2 text-left text-sm font-normal normal-case text-[#1A1A1A]" />
              </div>
              <label className="text-[10px] font-bold uppercase text-[#94A3B8]">
                Fecha desde
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal normal-case text-[#1A1A1A]" />
              </label>
              <label className="text-[10px] font-bold uppercase text-[#94A3B8]">
                Fecha hasta
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal normal-case text-[#1A1A1A]" />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-[#E2E8F0] text-left text-xs font-bold uppercase text-[#64748B]">
                    <th className="p-3">Nombre</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Vencimiento</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((d) => {
                    const state = expiryState(d.expiresAt);
                    const size = fmtSize(d.fileSize);
                    return (
                      <tr key={d.id} className="border-b border-[#F1F5F9] last:border-b-0">
                        <td className="p-3">
                          <p className="font-bold text-[#1A1A1A]">{d.name}</p>
                          <p className="text-xs text-[#94A3B8]">
                            {[extOf(d.fileName), size].filter(Boolean).join(" • ") || d.fileName}
                          </p>
                        </td>
                        <td className="p-3 text-[#64748B]">{CATEGORY_LABELS[d.category] ?? d.category}</td>
                        <td className="p-3">
                          <p className="text-[#1A1A1A]">{fmt(d.createdAt)}</p>
                          <p className="text-xs text-[#94A3B8]">{d.uploadedBySelf ? "Subido por ti" : "Compartido por RRHH"}</p>
                        </td>
                        <td className="p-3 text-[#64748B]">{d.expiresAt ? fmtExpiry(d.expiresAt) : "—"}</td>
                        <td className="p-3">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${state.style}`}>{state.label}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => view(d.fileUrl)} title="Ver"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]">
                              <MdVisibility size={16} />
                            </button>
                            <button onClick={() => view(d.fileUrl)} title="Descargar"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#27B1B8] hover:bg-[#E6FAFB]">
                              <MdDownload size={16} />
                            </button>
                            {d.uploadedBySelf && (
                              <button onClick={() => remove(d.id)} title="Eliminar"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#DC2626] hover:bg-red-50">
                                <MdDelete size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td className="p-4 text-sm text-[#94A3B8]" colSpan={6}>No hay documentos que coincidan con los filtros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {filtered.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] p-4">
                <p className="text-xs text-[#64748B]">
                  Mostrando {(page - 1) * PER_PAGE + 1} a {Math.min(page * PER_PAGE, filtered.length)} de {filtered.length} documentos
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] disabled:opacity-40">
                    <MdChevronLeft size={18} />
                  </button>
                  {getPageNumbers(page, pageCount).map((p, i) =>
                    p === "..." ? (
                      <span key={`gap-${i}`} className="px-2 text-xs text-[#94A3B8]">…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p)}
                        className={`h-8 min-w-8 rounded-lg px-2 text-xs font-bold ${
                          p === page ? "bg-[#27B1B8] text-white" : "border border-[#E2E8F0] text-[#64748B]"
                        }`}>
                        {p}
                      </button>
                    ),
                  )}
                  <button onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page === pageCount}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] disabled:opacity-40">
                    <MdChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <button onClick={() => setModalOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1F9BA1]">
            <MdUploadFile size={18} /> Subir documento
          </button>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <h3 className="mb-3 text-sm font-black text-[#1A1A1A]">Documentos próximos a vencer</h3>
            {expiringSoon.length === 0 && <p className="text-xs text-[#94A3B8]">Ningún documento próximo a vencer.</p>}
            <div className="space-y-3">
              {expiringSoon.slice(0, 4).map((d) => {
                const state = expiryState(d.expiresAt);
                return (
                  <div key={d.id} className="flex items-start gap-2">
                    <MdSchedule className="mt-0.5 shrink-0 text-[#F59E0B]" size={16} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-[#1A1A1A]">{d.name}</p>
                      <p className="text-[11px] text-[#94A3B8]">Vence el {fmtExpiry(d.expiresAt!)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${state.style}`}>
                      {relative(state.days ?? 0)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-[#E2E8F0] bg-white p-4">
            <div className="mb-2 flex items-center gap-2">
              <MdInfoOutline className="text-[#27B1B8]" size={18} />
              <h3 className="text-sm font-black text-[#1A1A1A]">Información importante</h3>
            </div>
            <ol className="list-decimal space-y-1.5 pl-4 text-xs text-[#64748B]">
              <li>Mantén tus documentos actualizados.</li>
              <li>Los documentos compartidos por RRHH no se pueden eliminar desde el portal.</li>
              <li>Algunos documentos tienen fecha de vencimiento.</li>
            </ol>
          </div>
        </div>
      </div>

      {showBanner && (
        <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F0FDFF] p-4">
          <div className="flex items-start gap-3">
            <MdShield className="mt-0.5 shrink-0 text-[#27B1B8]" size={20} />
            <div>
              <p className="text-sm font-black text-[#1A1A1A]">Tu información está segura</p>
              <p className="text-xs text-[#64748B]">Los documentos compartidos por RRHH están protegidos y solo tú puedes verlos.</p>
            </div>
          </div>
          <button onClick={() => setShowBanner(false)} className="shrink-0 text-[#64748B] hover:text-[#1A1A1A]">
            <MdClose size={18} />
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-sm rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-black text-[#1A1A1A]">Subir documento</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#64748B]"><MdClose size={18} /></button>
            </div>
            <div className="space-y-3">
              <label className="block text-xs font-bold text-[#64748B]">
                Nombre
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej. Certificado EPS"
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]" />
              </label>
              <div className="text-xs font-bold text-[#64748B]">
                Categoría
                <SimpleSelect value={form.category} onChange={(v) => setForm({ ...form, category: v })}
                  options={Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }))}
                  triggerClassName="mt-1 flex w-full items-center justify-between rounded-lg border border-[#E2E8F0] px-3 py-2 text-left text-sm font-normal text-[#1A1A1A]" />
              </div>
              <label className="block text-xs font-bold text-[#64748B]">
                Fecha de vencimiento (opcional)
                <input type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm font-normal text-[#1A1A1A]" />
              </label>
              <div>
                <button onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[#CBD5E1] px-3 py-3 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                  <MdUploadFile size={18} /> {file ? file.name : "Seleccionar archivo (PDF o imagen)"}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <button onClick={submit} disabled={uploading || !file}
                className="w-full rounded-lg bg-[#27B1B8] px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {uploading ? "Subiendo…" : "Subir documento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ value, label, hint, icon, tone }: {
  value: number; label: string; hint: string; icon: React.ReactNode; tone: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white p-4">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tone}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-2xl font-black text-[#1A1A1A]">{value}</p>
        <p className="text-xs font-bold text-[#64748B]">{label}</p>
        <p className="truncate text-[11px] text-[#94A3B8]">{hint}</p>
      </div>
    </div>
  );
}
