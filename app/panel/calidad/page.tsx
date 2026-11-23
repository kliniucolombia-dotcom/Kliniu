"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdAdd, MdAssignment, MdChevronLeft, MdChevronRight, MdDelete, MdEdit, MdFactCheck, MdPrint, MdViewKanban,
} from "react-icons/md";
import { useConfirm } from "@/app/components/confirm-dialog";
import {
  Badge, Empty, Footer, Kpi, Modal, Section, Stat, Tabs, btnGhost, btnPrimary, fmtDate, inputCls, labelCls,
  patchReq, post, todayBogota, type Permission,
} from "../_components/ops-ui";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type Status = "CASE" | "CONFIRMED" | "PROPOSED_ACTION";
type Photo = { url: string; name: string; isImage: boolean };
type QCase = {
  id: string; status: Status; deliveryNote: string; lotNumber: string; city: string; photos: Photo[];
  dispatchedQty: number; defectiveQty: number; analysis: string | null; diagnosis: string | null;
  followUp: string | null; solution: string | null; createdAt: string; createdBy: { fullName: string };
};
type Report = { id: string; periodStart: string; periodEnd: string; kpis: Record<string, number>; notes: string | null; createdAt: string; author: { fullName: string } };

const TARGET = 2; // meta: máximo 2% defectuoso
const COLUMNS: { key: Status; title: string; accent: string }[] = [
  { key: "CASE", title: "Caso", accent: "#F59E0B" },
  { key: "CONFIRMED", title: "Confirmado", accent: "#2563EB" },
  { key: "PROPOSED_ACTION", title: "Acción propuesta", accent: "#16A34A" },
];
const pct = (d: number, t: number) => (t > 0 ? (d / t) * 100 : 0);
const fmtPct = (n: number) => `${n.toLocaleString("es-CO", { maximumFractionDigits: 2 })}%`;
const FOLLOW_FIELDS = [
  ["analysis", "Análisis"], ["diagnosis", "Diagnóstico"], ["followUp", "Seguimiento"], ["solution", "Solución"],
] as const;
const KPI_LABELS: Record<string, string> = {
  casos: "Casos", unidadesDespachadas: "Despachadas", unidadesDefectuosas: "Defectuosas", defectuosoPct: "% defectuoso", casosFueraDeMeta: "Casos sobre la meta",
};

type Tab = "tablero" | "informes";
type ModalState = { kind: "form"; item?: QCase } | { kind: "report" } | null;

function PctBadge({ d, t }: { d: number; t: number }) {
  const v = pct(d, t);
  return <Badge label={fmtPct(v)} cls={v > TARGET ? "bg-[#FEE2E2] text-[#B91C1C]" : "bg-[#DCFCE7] text-[#15803D]"} />;
}

export default function CalidadPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("tablero");
  const [cases, setCases] = useState<QCase[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [perm, setPerm] = useState<Permission>({ canView: true, canCreate: false, canEdit: false, canDelete: false });
  const [from, setFrom] = useState(todayBogota(-30));
  const [to, setTo] = useState(todayBogota());
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  const load = useCallback(async () => {
    const [r, rr] = await Promise.all([fetch("/api/panel/calidad"), fetch("/api/panel/operaciones/informes?module=MODULE_CALIDAD")]);
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    if (r.ok) { const j = await r.json(); setCases(j.cases); setPerm(j.permission); }
    if (rr.ok) setReports((await rr.json()).reports);
    setLoading(false);
  }, [router]);
  const { markLocalWrite } = useRealtimeRefresh(["production-control"], load);
  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t); }, [load]);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const done = (msg: string) => { setModal(null); setAlert({ type: "ok", msg }); void load(); };
  const fail = (msg: string) => setAlert({ type: "err", msg });

  const inRange = useMemo(
    () => cases.filter((c) => { const d = c.createdAt.slice(0, 10); return d >= from && d <= to; }),
    [cases, from, to],
  );
  const totals = useMemo(() => {
    const dispatched = inRange.reduce((t, c) => t + c.dispatchedQty, 0);
    const defective = inRange.reduce((t, c) => t + c.defectiveQty, 0);
    return { dispatched, defective, pct: pct(defective, dispatched), over: inRange.filter((c) => pct(c.defectiveQty, c.dispatchedQty) > TARGET).length };
  }, [inRange]);

  async function move(c: QCase, status: Status) {
    if (status === c.status) return;
    markLocalWrite();
    const res = await patchReq(`/api/panel/calidad/${c.id}`, { status });
    if (res.ok) void load(); else fail(res.error!);
  }
  async function remove(c: QCase) {
    if (!(await confirm({ title: "Eliminar caso", message: `¿Eliminar el caso del albarán ${c.deliveryNote}?`, confirmLabel: "Eliminar", danger: true }))) return;
    markLocalWrite();
    const r = await fetch(`/api/panel/calidad/${c.id}`, { method: "DELETE" });
    if (r.ok) { setAlert({ type: "ok", msg: "Caso eliminado" }); void load(); } else fail((await r.json()).error ?? "Error");
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="print:hidden">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-[#1A1A1A] sm:text-2xl">Calidad</h1>
            <p className="mt-1 text-sm text-[#64748B]">Casos de producto defectuoso por despacho. Meta: máximo {TARGET}% defectuoso.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div><label className={labelCls}>Desde</label><input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></div>
            <div><label className={labelCls}>Hasta</label><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputCls} /></div>
            {perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "form" })}><MdAdd size={16} />Nuevo caso</button>}
          </div>
        </div>

        {alert && <p className={`mb-4 rounded-xl px-4 py-2 text-sm font-bold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>{alert.msg}</p>}

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<MdFactCheck size={16} />} label="Casos en el período" value={String(inRange.length)} color="#27B1B8" />
          <Kpi icon={<MdAssignment size={16} />} label="Unidades despachadas" value={totals.dispatched.toLocaleString("es-CO")} color="#2563EB" />
          <Kpi icon={<MdAssignment size={16} />} label="Unidades defectuosas" value={totals.defective.toLocaleString("es-CO")} color="#F59E0B" />
          <Kpi icon={<MdFactCheck size={16} />} label={`% defectuoso (meta ≤ ${TARGET}%)`} value={fmtPct(totals.pct)} color={totals.pct > TARGET ? "#DC2626" : "#16A34A"} />
        </div>

        <Tabs<Tab> value={tab} onChange={setTab} tabs={[
          { key: "tablero", label: "Casos", icon: <MdViewKanban size={16} /> },
          { key: "informes", label: "Informes", icon: <MdAssignment size={16} /> },
        ]} />

        {loading ? <p className="text-sm text-[#94A3B8]">Cargando…</p> : tab === "tablero" ? (
          <div className="grid min-w-0 gap-4 md:grid-cols-3">
            {COLUMNS.map((col, ci) => {
              const items = inRange.filter((c) => c.status === col.key);
              return (
                <div
                  key={col.key}
                  className="min-w-0 rounded-2xl bg-[#F8FAFC] p-3"
                  onDragOver={(e) => perm.canEdit && e.preventDefault()}
                  onDrop={(e) => {
                    const c = cases.find((x) => x.id === e.dataTransfer.getData("text/plain"));
                    if (c && perm.canEdit) void move(c, col.key);
                  }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: col.accent }} />
                    <h3 className="text-sm font-black text-[#1A1A1A]">{col.title}</h3>
                    <span className="text-xs text-[#94A3B8]">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.length === 0 && <Empty text="Sin casos." />}
                    {items.map((c) => (
                      <div
                        key={c.id}
                        draggable={perm.canEdit}
                        onDragStart={(e) => e.dataTransfer.setData("text/plain", c.id)}
                        className="rounded-xl border border-[#E2E8F0] bg-white p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button type="button" className="min-w-0 text-left" onClick={() => setModal({ kind: "form", item: c })}>
                            <p className="truncate text-sm font-black text-[#1A1A1A]">Albarán {c.deliveryNote}</p>
                            <p className="truncate text-xs text-[#64748B]">Lote {c.lotNumber} · {c.city}</p>
                          </button>
                          <PctBadge d={c.defectiveQty} t={c.dispatchedQty} />
                        </div>
                        <p className="mt-2 text-xs text-[#64748B]">{c.defectiveQty} defectuosas de {c.dispatchedQty} despachadas</p>
                        {c.photos.length > 0 && (
                          <div className="mt-2 flex gap-1">
                            {c.photos.slice(0, 4).map((p, i) => (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={`${p.url}-${i}`} src={p.url} alt={p.name} className="h-10 w-10 rounded-lg border border-[#E2E8F0] object-cover" />
                            ))}
                          </div>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-[11px] text-[#94A3B8]">{fmtDate(c.createdAt)} · {c.createdBy.fullName}</p>
                          <div className="flex items-center gap-0.5">
                            {perm.canEdit && ci > 0 && <button aria-label="Mover a la columna anterior" className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9]" onClick={() => move(c, COLUMNS[ci - 1].key)}><MdChevronLeft size={16} /></button>}
                            {perm.canEdit && ci < COLUMNS.length - 1 && <button aria-label="Mover a la siguiente columna" className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9]" onClick={() => move(c, COLUMNS[ci + 1].key)}><MdChevronRight size={16} /></button>}
                            {perm.canEdit && <button aria-label="Editar caso" className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9]" onClick={() => setModal({ kind: "form", item: c })}><MdEdit size={15} /></button>}
                            {perm.canDelete && <button aria-label="Eliminar caso" className="rounded p-1 text-[#DC2626] hover:bg-[#FEE2E2]" onClick={() => remove(c)}><MdDelete size={15} /></button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Section
            title="Informes de calidad"
            action={(
              <div className="flex gap-2">
                <button className={btnGhost} onClick={() => window.print()} disabled={inRange.length === 0}><MdPrint size={16} />Imprimir / PDF</button>
                {perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "report" })}><MdAdd size={16} />Presentar informe</button>}
              </div>
            )}
          >
            {reports.length === 0 && <Empty text="Aún no hay informes presentados." />}
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-black text-[#1A1A1A]">{fmtDate(rep.periodStart)} — {fmtDate(rep.periodEnd)}</p>
                    <p className="text-xs text-[#94A3B8]">{rep.author.fullName} · {fmtDate(rep.createdAt)}</p>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {Object.keys(KPI_LABELS).filter((k) => k in rep.kpis).map((k) => (
                      <Stat key={k} label={KPI_LABELS[k]} value={k === "defectuosoPct" ? fmtPct(rep.kpis[k]) : String(rep.kpis[k])} />
                    ))}
                  </div>
                  {rep.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-[#1A1A1A]">{rep.notes}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}
      </div>

      <PrintReport cases={inRange} from={from} to={to} totals={totals} />

      {modal?.kind === "form" && <CaseModal item={modal.item} canEdit={modal.item ? perm.canEdit : perm.canCreate} onClose={() => setModal(null)} onDone={done} onError={fail} markLocalWrite={markLocalWrite} />}
      {modal?.kind === "report" && <ReportModal from={from} to={to} onClose={() => setModal(null)} onDone={done} onError={fail} />}
    </div>
  );
}

function PrintReport({ cases, from, to, totals }: { cases: QCase[]; from: string; to: string; totals: { dispatched: number; defective: number; pct: number; over: number } }) {
  return (
    <div className="hidden text-[11px] text-[#1A1A1A] print:block">
      <h1 className="text-lg font-black text-[#0C535B]">Informe de Calidad</h1>
      <p className="mb-3 text-[#64748B]">{fmtDate(`${from}T12:00:00-05:00`)} — {fmtDate(`${to}T12:00:00-05:00`)}</p>
      <p className="mb-3 font-bold">
        {cases.length} casos · {totals.dispatched} despachadas · {totals.defective} defectuosas · {fmtPct(totals.pct)} defectuoso (meta ≤ {TARGET}%) · {totals.over} casos sobre la meta
      </p>
      {cases.map((c) => (
        <section key={c.id} className="mb-3 break-inside-avoid border-b border-[#E2E8F0] pb-2">
          <p className="font-black">Albarán {c.deliveryNote} · Lote {c.lotNumber} · {c.city} · {c.defectiveQty}/{c.dispatchedQty} ({fmtPct(pct(c.defectiveQty, c.dispatchedQty))})</p>
          <p className="text-[#64748B]">{COLUMNS.find((x) => x.key === c.status)?.title} · {fmtDate(c.createdAt)} · {c.createdBy.fullName}</p>
          {FOLLOW_FIELDS.filter(([k]) => c[k]).map(([k, label]) => <p key={k}><b>{label}:</b> {c[k]}</p>)}
        </section>
      ))}
    </div>
  );
}

function PhotosField({ value, onChange, onError }: { value: Photo[]; onChange: (v: Photo[]) => void; onError: (m: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next = [...value];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/panel/calidad/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) { onError(json.error ?? `No fue posible subir ${file.name}`); continue; }
        next.push({ url: json.url, name: json.name, isImage: true });
      }
      onChange(next);
    } finally { setUploading(false); }
  };
  return (
    <div className="space-y-2">
      <label className={`${btnGhost} cursor-pointer`}>
        {uploading ? "Subiendo…" : "Adjuntar fotos"}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" disabled={uploading} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
      </label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((p, i) => (
            <span key={`${p.url}-${i}`} className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1">
              <a href={p.url} target="_blank" rel="noopener noreferrer" title={p.name}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt={p.name} className="h-12 w-12 rounded object-cover" />
              </a>
              <button type="button" className="rounded px-1 text-xs font-bold text-[#DC2626] hover:bg-[#FEE2E2]" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="Quitar foto">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const Req = () => <span className="text-[#DC2626]" aria-hidden="true"> *</span>;

function CaseModal({ item, canEdit, onClose, onDone, onError, markLocalWrite }: {
  item?: QCase; canEdit: boolean; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void; markLocalWrite: () => void;
}) {
  const [f, setF] = useState({
    deliveryNote: item?.deliveryNote ?? "", lotNumber: item?.lotNumber ?? "", city: item?.city ?? "",
    dispatchedQty: item ? String(item.dispatchedQty) : "", defectiveQty: item ? String(item.defectiveQty) : "",
    analysis: item?.analysis ?? "", diagnosis: item?.diagnosis ?? "", followUp: item?.followUp ?? "", solution: item?.solution ?? "",
  });
  const [photos, setPhotos] = useState<Photo[]>(item?.photos ?? []);
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const d = Number(f.dispatchedQty), q = Number(f.defectiveQty);
  const invalid = !f.deliveryNote.trim() || !f.lotNumber.trim() || !f.city.trim() || !(d > 0) || !(q >= 0) || q > d || !Number.isInteger(d) || !Number.isInteger(q)
    || photos.length === 0 || FOLLOW_FIELDS.some(([k]) => !f[k].trim());

  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
    const body = { ...f, dispatchedQty: d, defectiveQty: q, photos };
    const res = item ? await patchReq(`/api/panel/calidad/${item.id}`, body) : await post("/api/panel/calidad", body);
    setSubmitting(false);
    if (res.ok) onDone(item ? "Caso actualizado" : "Caso creado"); else onError(res.error!);
  };

  return (
    <Modal
      wide
      title={item ? `Caso — albarán ${item.deliveryNote}` : "Nuevo caso de calidad"}
      onClose={onClose}
      footer={canEdit ? <Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={invalid} /> : <button onClick={onClose} className={btnGhost}>Cerrar</button>}
    >
      <fieldset disabled={!canEdit} className="space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div><label className={labelCls}>Albarán<Req /></label><input value={f.deliveryNote} onChange={set("deliveryNote")} className={inputCls} /></div>
          <div><label className={labelCls}>No. de lote<Req /></label><input value={f.lotNumber} onChange={set("lotNumber")} className={inputCls} /></div>
          <div><label className={labelCls}>Ciudad<Req /></label><input value={f.city} onChange={set("city")} className={inputCls} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Cantidad despachada en el pedido<Req /></label><input type="number" min={1} value={f.dispatchedQty} onChange={set("dispatchedQty")} className={inputCls} /></div>
          <div><label className={labelCls}>Cantidad defectuosa<Req /></label><input type="number" min={0} value={f.defectiveQty} onChange={set("defectiveQty")} className={inputCls} /></div>
        </div>
        {d > 0 && q >= 0 && (
          <p className={`text-xs font-bold ${pct(q, d) > TARGET ? "text-[#B91C1C]" : "text-[#15803D]"}`}>
            {fmtPct(pct(q, d))} defectuoso {pct(q, d) > TARGET ? `— supera la meta del ${TARGET}%` : `— dentro de la meta del ${TARGET}%`}
          </p>
        )}
        {q > d && d > 0 && <p className="text-xs font-bold text-[#B91C1C]">La cantidad defectuosa no puede superar la despachada.</p>}
        <div><label className={labelCls}>Fotos (mínimo 1)<Req /></label><PhotosField value={photos} onChange={setPhotos} onError={onError} /></div>
        {FOLLOW_FIELDS.map(([k, label]) => (
          <div key={k}><label className={labelCls}>{label}<Req /></label><textarea rows={2} value={f[k]} onChange={set(k)} className={inputCls} /></div>
        ))}
      </fieldset>
    </Modal>
  );
}

function ReportModal({ from, to, onClose, onDone, onError }: { from: string; to: string; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [periodStart, setPeriodStart] = useState(from);
  const [periodEnd, setPeriodEnd] = useState(to);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/operaciones/informes", { module: "MODULE_CALIDAD", periodStart, periodEnd, notes });
    setSubmitting(false);
    if (res.ok) onDone("Informe presentado"); else onError(res.error!);
  };
  return (
    <Modal title="Presentar informe de calidad" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={periodEnd < periodStart} />}>
      <p className="text-xs text-[#64748B]">Los indicadores (casos, % defectuoso vs. meta de {TARGET}%) se calculan con los casos creados en el período.</p>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Desde</label><input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Hasta</label><input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Observaciones</label><textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
    </Modal>
  );
}
