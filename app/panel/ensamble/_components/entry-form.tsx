"use client";
import { MdAdd, MdRemove } from "react-icons/md";
import { blockKey, summarize, withinOwnWindow } from "@/lib/production-control-calculator";
import { addDays } from "@/lib/commercial-calendar";
import { SimpleSelect } from "../../_components/simple-select";
import { inputCls, labelCls } from "../../_components/ops-ui";
import { EfficiencyChip, SECTION_LABEL, fmtMin, fmtStdMinutes, type Entry, type Options, type Section } from "./shared";

export type EntryFormState = {
  operatorId: string; date: string; section: Section; start: string; end: string;
  workOrderId: string; operationId: string; quantity: string; sharedBy: number; observations: string;
};

export function emptyEntryForm(options: Options): EntryFormState {
  return {
    operatorId: options.me.id, date: options.today, section: options.lastSection ?? "ENSAMBLE", start: "", end: "",
    workOrderId: "", operationId: "", quantity: "", sharedBy: 1, observations: "",
  };
}

export function entryFormFromEntry(e: Entry): EntryFormState {
  return {
    operatorId: e.operatorId, date: e.workDate.slice(0, 10), section: e.section,
    start: e.startTime.slice(11, 16), end: e.endTime.slice(11, 16), workOrderId: e.workOrderId ?? "",
    operationId: e.operationId, quantity: String(e.quantity), sharedBy: e.sharedBy, observations: e.observations ?? "",
  };
}

export function entryPayload(f: EntryFormState) {
  return {
    operatorId: f.operatorId, date: f.date, start: f.start, end: f.end, section: f.section,
    workOrderId: f.workOrderId || null, operationId: f.operationId, quantity: f.quantity.trim() === "" ? 0 : Number(f.quantity),
    sharedBy: f.sharedBy, observations: f.observations,
  };
}

/** Estándar (seg/und) que aplicará: el snapshot si se edita sin cambiar de operación, si no el del catálogo. */
function standardFor(f: EntryFormState, options: Options, editing?: Entry | null) {
  if (editing && editing.operationId === f.operationId) return editing.standardSeconds;
  return options.operations.find((o) => o.id === f.operationId)?.standardSeconds ?? null;
}

export function isEntryFormValid(f: EntryFormState, options: Options, editing?: Entry | null) {
  const std = standardFor(f, options, editing);
  if (!f.operatorId || !f.date || !f.start || !f.end || f.end <= f.start || std === null) return false;
  if (f.date > options.today) return false;
  return std === 0 || (Boolean(f.workOrderId) && Number(f.quantity) > 0);
}

/** Puede editar/borrar este registro según el alcance (mismo criterio que el servidor). */
export function canModifyEntry(e: Entry, options: Options, action: "edit" | "delete") {
  const p = options.permission;
  if (action === "edit" ? p.canEdit : p.canDelete) return true;
  const own = e.operatorId === options.me.id && p.canCreate;
  if (own && p.canEdit) return true;
  return own && withinOwnWindow(e.workDate.slice(0, 10), options.today) && e.workOrder?.status !== "CLOSED";
}

export function EntryFields({
  options, value, onChange, peers, editing,
}: {
  options: Options;
  value: EntryFormState;
  onChange: (v: EntryFormState) => void;
  /** Registros del mismo operario y día, para previsualizar el bloque. */
  peers: Entry[];
  editing?: Entry | null;
}) {
  const set = (patch: Partial<EntryFormState>) => onChange({ ...value, ...patch });
  const manage = options.permission.canEdit;
  const std = standardFor(value, options, editing);
  const indirect = std === 0;

  const people = [options.me, ...options.operators.filter((o) => o.id !== options.me.id)];
  const recent = new Map(options.recentOperationIds.map((id, i) => [id, i]));
  const operations = [...options.operations].sort((a, b) => (recent.get(a.id) ?? 999) - (recent.get(b.id) ?? 999));
  if (editing && !operations.some((o) => o.id === editing.operationId)) {
    operations.unshift({ ...editing.operation, standardSeconds: editing.standardSeconds });
  }
  const orders = [...options.openOrders];
  if (editing?.workOrder && !orders.some((o) => o.id === editing.workOrder!.id)) {
    orders.unshift({ ...editing.workOrder, client: "" });
  }

  // Vista previa del bloque: lo ya guardado con el mismo inicio–fin más lo que se está escribiendo.
  const current = std !== null && value.start && value.end && value.end > value.start
    ? {
        operatorId: value.operatorId, startTime: `${value.date}T${value.start}:00.000Z`, endTime: `${value.date}T${value.end}:00.000Z`,
        standardSeconds: std, quantity: Number(value.quantity) || 0, sharedBy: value.sharedBy,
      }
    : null;
  const block = current
    ? [...peers.filter((p) => p.id !== editing?.id && blockKey(p) === blockKey(current)), current]
    : [];
  const preview = block.length ? summarize(block) : null;

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Operario</label>
          {manage ? (
            <SimpleSelect value={value.operatorId} searchable portal
              options={people.map((p) => ({ value: p.id, label: p.fullName }))}
              onChange={(operatorId) => set({ operatorId })} />
          ) : (
            <p className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm font-bold text-[#1A1A1A]">{options.me.fullName}</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Fecha</label>
          <input type="date" value={value.date} max={options.today}
            min={manage ? undefined : addDays(options.today, -options.ownWindowDays)}
            onChange={(e) => set({ date: e.target.value })} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Sección</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.keys(SECTION_LABEL) as Section[]).map((s) => (
            <button key={s} type="button" onClick={() => set({ section: s })} aria-pressed={value.section === s}
              className={`rounded-xl border py-2.5 text-sm font-bold ${value.section === s ? "border-[#27B1B8] bg-[#E6F7F8] text-[#0E7C82]" : "border-[#E2E8F0] text-[#64748B]"}`}>
              {SECTION_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Hora inicio</label>
          <input type="time" value={value.start} onChange={(e) => set({ start: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Hora fin</label>
          <input type="time" value={value.end} min={value.start || undefined} onChange={(e) => set({ end: e.target.value })} className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Operación</label>
        <SimpleSelect value={value.operationId} searchable portal placeholder="Buscar por código u operación"
          options={operations.map((o) => ({
            value: o.id,
            search: `${o.code} ${o.name} ${o.family}`,
            label: (
              <span>
                <b>{o.code}</b> {o.name}
                <span className="block text-[11px] font-normal text-[#94A3B8]">{o.family} · {o.standardSeconds > 0 ? fmtStdMinutes(o.standardSeconds) : "Indirecta"}</span>
              </span>
            ),
          }))}
          onChange={(operationId) => {
            const op = options.operations.find((o) => o.id === operationId);
            set({ operationId, ...(op?.standardSeconds === 0 ? { quantity: "0" } : {}) });
          }} />
        {options.operations.length === 0 && <p className="mt-1 text-xs text-[#B45309]">Aún no hay operaciones en Tiempos estándar.</p>}
      </div>

      <div>
        <label className={labelCls}>ODT {indirect && <span className="font-normal">(opcional en indirectas)</span>}</label>
        <SimpleSelect value={value.workOrderId} searchable portal placeholder="Buscar ODT por número, referencia o producto"
          options={[
            ...(indirect ? [{ value: "", label: "Sin ODT", search: "sin odt" }] : []),
            ...orders.map((o) => ({
              value: o.id,
              search: `${o.number} ${o.reference} ${o.productName} ${o.client}`,
              label: (
                <span>
                  <b>#{o.number}</b> · {o.reference}
                  <span className="block text-[11px] font-normal text-[#94A3B8]">{o.productName}</span>
                </span>
              ),
            })),
          ]}
          onChange={(workOrderId) => set({ workOrderId })} />
        {options.openOrders.length === 0 && <p className="mt-1 text-xs text-[#B45309]">No hay ODTs abiertas.</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Cantidad</label>
          <input type="number" inputMode="numeric" min={0} value={value.quantity} disabled={indirect}
            onChange={(e) => set({ quantity: e.target.value })} className={`no-spinner ${inputCls} disabled:bg-[#F8FAFC]`} />
        </div>
        <div>
          <label className={labelCls}>Personas en la tarea</label>
          <div className="flex items-center gap-2">
            <button type="button" aria-label="Menos personas" onClick={() => set({ sharedBy: Math.max(1, value.sharedBy - 1) })}
              className="rounded-xl border border-[#E2E8F0] p-2 text-[#64748B] hover:bg-[#F8FAFC]"><MdRemove size={16} /></button>
            <span className="w-8 text-center text-sm font-black">{value.sharedBy}</span>
            <button type="button" aria-label="Más personas" onClick={() => set({ sharedBy: Math.min(10, value.sharedBy + 1) })}
              className="rounded-xl border border-[#E2E8F0] p-2 text-[#64748B] hover:bg-[#F8FAFC]"><MdAdd size={16} /></button>
          </div>
        </div>
      </div>
      {value.sharedBy > 1 && <p className="-mt-1 text-xs text-[#64748B]">La cantidad se divide entre {value.sharedBy} personas para el indicador.</p>}

      <div>
        <label className={labelCls}>Observaciones</label>
        <input value={value.observations} onChange={(e) => set({ observations: e.target.value })} className={inputCls} />
      </div>

      {preview && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
          <span>Bloque {value.start}–{value.end}{block.length > 1 ? ` · ${block.length} operaciones` : ""}</span>
          <span>Estándar <b className="text-[#1A1A1A]">{fmtMin(preview.standardMinutes)} min</b></span>
          <span>Asistido <b className="text-[#1A1A1A]">{fmtMin(preview.registeredMinutes)} min</b></span>
          <EfficiencyChip value={preview.efficiency} />
        </div>
      )}
    </div>
  );
}
