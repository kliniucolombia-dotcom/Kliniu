"use client";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { MdAdd, MdDelete, MdDraw, MdEdit, MdPrint, MdVerified } from "react-icons/md";
import { useConfirm } from "@/app/components/confirm-dialog";
import {
  Badge, Empty, Footer, Kpi, Modal, btnGhost, btnPrimary, fmtDate, fmtDateTime, inputCls, labelCls,
  patchReq, post, todayBogota, type Permission,
} from "../_components/ops-ui";
import { SignaturePad } from "../mantenimiento/signature-pad";

type Check = "C" | "N" | "NA";
type Inspection = {
  id: string; inspectedOn: string; productRef: string; lotNumber: string; lotQty: number; sampleSize: number;
  sampleRange: string; checks: Record<string, Check>; nonConforming: number; lotConforming: boolean; action: string | null;
  createdBy: { fullName: string }; signatureData: string | null; signedAt: string | null; signedBy: { fullName: string } | null;
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
          <button className={btnGhost} onClick={() => window.print()} disabled={inRange.length === 0}><MdPrint size={16} />Imprimir / PDF</button>
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
          <table className="w-full min-w-[1400px]">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left">
              <tr>
                <th className={th}>Fecha</th><th className={th}>Referencia / producto</th><th className={th}>No. lote</th>
                <th className={th}>Piezas lote</th><th className={th}>Muestra</th><th className={th}>Consecutivo</th>
                {CHECKS.map(([k, short, full]) => <th key={k} className={`${th} text-center`} title={full}>{short}</th>)}
                <th className={th}>No conformes</th><th className={th}>Lote conforme</th><th className={th}>Acción no conforme</th>
                <th className={th}>Firma de liberación</th><th className={th} aria-label="Acciones" />
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
                    {!r.signedAt && (
                      <div className="flex gap-0.5">
                        {perm.canEdit && <button aria-label="Editar inspección" className="rounded p-1 text-[#64748B] hover:bg-[#F1F5F9]" onClick={() => setModal({ kind: "form", item: r })}><MdEdit size={15} /></button>}
                        {perm.canDelete && <button aria-label="Eliminar inspección" className="rounded p-1 text-[#DC2626] hover:bg-[#FEE2E2]" onClick={() => remove(r)}><MdDelete size={15} /></button>}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </div>

      <PrintSheet rows={inRange} from={from} to={to} />

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
  const [submitting, setSubmitting] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const lot = Number(f.lotQty), sample = Number(f.sampleSize), nc = Number(f.nonConforming);
  const qtyError = sample > lot && lot > 0 ? "La muestra no puede superar las piezas del lote." : nc > sample && sample > 0 ? "Los no conformes no pueden superar la muestra." : "";
  const invalid = !f.inspectedOn || !f.productRef.trim() || !f.lotNumber.trim() || !f.sampleRange.trim()
    || !(lot > 0) || !(sample > 0) || !(nc >= 0) || ![lot, sample, nc].every(Number.isInteger) || !!qtyError
    || CHECKS.some(([k]) => !checks[k]) || lotConforming === null || (lotConforming === false && !f.action.trim());

  const submit = async () => {
    setSubmitting(true);
    const body = { ...f, lotQty: lot, sampleSize: sample, nonConforming: nc, checks, lotConforming };
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
    </Modal>
  );
}

function SignModal({ item, onClose, onDone, onError }: { item: Inspection; onClose: () => void; onDone: (m: string) => void; onError: (m: string) => void }) {
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await patchReq(`/api/panel/control-calidad/${item.id}`, { action: "sign", signatureData: signature });
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
