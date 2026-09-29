"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdAdd, MdDelete, MdEdit, MdSave } from "react-icons/md";
import { useConfirm } from "@/app/components/confirm-dialog";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { blockEfficiencies, blockKey, standardMinutesOf, summarize } from "@/lib/production-control-calculator";
import { fmtDateOnly, fmtTimeOnly } from "@/lib/date";
import { Empty, Footer, Modal, Section, Stat, btnGhost, btnPrimary, patchReq, post } from "../../_components/ops-ui";
import { EfficiencyChip, SECTION_LABEL, fmtMin, jsonError, type Entry, type Notify, type Options } from "./shared";
import {
  EntryFields, canModifyEntry, emptyEntryForm, entryFormFromEntry, entryPayload, isEntryFormValid, type EntryFormState,
} from "./entry-form";

export function RegisterTab({ options, notify, onChanged }: { options: Options; notify: Notify; onChanged: () => void }) {
  const confirm = useConfirm();
  const [form, setForm] = useState<EntryFormState>(() => emptyEntryForm(options));
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<{ entry: Entry; form: EntryFormState } | null>(null);

  const lastRequest = useRef(0);
  const load = useCallback(async () => {
    const request = ++lastRequest.current;
    try {
      const q = new URLSearchParams({ from: form.date, to: form.date, operatorId: form.operatorId });
      const r = await fetch(`/api/panel/ensamble/entries?${q}`);
      const data = r.ok ? await r.json() : null;
      const error = r.ok ? null : await jsonError(r, "No fue posible cargar los registros del día");
      if (request !== lastRequest.current) return;
      if (!data) { notify("err", error!); setEntries([]); return; }
      const list: Entry[] = data.entries;
      setEntries(list);
      // Propone como inicio el fin del último bloque del día (si aún no se escribió uno).
      const lastEnd = list.map((e) => e.endTime.slice(11, 16)).sort().at(-1);
      if (lastEnd) setForm((f) => (f.start ? f : { ...f, start: lastEnd }));
    } catch {
      if (request === lastRequest.current) { notify("err", "Error de conexión"); setEntries([]); }
    }
  }, [form.date, form.operatorId, notify]);

  const { markLocalWrite } = useRealtimeRefresh(["production-control"], load);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const blocks = useMemo(() => {
    const list = entries ?? [];
    const effs = blockEfficiencies(list);
    const groups = new Map<string, Entry[]>();
    for (const e of list) groups.set(blockKey(e), [...(groups.get(blockKey(e)) ?? []), e]);
    return [...groups].map(([key, items]) => ({ key, items, summary: effs.get(key)! }))
      .sort((a, b) => a.items[0].startTime.localeCompare(b.items[0].startTime));
  }, [entries]);
  const day = useMemo(() => summarize(entries ?? []), [entries]);

  const save = async (sameBlock: boolean) => {
    setSaving(true);
    markLocalWrite();
    const res = await post("/api/panel/ensamble/entries", entryPayload(form))
      .catch(() => ({ ok: false, error: "Error de conexión" }))
      .finally(() => setSaving(false));
    if (!res.ok) return notify("err", res.error ?? "No fue posible guardar el registro");
    notify("ok", "Registro guardado");
    // Otra operación en el mismo bloque conserva las horas; si no, el siguiente bloque arranca donde terminó este.
    setForm((f) => ({
      ...f, operationId: "", quantity: "", sharedBy: 1, observations: "",
      ...(sameBlock ? {} : { start: f.end, end: "" }),
    }));
    load();
    onChanged();
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
    if (!(await confirm({ title: "Eliminar registro", message: `¿Eliminar ${e.operation.code} de ${fmtTimeOnly(e.startTime)} a ${fmtTimeOnly(e.endTime)}?` }))) return;
    markLocalWrite();
    const r = await fetch(`/api/panel/ensamble/entries/${e.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return notify("err", r ? await jsonError(r, "No fue posible eliminar el registro") : "Error de conexión");
    notify("ok", "Registro eliminado");
    load();
  };

  const valid = isEntryFormValid(form, options);
  const operatorName = form.operatorId === options.me.id
    ? options.me.fullName
    : options.operators.find((o) => o.id === form.operatorId)?.fullName ?? "";

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-4 sm:p-5">
        <h2 className="mb-4 text-base font-black text-[#1A1A1A]">Registrar bloque</h2>
        <EntryFields options={options} value={form} onChange={setForm} peers={entries ?? []} />
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button className={`${btnPrimary} flex-1 justify-center py-2.5`} disabled={!valid || saving} onClick={() => save(false)}>
            <MdSave size={16} />{saving ? "Guardando…" : "Guardar"}
          </button>
          <button className={`${btnGhost} flex-1 justify-center py-2.5`} disabled={!valid || saving} onClick={() => save(true)}>
            <MdAdd size={16} />Guardar y otra operación en este bloque
          </button>
        </div>
      </div>

      <Section title={`${operatorName} · ${fmtDateOnly(`${form.date}T12:00:00Z`, { weekday: "long", day: "numeric", month: "long" })}`}>
        {entries && entries.length > 0 && (
          <div className="mb-4 grid grid-cols-3 gap-2">
            <Stat label="Registrado" value={`${fmtMin(day.registeredMinutes)} min`} />
            <Stat label="Estándar ganado" value={`${fmtMin(day.standardMinutes)} min`} />
            <Stat label="Eficiencia del día" value={day.efficiency === null ? "—" : `${Math.round(day.efficiency * 100)} %`} />
          </div>
        )}
        {entries === null ? <p className="text-sm text-[#94A3B8]">Cargando…</p> : blocks.length === 0 ? (
          <Empty text="Sin registros este día." />
        ) : (
          <div className="space-y-3">
            {blocks.map((b) => (
              <div key={b.key} className="rounded-2xl border border-[#E2E8F0] bg-white p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-[#1A1A1A]">
                    {fmtTimeOnly(b.items[0].startTime)}–{fmtTimeOnly(b.items[0].endTime)}
                    <span className="ml-2 text-xs font-semibold text-[#94A3B8]">{fmtMin(b.summary.registeredMinutes)} min · {SECTION_LABEL[b.items[0].section]}</span>
                  </p>
                  <EfficiencyChip value={b.summary.efficiency} />
                </div>
                <div className="divide-y divide-[#F1F5F9]">
                  {b.items.map((e) => (
                    <div key={e.id} className="flex items-start justify-between gap-2 py-2 text-sm">
                      <div className="min-w-0">
                        <p className="font-bold text-[#1A1A1A]">{e.operation.code} <span className="font-normal">{e.operation.name}</span></p>
                        <p className="text-xs text-[#64748B]">
                          {e.workOrder ? `ODT #${e.workOrder.number} · ${e.workOrder.reference}` : "Sin ODT"}
                          {" · "}{e.quantity} und{e.sharedBy > 1 ? ` ÷ ${e.sharedBy} personas` : ""}
                          {e.standardSeconds > 0 && ` · ${fmtMin(standardMinutesOf(e))} min estándar`}
                        </p>
                        {e.observations && <p className="text-xs text-[#94A3B8]">{e.observations}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {canModifyEntry(e, options, "edit") && (
                          <button onClick={() => setEditing({ entry: e, form: entryFormFromEntry(e) })} aria-label="Editar registro"
                            className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]"><MdEdit size={16} /></button>
                        )}
                        {canModifyEntry(e, options, "delete") && (
                          <button onClick={() => remove(e)} aria-label="Eliminar registro"
                            className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]"><MdDelete size={16} /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {editing && (
        <Modal title="Editar registro" onClose={() => setEditing(null)} wide
          footer={<Footer onClose={() => setEditing(null)} onSubmit={saveEdit} disabled={!isEntryFormValid(editing.form, options, editing.entry)} submitting={saving} />}>
          <EntryFields options={options} value={editing.form} onChange={(f) => setEditing({ ...editing, form: f })}
            peers={entries ?? []} editing={editing.entry} />
        </Modal>
      )}
    </div>
  );
}
