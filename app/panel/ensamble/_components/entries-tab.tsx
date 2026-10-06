"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdDelete, MdEdit, MdPictureAsPdf, MdSearch, MdTimer, MdTrendingUp, MdViewList } from "react-icons/md";
import { useConfirm } from "@/app/components/confirm-dialog";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { blockEfficiencies, blockKey, standardMinutesOf, summarize } from "@/lib/production-control-calculator";
import { addDays, weekday } from "@/lib/commercial-calendar";
import { fmtDateOnly, fmtTimeOnly } from "@/lib/date";
import { SimpleSelect } from "../../_components/simple-select";
import { DateRange, Footer, Kpi, Modal, Section, Table, inputCls, labelCls, patchReq } from "../../_components/ops-ui";
import { SkeletonTable } from "../../../components/skeleton";
import { EfficiencyChip, EntrySpanHint, SECTION_LABEL, defaultRangeEnd, defaultRangeStart, fmtMin, fmtStdMinutes, jsonError, normalize, type Entry, type Notify, type Options } from "./shared";
import { EnsambleReport } from "./report";
import { EntryFields, canModifyEntry, entryFormFromEntry, entryPayload, isEntryFormValid, type EntryFormState } from "./entry-form";

export function EntriesTab({ options, notify }: { options: Options; notify: Notify }) {
  const confirm = useConfirm();
  const own = options.scope === "own";
  const [from, setFrom] = useState(defaultRangeStart(options, 6));
  const [to, setTo] = useState(defaultRangeEnd(options));
  const [operatorId, setOperatorId] = useState("all");
  const [section, setSection] = useState("all");
  const [q, setQ] = useState("");
  const [data, setData] = useState<{ entries: Entry[]; truncated: boolean } | null>(null);
  const [editing, setEditing] = useState<{ entry: Entry; form: EntryFormState } | null>(null);
  const [saving, setSaving] = useState(false);

  const lastRequest = useRef(0);
  const load = useCallback(async () => {
    const request = ++lastRequest.current;
    try {
      const params = new URLSearchParams({ from, to });
      if (operatorId !== "all") params.set("operatorId", operatorId);
      if (section !== "all") params.set("section", section);
      const r = await fetch(`/api/panel/ensamble/entries?${params}`);
      const body = r.ok ? await r.json() : null;
      const error = r.ok ? null : await jsonError(r, "No fue posible cargar los registros");
      if (request !== lastRequest.current) return;
      if (body) setData(body); else { notify("err", error!); setData({ entries: [], truncated: false }); }
    } catch {
      if (request === lastRequest.current) { notify("err", "Error de conexión"); setData({ entries: [], truncated: false }); }
    }
  }, [from, to, operatorId, section, notify]);

  const { markLocalWrite } = useRealtimeRefresh(["production-control"], load);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const visible = useMemo(() => {
    const words = normalize(q).split(/\s+/).filter(Boolean);
    return (data?.entries ?? []).filter((e) => {
      const text = normalize(`${e.operator.fullName} ${e.operation.code} ${e.operation.name} ${e.workOrder?.number ?? ""} ${e.workOrder?.reference ?? ""} ${e.workOrder?.productName ?? ""} ${e.observations ?? ""}`);
      return words.every((w) => text.includes(w));
    });
  }, [data, q]);
  // Los bloques se calculan con todo lo del operario/día, no solo lo filtrado por texto.
  const blocks = useMemo(() => blockEfficiencies(data?.entries ?? []), [data]);
  const totals = useMemo(() => summarize(visible), [visible]);
  const setWeek = (offset: number) => {
    const monday = addDays(options.today, -((weekday(options.today) + 6) % 7) + offset * 7);
    setFrom(monday);
    setTo(addDays(monday, 6));
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    markLocalWrite();
    const res = await patchReq(`/api/panel/ensamble/entries/${editing.entry.id}`, entryPayload(editing.form))
      .catch(() => ({ ok: false, error: "Error de conexión" }))
      .finally(() => setSaving(false));
    if (!res.ok) return notify("err", res.error ?? "No fue posible actualizar el registro");
    notify("ok", "Registro actualizado");
    setEditing(null);
    load();
  };

  const remove = async (e: Entry) => {
    if (!(await confirm({ title: "Eliminar registro", message: `¿Eliminar ${e.operation.code} de ${e.operator.fullName} (${fmtTimeOnly(e.startTime)}–${fmtTimeOnly(e.endTime)})?` }))) return;
    markLocalWrite();
    const r = await fetch(`/api/panel/ensamble/entries/${e.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return notify("err", r ? await jsonError(r, "No fue posible eliminar el registro") : "Error de conexión");
    notify("ok", "Registro eliminado");
    load();
  };

  const peersOf = (e: Entry) => (data?.entries ?? []).filter((x) => x.operatorId === e.operatorId && x.workDate === e.workDate);
  const showActions = options.permission.canCreate || options.permission.canEdit || options.permission.canDelete;

  return (
    <Section title={own ? "Mis registros" : "Registros por operario"}>
      <div className="mb-2 flex flex-wrap items-end gap-2">
        <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} min={options.firstEntryDate ?? undefined} max={options.today} />
        {!own && (
          <div className="w-52">
            <label className={labelCls}>Operario</label>
            <SimpleSelect value={operatorId} searchable portal
              options={[{ value: "all", label: "Todos" }, ...options.operators.map((o) => ({ value: o.id, label: o.fullName }))]}
              onChange={setOperatorId} />
          </div>
        )}
        <div className="w-36">
          <label className={labelCls}>Sección</label>
          <SimpleSelect value={section} portal
            options={[{ value: "all", label: "Todas" }, { value: "ENSAMBLE", label: "Ensamble" }, { value: "EMPAQUE", label: "Empaque" }]}
            onChange={setSection} />
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={() => setWeek(0)} className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-bold text-[#475569] hover:bg-[#F1F5F9]">Esta semana</button>
          <button type="button" onClick={() => setWeek(-1)} className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-bold text-[#475569] hover:bg-[#F1F5F9]">Semana pasada</button>
        </div>
        <div className="min-w-[200px] flex-1">
          <label className={labelCls}>Buscar</label>
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ODT, referencia, operación u operario" className={`${inputCls} pl-9`} />
          </div>
        </div>
        {/* El reporte PDF es solo para quien gestiona o supervisa, no para el operario. */}
        {!own && (
          <button type="button" onClick={() => window.print()} disabled={visible.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white hover:bg-[#0E7C82] disabled:cursor-not-allowed disabled:opacity-40">
            <MdPictureAsPdf size={16} /> Descargar PDF
          </button>
        )}
      </div>

      <EntrySpanHint options={options} />

      {data && (
        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<MdViewList size={18} />} label="Registros" value={String(visible.length)} color="#27B1B8" />
          <Kpi icon={<MdTimer size={18} />} label="Minutos registrados" value={fmtMin(totals.registeredMinutes)} color="#0E7C82" />
          <Kpi icon={<MdTimer size={18} />} label="Minutos estándar ganados" value={fmtMin(totals.standardMinutes)} color="#6D28D9" />
          <Kpi icon={<MdTrendingUp size={18} />} label="Eficiencia ponderada" value={totals.efficiency === null ? "—" : `${Math.round(totals.efficiency * 100)} %`} color="#15803D" />
        </div>
      )}
      {data?.truncated && <p className="mb-3 rounded-xl bg-[#FEF3C7] px-3 py-2 text-xs font-semibold text-[#B45309]">El rango trae demasiados registros: se muestran los primeros 5.000. Acota las fechas.</p>}

      {!data ? <SkeletonTable /> : (
        <Table
          head={["Fecha", own ? null : "Operario", "Sección", "Horario", "ODT", "Operación", "To (min/und)", "Cant.", "Pers.", "Estándar", "Bloque", showActions ? "" : null]}
          rows={visible.map((e) => {
            const block = blocks.get(blockKey(e));
            return [
              fmtDateOnly(e.workDate, { day: "2-digit", month: "short" }),
              own ? null : e.operator.fullName,
              SECTION_LABEL[e.section],
              <span key="h" className="whitespace-nowrap">{fmtTimeOnly(e.startTime)}–{fmtTimeOnly(e.endTime)}</span>,
              e.workOrder
                ? <span key="o"><b>#{e.workOrder.number}</b><span className="block max-w-[200px] truncate text-[11px] text-[#94A3B8]">{e.workOrder.reference} · {e.workOrder.productName}</span></span>
                : <span key="o" className="text-[#94A3B8]">—</span>,
              <span key="op"><b>{e.operation.code}</b><span className="block max-w-[220px] truncate text-[11px] text-[#64748B]">{e.operation.name}</span>{e.observations && <span className="block text-[11px] text-[#94A3B8]">{e.observations}</span>}</span>,
              e.standardSeconds > 0 ? fmtStdMinutes(e.standardSeconds) : "Indirecta",
              String(e.quantity),
              String(e.sharedBy),
              e.standardSeconds > 0 ? `${fmtMin(standardMinutesOf(e))} min` : "—",
              <span key="b" className="flex flex-col items-start gap-1"><span className="text-[11px] text-[#64748B]">{fmtMin(block?.registeredMinutes ?? 0)} min</span><EfficiencyChip value={block?.efficiency ?? null} /></span>,
              showActions ? (
                <div key="a" className="flex justify-end gap-1">
                  {canModifyEntry(e, options, "edit") && (
                    <button onClick={() => setEditing({ entry: e, form: entryFormFromEntry(e) })} aria-label="Editar registro"
                      className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]"><MdEdit size={16} /></button>
                  )}
                  {canModifyEntry(e, options, "delete") && (
                    <button onClick={() => remove(e)} aria-label="Eliminar registro"
                      className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]"><MdDelete size={16} /></button>
                  )}
                </div>
              ) : null,
            ];
          })}
          empty="Sin registros en este rango."
        />
      )}

      {!own && (
        <EnsambleReport entries={visible} blocks={blocks} from={from} to={to} truncated={!!data?.truncated} search={q.trim()}
          operator={own ? options.me.fullName : operatorId === "all" ? "Todos" : options.operators.find((o) => o.id === operatorId)?.fullName ?? "—"}
          section={section === "all" ? "Todas" : SECTION_LABEL[section as keyof typeof SECTION_LABEL]} />
      )}

      {editing && (
        <Modal title="Editar registro" onClose={() => setEditing(null)} wide
          footer={<Footer onClose={() => setEditing(null)} onSubmit={saveEdit} disabled={!isEntryFormValid(editing.form, options, editing.entry)} submitting={saving} />}>
          <EntryFields options={options} value={editing.form} onChange={(f) => setEditing({ ...editing, form: f })}
            peers={peersOf(editing.entry)} editing={editing.entry} />
        </Modal>
      )}
    </Section>
  );
}
