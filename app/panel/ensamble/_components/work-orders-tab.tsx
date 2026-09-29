"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MdAdd, MdDelete, MdEdit, MdLock, MdLockOpen, MdSearch } from "react-icons/md";
import { useConfirm } from "@/app/components/confirm-dialog";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { fmtDateOnly } from "@/lib/date";
import { SimpleSelect } from "../../_components/simple-select";
import { Badge, Empty, Footer, Modal, Section, Stat, Table, btnGhost, btnPrimary, inputCls, labelCls, patchReq, post, todayBogota } from "../../_components/ops-ui";
import { SkeletonTable } from "../../../components/skeleton";
import { SuggestInput, jsonError, normalize, type Notify, type Options } from "./shared";

type WorkOrder = {
  id: string; number: number; date: string; reference: string; productName: string; client: string;
  lot: number | null; quantity: number; producedQuantity: number | null; status: "OPEN" | "CLOSED";
  notes: string | null; closedAt: string | null; _count: { entries: number };
};
type Detail = { order: Omit<WorkOrder, "_count">; operations: { code: string; name: string; units: number; entries: number }[]; operators: number };
type Form = {
  id?: string; status?: WorkOrder["status"]; number: string; date: string; reference: string; productName: string; client: string;
  lot: string; quantity: string; producedQuantity: string; notes: string;
};

const STATUS: Record<WorkOrder["status"], { label: string; cls: string }> = {
  OPEN: { label: "Abierta", cls: "bg-[#DCFCE7] text-[#15803D]" },
  CLOSED: { label: "Cerrada", cls: "bg-[#F1F5F9] text-[#64748B]" },
};
const STATUS_FILTER = [
  { value: "OPEN", label: "Abiertas" },
  { value: "CLOSED", label: "Cerradas" },
  { value: "ALL", label: "Todas" },
];

const int = (v: string) => (v.trim() === "" ? null : Number(v));
const fmtUnits = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });

export function WorkOrdersTab({ options, notify, onChanged }: { options: Options; notify: Notify; onChanged: () => void }) {
  const confirm = useConfirm();
  const canManage = options.permission.canEdit;
  const [status, setStatus] = useState("OPEN");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<WorkOrder[] | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  // detail: undefined = cargando, null = no se pudo cargar.
  const [closing, setClosing] = useState<{ order: WorkOrder; produced: string; detail: Detail | null | undefined } | null>(null);
  const [failed, setFailed] = useState(false);
  const [serverQ, setServerQ] = useState("");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [saving, setSaving] = useState(false);

  // Cambiar de filtro rápido dispara fetches que pueden llegar desordenados: solo vale el último.
  const lastRequest = useRef(0);
  const load = useCallback(async () => {
    const request = ++lastRequest.current;
    try {
      const r = await fetch(`/api/panel/ensamble/work-orders?status=${status}${serverQ ? `&q=${encodeURIComponent(serverQ)}` : ""}`);
      const data = r.ok ? await r.json() : null;
      const error = r.ok ? null : await jsonError(r, "No fue posible cargar las ODTs");
      if (request !== lastRequest.current) return;
      if (data) { setOrders(data.orders); setFailed(false); } else { notify("err", error!); setFailed(true); }
    } catch {
      if (request === lastRequest.current) { notify("err", "Error de conexión"); setFailed(true); }
    }
  }, [status, serverQ, notify]);

  // El servidor recorta a 500 filas: la primera palabra se filtra allá y el resto en el cliente.
  useEffect(() => {
    const t = window.setTimeout(() => setServerQ(q.trim().split(/\s+/)[0] ?? ""), 300);
    return () => window.clearTimeout(t);
  }, [q]);

  const { markLocalWrite } = useRealtimeRefresh(["production-control"], load);
  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  const visible = useMemo(() => {
    const words = normalize(q).split(/\s+/).filter(Boolean);
    if (!orders || !words.length) return orders ?? [];
    return orders.filter((o) => {
      const text = normalize(`${o.number} ${o.reference} ${o.productName} ${o.client}`);
      return words.every((w) => text.includes(w));
    });
  }, [orders, q]);

  const refresh = () => { load(); onChanged(); };

  const openNew = () => setForm({
    number: options.nextNumber ? String(options.nextNumber) : "", date: todayBogota(), reference: "", productName: "",
    client: "KLINIU", lot: "", quantity: "", producedQuantity: "", notes: "",
  });
  const openEdit = (o: Omit<WorkOrder, "_count">) => setForm({
    id: o.id, status: o.status, number: String(o.number), date: o.date.slice(0, 10), reference: o.reference, productName: o.productName,
    client: o.client, lot: o.lot?.toString() ?? "", quantity: String(o.quantity),
    producedQuantity: o.producedQuantity?.toString() ?? "", notes: o.notes ?? "",
  });

  const save = async () => {
    if (!form) return;
    setSaving(true);
    markLocalWrite();
    const body = {
      number: Number(form.number), date: form.date, reference: form.reference, productName: form.productName,
      client: form.client, lot: int(form.lot), quantity: Number(form.quantity), notes: form.notes,
      ...(form.id ? { producedQuantity: int(form.producedQuantity) } : {}),
    };
    const res = await (form.id ? patchReq(`/api/panel/ensamble/work-orders/${form.id}`, body) : post("/api/panel/ensamble/work-orders", body))
      .catch(() => ({ ok: false, error: "Error de conexión" }))
      .finally(() => setSaving(false));
    if (!res.ok) return notify("err", res.error ?? "No fue posible guardar la ODT");
    notify("ok", form.id ? `ODT ${form.number} actualizada` : `ODT ${form.number} creada`);
    setForm(null);
    refresh();
  };

  const loadDetail = async (id: string): Promise<Detail | null> => {
    try {
      const r = await fetch(`/api/panel/ensamble/work-orders/${id}`);
      return r.ok ? ((await r.json()) as Detail) : null;
    } catch {
      return null;
    }
  };

  const startClose = async (order: WorkOrder) => {
    setClosing({ order, produced: order.producedQuantity?.toString() ?? "", detail: undefined });
    const d = await loadDetail(order.id);
    setClosing((c) => (c && c.order.id === order.id ? { ...c, detail: d } : c));
  };

  const close = async () => {
    if (!closing) return;
    setSaving(true);
    markLocalWrite();
    const res = await patchReq(`/api/panel/ensamble/work-orders/${closing.order.id}`, { action: "close", producedQuantity: int(closing.produced) })
      .catch(() => ({ ok: false, error: "Error de conexión" }))
      .finally(() => setSaving(false));
    if (!res.ok) return notify("err", res.error ?? "No fue posible cerrar la ODT");
    notify("ok", `ODT ${closing.order.number} cerrada`);
    setClosing(null);
    refresh();
  };

  const reopen = async (o: WorkOrder) => {
    if (!(await confirm({ title: "Reabrir ODT", message: `¿Reabrir la ODT ${o.number}? Volverá a aceptar registros.`, confirmLabel: "Reabrir", danger: false }))) return;
    markLocalWrite();
    const res = await patchReq(`/api/panel/ensamble/work-orders/${o.id}`, { action: "reopen" }).catch(() => ({ ok: false, error: "Error de conexión" }));
    if (!res.ok) return notify("err", res.error ?? "No fue posible reabrir la ODT");
    notify("ok", `ODT ${o.number} reabierta`);
    refresh();
  };

  const remove = async (o: WorkOrder) => {
    if (!(await confirm({ title: "Eliminar ODT", message: `¿Eliminar la ODT ${o.number}?` }))) return;
    markLocalWrite();
    const r = await fetch(`/api/panel/ensamble/work-orders/${o.id}`, { method: "DELETE" }).catch(() => null);
    if (!r?.ok) return notify("err", r ? await jsonError(r, "No fue posible eliminar la ODT") : "Error de conexión");
    notify("ok", `ODT ${o.number} eliminada`);
    refresh();
  };

  const showDetail = async (o: WorkOrder) => {
    const d = await loadDetail(o.id);
    if (d) setDetail(d); else notify("err", "No fue posible cargar el detalle");
  };

  const valid = form && Number(form.number) > 0 && form.date && form.reference.trim() && form.productName.trim() && Number(form.quantity) > 0
    && (form.status !== "CLOSED" || form.producedQuantity.trim() !== "");

  return (
    <Section
      title={`Órdenes de trabajo (${visible.length})`}
      action={canManage && <button className={btnPrimary} onClick={openNew}><MdAdd size={16} />Nueva ODT</button>}
    >
      <div className="mb-4 flex flex-wrap items-end gap-2">
        <div className="w-40">
          <label className={labelCls}>Estado</label>
          <SimpleSelect value={status} options={STATUS_FILTER} onChange={setStatus} />
        </div>
        <div className="min-w-[200px] flex-1">
          <label className={labelCls}>Buscar</label>
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="N° ODT, referencia, producto o cliente" className={`${inputCls} pl-9`} />
          </div>
        </div>
      </div>

      {!orders ? (failed ? (
        <div className="space-y-2 text-center">
          <Empty text="No fue posible cargar las ODTs." />
          <button className={btnGhost} onClick={() => load()}>Reintentar</button>
        </div>
      ) : <SkeletonTable />) : (
        <Table
          head={["ODT", "Fecha", "Referencia", "Producto", "Cliente", "Lote", "Uni lote", "Uni prod", "Estado", "Registros", canManage ? "" : null]}
          onRowClick={(i) => showDetail(visible[i])}
          rows={visible.map((o) => [
            <b key="n">{o.number}</b>,
            fmtDateOnly(o.date, { day: "2-digit", month: "short" }),
            o.reference,
            <span key="p" className="line-clamp-2 max-w-[260px]">{o.productName}{o.notes && <span className="block text-[11px] text-[#94A3B8]">{o.notes}</span>}</span>,
            o.client,
            o.lot ?? "—",
            fmtUnits(o.quantity),
            o.producedQuantity != null ? fmtUnits(o.producedQuantity) : "—",
            <Badge key="s" {...STATUS[o.status]} />,
            String(o._count.entries),
            canManage ? (
              <div key="a" className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => openEdit(o)} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]" aria-label="Editar ODT"><MdEdit size={16} /></button>
                {o.status === "OPEN"
                  ? <button onClick={() => startClose(o)} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]" aria-label="Cerrar ODT"><MdLock size={16} /></button>
                  : <button onClick={() => reopen(o)} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#1A1A1A]" aria-label="Reabrir ODT"><MdLockOpen size={16} /></button>}
                {options.permission.canDelete && (
                  <button onClick={() => remove(o)} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]" aria-label="Eliminar ODT"><MdDelete size={16} /></button>
                )}
              </div>
            ) : null,
          ])}
          empty={status === "OPEN" ? "Sin ODTs abiertas." : "Sin ODTs para este filtro."}
        />
      )}

      {form && (
        <Modal title={form.id ? `Editar ODT ${form.number}` : "Nueva ODT"} onClose={() => setForm(null)} wide
          footer={<Footer onClose={() => setForm(null)} onSubmit={save} disabled={!valid} submitting={saving} />}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>N° ODT</label>
              <input type="number" min={1} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} className={`no-spinner ${inputCls}`} />
            </div>
            <div>
              <label className={labelCls}>Fecha</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cliente</label>
              <SuggestInput
                value={form.client} uppercase
                onChange={(v) => setForm({ ...form, client: v })}
                suggestions={options.clients} toText={(c) => c} render={(c) => c}
                onPick={(c) => setForm({ ...form, client: c })}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Referencia</label>
              <SuggestInput
                value={form.reference} placeholder="DCT - 012"
                onChange={(v) => setForm({ ...form, reference: v })}
                suggestions={options.references}
                toText={(s) => `${s.reference} ${s.productName}`}
                render={(s) => <><b>{s.reference}</b> <span className="text-[#64748B]">· {s.productName}</span></>}
                onPick={(s) => setForm({ ...form, reference: s.reference, productName: s.productName })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Producto</label>
              <input value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Lote (opcional)</label>
              <input type="number" min={1} value={form.lot} onChange={(e) => setForm({ ...form, lot: e.target.value })} className={`no-spinner ${inputCls}`} />
            </div>
            <div>
              <label className={labelCls}>Unidades lote</label>
              <input type="number" min={1} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} className={`no-spinner ${inputCls}`} />
            </div>
            {form.id && (
              <div>
                <label className={labelCls}>Unidades producidas</label>
                <input type="number" min={0} value={form.producedQuantity} onChange={(e) => setForm({ ...form, producedQuantity: e.target.value })} className={`no-spinner ${inputCls}`} />
              </div>
            )}
          </div>
          <div>
            <label className={labelCls}>Observaciones</label>
            <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="TODOS LOS STICKERS" className={inputCls} />
          </div>
        </Modal>
      )}

      {closing && (
        <Modal title={`Cerrar ODT ${closing.order.number}`} onClose={() => setClosing(null)}
          footer={<Footer onClose={() => setClosing(null)} onSubmit={close} disabled={closing.produced.trim() === "" || Number(closing.produced) < 0} submitting={saving} />}>
          <p className="text-sm text-[#64748B]">{closing.order.reference} · {closing.order.productName} · lote de {fmtUnits(closing.order.quantity)} und</p>
          <div>
            <label className={labelCls}>Unidades producidas</label>
            <input type="number" min={0} autoFocus value={closing.produced} onChange={(e) => setClosing({ ...closing, produced: e.target.value })} className={`no-spinner ${inputCls}`} />
          </div>
          <OperationSummary detail={closing.detail} />
        </Modal>
      )}

      {detail && (
        <Modal title={`ODT ${detail.order.number}`} onClose={() => setDetail(null)} wide>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Referencia" value={detail.order.reference} />
            <Stat label="Cliente" value={detail.order.client} />
            <Stat label="Unidades lote" value={fmtUnits(detail.order.quantity)} />
            <Stat label="Unidades producidas" value={detail.order.producedQuantity != null ? fmtUnits(detail.order.producedQuantity) : "—"} />
          </div>
          <p className="text-sm font-bold text-[#1A1A1A]">{detail.order.productName}</p>
          {detail.order.notes && <p className="text-sm text-[#64748B]">{detail.order.notes}</p>}
          <OperationSummary detail={detail} />
          {canManage && (
            <div className="flex gap-2">
              <button className={btnGhost} onClick={() => { const o = detail.order; setDetail(null); openEdit(o); }}><MdEdit size={16} />Editar</button>
            </div>
          )}
        </Modal>
      )}
    </Section>
  );
}

function OperationSummary({ detail }: { detail: Detail | null | undefined }) {
  if (detail === undefined) return <p className="text-xs text-[#94A3B8]">Cargando registros…</p>;
  if (detail === null) return <p className="text-xs font-semibold text-[#DC2626]">No se pudo cargar el resumen de registros.</p>;
  if (detail.operations.length === 0) return <p className="text-xs text-[#94A3B8]">Aún no hay registros de producción en esta ODT.</p>;
  return (
    <div>
      <p className={labelCls}>Unidades registradas por operación ({detail.operators} operario{detail.operators === 1 ? "" : "s"})</p>
      <div className="overflow-hidden rounded-xl border border-[#E2E8F0]">
        {detail.operations.map((op) => (
          <div key={op.code} className="flex items-center justify-between border-b border-[#F1F5F9] px-3 py-2 text-sm last:border-0">
            <span><b>{op.code}</b> <span className="text-[#64748B]">{op.name}</span></span>
            <span className="font-bold">{fmtUnits(op.units)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
