"use client";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MdAdd, MdAttachFile, MdDelete, MdDraw, MdEdit, MdPictureAsPdf, MdPrint, MdVerified, MdVideocam } from "react-icons/md";
const isVideo = (url: string) => /\.(mp4|mov|webm)(\?|$)/i.test(url);
const VIDEO_MAX = 50 * 1024 * 1024;
import { useConfirm } from "@/app/components/confirm-dialog";
import {
  Badge, Empty, Footer, Kpi, Modal, btnGhost, btnPrimary, fmtDate, fmtDateTime, inputCls, labelCls,
  patchReq, post, todayBogota, type Permission,
} from "../_components/ops-ui";
import { SignaturePad } from "../mantenimiento/signature-pad";

type Attachment = { url: string; name: string; isImage: boolean };
type Check = "C" | "N" | "NA";
type Inspection = {
  id: string; inspectedOn: string; productRef: string; lotNumber: string; lotQty: number; sampleSize: number;
  sampleRange: string; checks: Record<string, Check>; nonConforming: number; lotConforming: boolean; action: string | null; attachments: Attachment[];
  createdBy: { fullName: string }; updatedAt: string; signatureData: string | null; signedAt: string | null; signedBy: { fullName: string } | null;
};

// Mismo orden y textos del formato en papel.
const CHECKS = [
  ["color", "Color", "Color homogéneo"],
  ["forma", "Forma", "Forma perfecta, sin sobrantes ni rebabas"],
  ["transparencia", "Transp.", "Transparencia, sin manchas ni burbujas"],
  ["fisuras", "Fisuras", "Sin fisuras ni deformaciones"],
  ["soldadura", "Soldadura", "Soldadura limpia y estable"],
  ["acople", "Acople", "Prueba de acople, piezas completas"],
  ["succion", "Succión", "Prueba de succión de fluido"],
  ["sellado", "Sellado", "Prueba de sellado, sin filtración"],
  ["etiqueta", "Etiqueta", "Etiqueta de identificación"],
] as const;
const CHECK_OPTS: { v: Check; label: string; on: string }[] = [
  { v: "C", label: "C", on: "bg-[#16A34A] text-white border-[#16A34A]" },
  { v: "N", label: "N", on: "bg-[#DC2626] text-white border-[#DC2626]" },
  { v: "NA", label: "N/A", on: "bg-[#64748B] text-white border-[#64748B]" },
];
const CHECK_CLS: Record<Check, string> = { C: "bg-[#DCFCE7] text-[#15803D]", N: "bg-[#FEE2E2] text-[#B91C1C]", NA: "bg-[#F1F5F9] text-[#64748B]" };

const civil = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);

export default function ControlCalidadPage() {
  const router = useRouter();
  const confirm = useConfirm();
  const [rows, setRows] = useState<Inspection[]>([]);
  const [perm, setPerm] = useState<Permission>({ canView: true, canCreate: false, canEdit: false, canDelete: false });
  const [canSign, setCanSign] = useState(false);
  const [from, setFrom] = useState(todayBogota(-30));
  const [to, setTo] = useState(todayBogota());
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ kind: "form"; item?: Inspection } | { kind: "sign"; item: Inspection } | null>(null);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [printRow, setPrintRow] = useState<Inspection | null>(null);
  const endPrint = useCallback(() => setPrintRow(null), []);

  const load = useCallback(async () => {
    const r = await fetch("/api/panel/control-calidad");
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    if (r.ok) { const j = await r.json(); setRows(j.inspections); setPerm(j.permission); setCanSign(j.canSign); }
    setLoading(false);
  }, [router]);
  useEffect(() => { const t = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(t); }, [load]);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const done = (msg: string) => { setModal(null); setAlert({ type: "ok", msg }); void load(); };
  const fail = (msg: string) => setAlert({ type: "err", msg });

  const inRange = useMemo(() => rows.filter((r) => { const d = civil(r.inspectedOn); return d >= from && d <= to; }), [rows, from, to]);
  const pending = inRange.filter((r) => !r.signedAt).length;
  const rejected = inRange.filter((r) => !r.lotConforming).length;

  async function remove(r: Inspection) {
    if (!(await confirm({ title: "Eliminar registro", message: `¿Eliminar la inspección del lote ${r.lotNumber}?`, confirmLabel: "Eliminar", danger: true }))) return;
    const res = await fetch(`/api/panel/control-calidad/${r.id}`, { method: "DELETE" });
    if (res.ok) { setAlert({ type: "ok", msg: "Registro eliminado" }); void load(); } else fail((await res.json()).error ?? "Error");
  }

  const th = "px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]";
  const td = "px-2 py-2 text-xs text-[#1A1A1A]";

  return (
    <div className="p-6 lg:p-8">
      <div className="print:hidden">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones</p>
          <h1 className="mt-1 text-xl font-black text-[#1A1A1A] sm:text-2xl">Control de calidad</h1>
          <p className="mt-1 text-sm text-[#64748B]">Formato de inspección y control de calidad de producto terminado. La liberación la firma el ingeniero.</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div><label className={labelCls}>Desde</label><input type="date" aria-label="Desde" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Hasta</label><input type="date" aria-label="Hasta" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputCls} /></div>
          <button className={btnGhost} onClick={() => void printWhenReady()} disabled={inRange.length === 0}><MdPrint size={16} />Imprimir / PDF</button>
          {perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "form" })}><MdAdd size={16} />Nueva inspección</button>}
        </div>
      </div>

      {alert && <p className={`mb-4 rounded-xl px-4 py-2 text-sm font-bold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>{alert.msg}</p>}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Kpi icon={<MdVerified size={16} />} label="Lotes inspeccionados" value={String(inRange.length)} color="#27B1B8" />
        <Kpi icon={<MdDraw size={16} />} label="Pendientes de firma" value={String(pending)} color={pending ? "#F59E0B" : "#16A34A"} />
        <Kpi icon={<MdVerified size={16} />} label="Lotes no conformes" value={String(rejected)} color={rejected ? "#DC2626" : "#16A34A"} />
      </div>

      {loading ? <p className="text-sm text-[#94A3B8]">Cargando…</p> : inRange.length === 0 ? <Empty text="Sin inspecciones en el período." /> : (
        <div className="min-w-0 overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[1500px]">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left">
              <tr>
                <th className={th}>Fecha</th><th className={th}>Referencia / producto</th><th className={th}>No. lote</th>
                <th className={th}>Piezas lote</th><th className={th}>Muestra</th><th className={th}>Consecutivo</th>
                {CHECKS.map(([k, short, full]) => <th key={k} className={`${th} text-center`} title={full}>{short}</th>)}
                <th className={th}>No conformes</th><th className={th}>Lote conforme</th><th className={th}>Acción no conforme</th>
                <th className={th}>Adjuntos</th><th className={th}>Firma de liberación</th><th className={th} aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {inRange.map((r) => (
                <tr key={r.id} className="border-b border-[#F1F5F9] align-middle">
                  <td className={`${td} whitespace-nowrap`}>{fmtDate(r.inspectedOn)}</td>
                  <td className={`${td} font-bold`}>{r.productRef}</td>
                  <td className={td}>{r.lotNumber}</td>
                  <td className={td}>{r.lotQty}</td>
                  <td className={td}>{r.sampleSize}</td>
                  <td className={td}>{r.sampleRange}</td>
                  {CHECKS.map(([k, , full]) => (
                    <td key={k} className={`${td} text-center`} title={full}>
                      <span className={`inline-block min-w-7 rounded px-1 py-0.5 text-[10px] font-black ${CHECK_CLS[r.checks[k]]}`}>{r.checks[k] === "NA" ? "N/A" : r.checks[k]}</span>
                    </td>
                  ))}
                  <td className={td}>{r.nonConforming}</td>
                  <td className={td}><Badge label={r.lotConforming ? "Sí" : "No"} cls={r.lotConforming ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"} /></td>
                  <td className={`${td} max-w-[200px]`}>{r.action ?? "—"}</td>
                  <td className={td}>
                    {r.attachments.length === 0 ? "—" : (
                      <div className="flex max-w-[140px] flex-wrap gap-1">
                        {r.attachments.map((a, i) => (
                          <a key={`${a.url}-${i}`} href={a.url} target="_blank" rel="noopener noreferrer" title={a.name}>
                            {a.isImage
                              // eslint-disable-next-line @next/next/no-img-element
                              ? <img src={a.url} alt={a.name} className="h-9 w-9 rounded border border-[#E2E8F0] object-cover" />
                              : <span className="flex h-9 w-9 items-center justify-center rounded border border-[#E2E8F0] text-[#64748B]">{isVideo(a.url) ? <MdVideocam size={16} /> : <MdAttachFile size={16} />}</span>}
                          </a>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className={td}>
                    {r.signedAt && r.signatureData ? (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={r.signatureData} alt={`Firma de ${r.signedBy?.fullName ?? "el ingeniero"}`} className="h-10 rounded border border-[#E2E8F0] bg-white" />
                        <p className="mt-0.5 text-[10px] text-[#94A3B8]">{r.signedBy?.fullName} · {fmtDateTime(r.signedAt)}</p>
                      </div>
                    ) : canSign ? (
                      <button className={`${btnPrimary} px-2.5 py-1 text-xs`} onClick={() => setModal({ kind: "sign", item: r })}><MdDraw size={14} />Firmar</button>
                    ) : (
                      <Badge label="Pendiente de firma" cls="bg-[#FEF3C7] text-[#B45309]" />
                    )}
                  </td>
                  <td className={td}>
                    <div className="flex gap-0.5">
                      <button aria-label={`Descargar PDF del lote ${r.lotNumber}`} title="Descargar PDF" className="rounded p-1 text-[#0C535B] hover:bg-[#F1F5F9]" onClick={() => setPrintRow(r)}><MdPictureAsPdf size={15} /></button>
                      {!r.signedAt && (<>
                        {perm.canEdit && <button aria-label="Editar inspección" className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9]" onClick={() => setModal({ kind: "form", item: r })}><MdEdit size={15} /></button>}
                        {perm.canDelete && <button aria-label="Eliminar inspección" className="rounded p-1 text-[#DC2626] hover:bg-[#FEE2E2]" onClick={() => remove(r)}><MdDelete size={15} /></button>}
                      </>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>

      {printRow ? <RecordSheet r={printRow} onDone={endPrint} /> : <PrintSheet rows={inRange} from={from} to={to} />}

      {modal?.kind === "form" && <InspectionModal item={modal.item} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "sign" && <SignModal item={modal.item} onClose={() => setModal(null)} onDone={done} onError={fail} />}
    </div>
  );
}

// Hoja imprimible: replica el formato en papel (tabla horizontal + firma por lote).
function PrintSheet({ rows, from, to }: { rows: Inspection[]; from: string; to: string }) {
  const cell = "border border-[#94A3B8] px-1 py-0.5";
  const mark = (v: Check) => (v === "NA" ? "N/A" : v);
  // Portal a <body>: fuera del shell del panel (dock, banner de cookies, anchos) que si no se imprimen encima.
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  if (!mounted) return null;
  return createPortal(
    <div id="cc-print" className="hidden bg-white text-[8px] leading-tight text-black print:block">
      <style>{`@media print {
        body > *:not(#cc-print) { display: none !important; }
        body { background: #fff !important; }
        @page { size: landscape; margin: 8mm; }
        #cc-print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }`}</style>
      <div className="mb-2 flex items-center justify-between border border-[#94A3B8] px-2 py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Kliniu" className="h-7 w-auto" />
        <p className="text-[11px] font-black">FORMATO INSPECCIÓN Y CONTROL DE CALIDAD DE PRODUCTO TERMINADO</p>
        <p className="text-[8px]">{fmtDate(`${from}T12:00:00-05:00`)} — {fmtDate(`${to}T12:00:00-05:00`)}</p>
      </div>
      <table className="w-full border-collapse text-center">
        <thead className="bg-[#F1F5F9] font-bold">
          <tr>
            <th className={cell}>Fecha</th><th className={cell}>Referencia o nombre del producto</th><th className={cell}>No. de lote</th>
            <th className={cell}>No. de piezas del lote</th><th className={cell}>Tamaño de la muestra</th><th className={cell}>Consecutivo de la muestra</th>
            {CHECKS.map(([k, , full]) => <th key={k} className={cell}>{full}</th>)}
            <th className={cell}>Total de no conformes</th><th className={cell}>Conformidad del lote</th>
            <th className={cell}>Acción sobre el producto no conforme</th><th className={cell}>Firma de liberación</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="break-inside-avoid">
              <td className={`${cell} whitespace-nowrap`}>{fmtDate(r.inspectedOn)}</td>
              <td className={`${cell} text-left`}>{r.productRef}</td>
              <td className={cell}>{r.lotNumber}</td><td className={cell}>{r.lotQty}</td><td className={cell}>{r.sampleSize}</td><td className={cell}>{r.sampleRange}</td>
              {CHECKS.map(([k]) => <td key={k} className={`${cell} font-bold`}>{mark(r.checks[k])}</td>)}
              <td className={cell}>{r.nonConforming}</td>
              <td className={`${cell} font-bold`}>{r.lotConforming ? "SÍ" : "NO"}</td>
              <td className={`${cell} text-left`}>{r.action ?? "—"}</td>
              <td className={cell}>
                {r.signatureData ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.signatureData} alt={`Firma de ${r.signedBy?.fullName ?? "el ingeniero"}`} className="mx-auto h-7 w-auto" />
                ) : <span className="text-[#94A3B8]">Pendiente</span>}
                {r.signedBy && <p>{r.signedBy.fullName}</p>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-1 text-[7px]">C = conforme · N = no conforme · N/A = no aplica</p>
      {rows.some((r) => r.attachments.some((a) => a.isImage)) && (
        <div className="break-before-page">
          <p className="mb-2 text-[11px] font-black">REGISTRO FOTOGRÁFICO</p>
          {rows.filter((r) => r.attachments.some((a) => a.isImage)).map((r) => (
            <div key={r.id} className="mb-3 break-inside-avoid">
              <p className="mb-1 text-[9px] font-bold">Lote {r.lotNumber} · {r.productRef} · {fmtDate(r.inspectedOn)}</p>
              <div className="grid grid-cols-4 gap-2">
                {r.attachments.filter((a) => a.isImage).map((a, i) => (
                  <figure key={`${a.url}-${i}`} className="break-inside-avoid border border-[#94A3B8] p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.url} alt={a.name} className="h-[60mm] w-full object-contain" />
                  </figure>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}

// Abre el diálogo de impresión cuando las fotos ya cargaron; si no, salen en blanco.
async function printWhenReady() {
  const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("#cc-print img"));
  await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((res) => { i.onload = i.onerror = res; }))));
  window.print();
}

// PDF de un solo registro (vertical): datos, criterios, firma y fotos grandes.
function RecordSheet({ r, onDone }: { r: Inspection; onDone: () => void }) {
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false);
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const prev = document.title;
    void (async () => {
      await new Promise((res) => setTimeout(res, 0));
      if (cancelled) return;
      document.title = `control-calidad-lote-${r.lotNumber}`; // nombre sugerido del PDF
      window.addEventListener("afterprint", () => { document.title = prev; onDone(); }, { once: true });
      await printWhenReady();
    })();
    return () => { cancelled = true; };
  }, [mounted, r.lotNumber, onDone]);
  if (!mounted) return null;
  const cell = "border border-[#94A3B8] px-2 py-1";
  const photos = r.attachments.filter((a) => a.isImage);
  const files = r.attachments.filter((a) => !a.isImage);
  return createPortal(
    <div id="cc-print" className="hidden bg-white text-[11px] leading-snug text-black print:block">
      <style>{`@media print {
        body > *:not(#cc-print) { display: none !important; }
        body { background: #fff !important; }
        @page { size: A4 portrait; margin: 12mm; }
        #cc-print { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      }`}</style>
      <div className="mb-3 flex items-center justify-between gap-3 border border-[#94A3B8] px-3 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Kliniu" className="h-8 w-auto" />
        <p className="text-center text-[12px] font-black">FORMATO INSPECCIÓN Y CONTROL DE CALIDAD DE PRODUCTO TERMINADO</p>
        <p className="whitespace-nowrap">Lote {r.lotNumber}</p>
      </div>
      <table className="mb-3 w-full border-collapse">
        <tbody>
          <tr><th className={`${cell} w-1/4 bg-[#F1F5F9] text-left`}>Fecha</th><td className={cell}>{fmtDate(r.inspectedOn)}</td><th className={`${cell} w-1/4 bg-[#F1F5F9] text-left`}>No. de lote</th><td className={cell}>{r.lotNumber}</td></tr>
          <tr><th className={`${cell} bg-[#F1F5F9] text-left`}>Referencia o nombre del producto</th><td className={cell} colSpan={3}>{r.productRef}</td></tr>
          <tr><th className={`${cell} bg-[#F1F5F9] text-left`}>No. de piezas del lote</th><td className={cell}>{r.lotQty}</td><th className={`${cell} bg-[#F1F5F9] text-left`}>Tamaño de la muestra</th><td className={cell}>{r.sampleSize}</td></tr>
          <tr><th className={`${cell} bg-[#F1F5F9] text-left`}>Consecutivo de la muestra</th><td className={cell}>{r.sampleRange}</td><th className={`${cell} bg-[#F1F5F9] text-left`}>Registrado por</th><td className={cell}>{r.createdBy.fullName}</td></tr>
        </tbody>
      </table>
      <table className="mb-3 w-full border-collapse">
        <thead><tr className="bg-[#F1F5F9]"><th className={`${cell} text-left`}>Criterio</th><th className={`${cell} w-24`}>Resultado</th></tr></thead>
        <tbody>
          {CHECKS.map(([k, , full]) => (
            <tr key={k}><td className={cell}>{full}</td><td className={`${cell} text-center font-black`}>{r.checks[k] === "NA" ? "N/A" : r.checks[k]}</td></tr>
          ))}
        </tbody>
      </table>
      <table className="mb-3 w-full border-collapse">
        <tbody>
          <tr><th className={`${cell} w-1/4 bg-[#F1F5F9] text-left`}>Total de no conformes</th><td className={cell}>{r.nonConforming}</td><th className={`${cell} w-1/4 bg-[#F1F5F9] text-left`}>Conformidad del lote</th><td className={`${cell} font-black`}>{r.lotConforming ? "SÍ" : "NO"}</td></tr>
          <tr><th className={`${cell} bg-[#F1F5F9] text-left`}>Acción sobre el producto no conforme</th><td className={cell} colSpan={3}>{r.action ?? "—"}</td></tr>
          <tr>
            <th className={`${cell} bg-[#F1F5F9] text-left`}>Firma de liberación</th>
            <td className={cell} colSpan={3}>
              {r.signatureData ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.signatureData} alt={`Firma de ${r.signedBy?.fullName ?? "el ingeniero"}`} className="h-14 w-auto" />
              ) : <span className="text-[#64748B]">Pendiente de firma</span>}
              {r.signedBy && <p>{r.signedBy.fullName}{r.signedAt && ` · ${fmtDateTime(r.signedAt)}`}</p>}
            </td>
          </tr>
        </tbody>
      </table>
      <p className="text-[9px]">C = conforme · N = no conforme · N/A = no aplica</p>
      {photos.length > 0 && (
        <>
          <p className="mb-2 mt-4 text-[12px] font-black">Registro fotográfico ({photos.length})</p>
          <div className="grid grid-cols-2 gap-3">
            {photos.map((a, i) => (
              <figure key={`${a.url}-${i}`} className="break-inside-avoid border border-[#94A3B8] p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.url} alt={a.name} className="mx-auto h-[85mm] w-full object-contain" />
                <figcaption className="mt-1 truncate text-center text-[9px] text-[#64748B]">Foto {i + 1} · {a.name}</figcaption>
              </figure>
            ))}
          </div>
        </>
      )}
      {files.length > 0 && (
        <div className="mt-3 text-[10px]">
          <p>Otros adjuntos: {files.filter((a) => !isVideo(a.url)).map((a) => a.name).join(", ") || "—"}</p>
          {files.filter((a) => isVideo(a.url)).map((a, i) => <p key={`${a.url}-${i}`} className="break-all">Video: {a.name} · <a href={a.url}>{a.url}</a></p>)}
        </div>
      )}
    </div>,
    document.body,
  );
}

const Req = () => <span className="text-[#DC2626]" aria-hidden="true"> *</span>;

function InspectionModal({ item, onClose, onDone, onError }: { item?: Inspection; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [f, setF] = useState({
    inspectedOn: item ? civil(item.inspectedOn) : todayBogota(), productRef: item?.productRef ?? "", lotNumber: item?.lotNumber ?? "",
    lotQty: item ? String(item.lotQty) : "", sampleSize: item ? String(item.sampleSize) : "", sampleRange: item?.sampleRange ?? "",
    nonConforming: item ? String(item.nonConforming) : "0", action: item?.action ?? "",
  });
  const [checks, setChecks] = useState<Record<string, Check>>(item?.checks ?? {});
  const [lotConforming, setLotConforming] = useState<boolean | null>(item?.lotConforming ?? null);
  const [attachments, setAttachments] = useState<Attachment[]>(item?.attachments ?? []);
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const lot = Number(f.lotQty), sample = Number(f.sampleSize), nc = Number(f.nonConforming);
  const qtyError = sample > lot && lot > 0 ? "La muestra no puede superar las piezas del lote." : nc > sample && sample > 0 ? "Los no conformes no pueden superar la muestra." : "";
  const invalid = !f.inspectedOn || !f.productRef.trim() || !f.lotNumber.trim() || !f.sampleRange.trim()
    || !(lot > 0) || !(sample > 0) || !(nc >= 0) || ![lot, sample, nc].every(Number.isInteger) || !!qtyError
    || CHECKS.some(([k]) => !checks[k]) || lotConforming === null || (lotConforming === false && !f.action.trim());

  const submit = async () => {
    setSubmitting(true);
    const body = { ...f, lotQty: lot, sampleSize: sample, nonConforming: nc, checks, lotConforming, attachments };
    const res = item ? await patchReq(`/api/panel/control-calidad/${item.id}`, body) : await post("/api/panel/control-calidad", body);
    setSubmitting(false);
    if (res.ok) onDone(item ? "Inspección actualizada" : "Inspección registrada — pendiente de firma"); else onError(res.error!);
  };

  return (
    <Modal wide title={item ? `Inspección — lote ${item.lotNumber}` : "Nueva inspección de producto terminado"} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={invalid} />}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div><label className={labelCls}>Fecha<Req /></label><input type="date" value={f.inspectedOn} onChange={set("inspectedOn")} className={inputCls} /></div>
        <div className="sm:col-span-2"><label className={labelCls}>Referencia o nombre del producto<Req /></label><input value={f.productRef} onChange={set("productRef")} className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div><label className={labelCls}>No. de lote<Req /></label><input value={f.lotNumber} onChange={set("lotNumber")} className={inputCls} /></div>
        <div><label className={labelCls}>No. de piezas del lote<Req /></label><input type="number" min={1} value={f.lotQty} onChange={set("lotQty")} className={inputCls} /></div>
        <div><label className={labelCls}>Tamaño de la muestra<Req /></label><input type="number" min={1} value={f.sampleSize} onChange={set("sampleSize")} className={inputCls} /></div>
        <div><label className={labelCls}>Consecutivo de la muestra<Req /></label><input value={f.sampleRange} onChange={set("sampleRange")} placeholder="Ej. 150-156" className={inputCls} /></div>
      </div>

      <div>
        <p className={labelCls}>Criterios (C = conforme · N = no conforme · N/A = no aplica)<Req /></p>
        <div className="divide-y divide-[#F1F5F9] rounded-xl border border-[#E2E8F0]">
          {CHECKS.map(([k, , full]) => (
            <div key={k} role="radiogroup" aria-label={full} className="flex items-center justify-between gap-2 px-3 py-2">
              <span className="text-sm text-[#1A1A1A]">{full}</span>
              <div className="flex shrink-0 gap-1">
                {CHECK_OPTS.map((o) => (
                  <button
                    key={o.v} type="button" role="radio" aria-checked={checks[k] === o.v}
                    onClick={() => setChecks({ ...checks, [k]: o.v })}
                    className={`min-w-10 rounded-lg border px-2 py-1 text-xs font-black ${checks[k] === o.v ? o.on : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}
                  >{o.label}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Total de no conformes<Req /></label><input type="number" min={0} value={f.nonConforming} onChange={set("nonConforming")} className={inputCls} /></div>
        <div>
          <p className={labelCls}>Conformidad del lote<Req /></p>
          <div role="radiogroup" aria-label="Conformidad del lote" className="flex gap-1">
            {([true, false] as const).map((v) => (
              <button
                key={String(v)} type="button" role="radio" aria-checked={lotConforming === v} onClick={() => setLotConforming(v)}
                className={`flex-1 rounded-xl border py-2 text-sm font-black ${lotConforming === v ? (v ? "border-[#16A34A] bg-[#16A34A] text-white" : "border-[#DC2626] bg-[#DC2626] text-white") : "border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}
              >{v ? "Sí" : "No"}</button>
            ))}
          </div>
        </div>
      </div>
      {qtyError && <p className="text-xs font-bold text-[#B91C1C]">{qtyError}</p>}
      <div>
        <label className={labelCls}>Acción sobre el producto no conforme{lotConforming === false && <Req />}</label>
        <textarea rows={2} value={f.action} onChange={set("action")} className={inputCls} />
      </div>
      <div><label className={labelCls}>Fotos o archivos</label><AttachmentsField value={attachments} onChange={setAttachments} onError={onError} /></div>
    </Modal>
  );
}

/** Video: va directo a Storage (Vercel corta cuerpos de más de 4,5 MB) y el servidor lo revisa al final. */
async function uploadVideo(file: File): Promise<Attachment | { error: string }> {
  if (file.size > VIDEO_MAX) return { error: `${file.name} supera 50 MB. Grábalo más corto o en 720p.` };
  const call = async (data: object) => {
    const res = await fetch("/api/panel/control-calidad/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    const json = await res.json().catch(() => ({}));
    return res.ok ? json : { error: json.error ?? `No fue posible subir ${file.name}` };
  };
  const start = await call({ action: "start", mimeType: file.type, size: file.size });
  if (start.error) return start;
  const put = await fetch(start.signedUrl, { method: "PUT", headers: { "Content-Type": file.type, "x-upsert": "false" }, body: file }).catch(() => null);
  if (!put?.ok) return { error: `No fue posible subir ${file.name}. Revisa la conexión.` };
  return call({ action: "finish", path: start.path, name: file.name });
}

function AttachmentsField({ value, onChange, onError }: { value: Attachment[]; onChange: (v: Attachment[]) => void; onError: (m: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next = [...value];
      for (const file of Array.from(files)) {
        if (file.type.startsWith("video/")) {
          const v = await uploadVideo(file);
          if ("error" in v) onError(v.error); else next.push(v);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/panel/control-calidad/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) { onError(json.error ?? `No fue posible subir ${file.name}`); continue; }
        next.push({ url: json.url, name: json.name, isImage: json.isImage });
      }
      onChange(next);
    } finally { setUploading(false); }
  };
  return (
    <div className="space-y-2">
      <label className={`${btnGhost} cursor-pointer`}>
        <MdAttachFile size={16} />{uploading ? "Subiendo…" : "Agregar fotos, videos o archivos"}
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt" className="hidden" disabled={uploading} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
      </label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((a, i) => (
            <span key={`${a.url}-${i}`} className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1">
              <a href={a.url} target="_blank" rel="noopener noreferrer" title={a.name} className="flex items-center gap-1">
                {a.isImage
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={a.url} alt={a.name} className="h-12 w-12 rounded object-cover" />
                  : isVideo(a.url)
                    ? <video src={a.url} muted playsInline preload="metadata" className="h-12 w-20 rounded bg-black object-cover" aria-label={a.name} />
                    : <><MdAttachFile size={16} className="text-[#64748B]" /><span className="max-w-[140px] truncate text-xs text-[#1A1A1A]">{a.name}</span></>}
              </a>
              <button type="button" className="rounded px-1 text-xs font-bold text-[#DC2626] hover:bg-[#FEE2E2]" onClick={() => onChange(value.filter((_, k) => k !== i))} aria-label="Quitar adjunto">×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SignModal({ item, onClose, onDone, onError }: { item: Inspection; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await patchReq(`/api/panel/control-calidad/${item.id}`, { action: "sign", signatureData: signature, updatedAt: item.updatedAt });
    setSubmitting(false);
    if (res.ok) onDone(`Lote ${item.lotNumber} liberado`); else onError(res.error!);
  };
  return (
    <Modal title={`Firma de liberación — lote ${item.lotNumber}`} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!signature} />}>
      <p className="text-sm text-[#1A1A1A]"><b>{item.productRef}</b> · {item.lotQty} piezas · muestra {item.sampleSize} · {item.nonConforming} no conformes · lote {item.lotConforming ? "conforme" : "NO conforme"}</p>
      <p className="text-xs text-[#64748B]">Registrado por {item.createdBy.fullName} el {fmtDate(item.inspectedOn)}. Una vez firmado no se puede editar ni eliminar.</p>
      <div><label className={labelCls}>Firma<Req /></label><SignaturePad onChange={setSignature} /></div>
      {!signature && <p className="text-xs text-[#94A3B8]">Dibuja la firma para habilitar el botón.</p>}
    </Modal>
  );
}
