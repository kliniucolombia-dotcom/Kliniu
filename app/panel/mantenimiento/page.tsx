"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdAdd, MdBuild, MdPrecisionManufacturing, MdInventory, MdRequestQuote, MdAssignment,
  MdPlayArrow, MdCheckCircle, MdCancel, MdHistory, MdWarningAmber, MdTimerOff, MdRemove,
} from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";
import {
  COP, fmtDate, fmtDateTime, todayBogota, inputCls, labelCls, btnPrimary, btnGhost,
  type Permission, type ModalProps, post, patchReq,
  Kpi, Section, Empty, Table, Modal, Footer, Stat, Badge, Tabs, DateRange,
} from "../_components/ops-ui";

type EquipmentType = "MACHINE" | "MOLD" | "TOOL" | "INFRA";
type EquipmentStatus = "OPERATIVE" | "DOWN" | "MAINTENANCE";
type MaintType = "PREVENTIVE" | "CORRECTIVE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type OrderStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type QuoteStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PURCHASED";

type Equipment = {
  id: string; name: string; code: string; type: EquipmentType; location: string | null; status: EquipmentStatus;
  machine: { id: string; code: number; name: string } | null;
  mold: { id: string; code: string; name: string } | null;
  _count: { orders: number };
};
type Machine = { id: string; code: number; name: string; brand: string };
type Order = {
  id: string; number: string; type: MaintType; priority: Priority; status: OrderStatus;
  reportedAt: string; startedAt: string | null; completedAt: string | null; downtimeMinutes: number | null;
  description: string; resolution: string | null;
  equipment: { id: string; name: string; code: string; type: EquipmentType; status: EquipmentStatus };
  reportedBy: { fullName: string }; assignedTo: { fullName: string } | null;
  quotes: { id: string; status: QuoteStatus; amount: number }[];
};
type Item = { id: string; name: string; code: string; category: "SPARE_PART" | "TOOL"; stock: number; minStock: number; unit: string; location: string | null };
type Quote = {
  id: string; supplier: string; description: string; amount: number; status: QuoteStatus; createdAt: string;
  maintenanceOrder: { id: string; number: string; equipment: { name: string } } | null;
};
type Kpis = { openOrders: number; preventive: number; corrective: number; completed: number; downtimeMinutes: number; equipmentDown: number; lowStockItems: number };
type Technician = { id: string; fullName: string };
type Report = { id: string; periodStart: string; periodEnd: string; kpis: Record<string, number | string>; notes: string | null; createdAt: string; author: { fullName: string } };
type Data = { equipment: Equipment[]; machines: Machine[]; orders: Order[]; inventory: Item[]; quotes: Quote[]; kpis: Kpis; permission: Permission; technicians: Technician[] };

type Tab = "ordenes" | "equipos" | "inventario" | "cotizaciones" | "informes";
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "ordenes", label: "Órdenes", icon: <MdBuild size={16} /> },
  { key: "equipos", label: "Equipos", icon: <MdPrecisionManufacturing size={16} /> },
  { key: "inventario", label: "Repuestos y herramientas", icon: <MdInventory size={16} /> },
  { key: "cotizaciones", label: "Cotizaciones", icon: <MdRequestQuote size={16} /> },
  { key: "informes", label: "Informes", icon: <MdAssignment size={16} /> },
];

const EQ_TYPE: Record<EquipmentType, string> = { MACHINE: "Máquina", MOLD: "Molde", TOOL: "Herramienta", INFRA: "Infraestructura" };
const EQ_STATUS: Record<EquipmentStatus, { label: string; cls: string }> = {
  OPERATIVE: { label: "Operativo", cls: "bg-[#DCFCE7] text-[#15803D]" },
  MAINTENANCE: { label: "En mantenimiento", cls: "bg-[#FEF3C7] text-[#B45309]" },
  DOWN: { label: "Fuera de servicio", cls: "bg-[#FEE2E2] text-[#DC2626]" },
};
const ORDER_STATUS: Record<OrderStatus, { label: string; cls: string }> = {
  PENDING: { label: "Pendiente", cls: "bg-[#F1F5F9] text-[#64748B]" },
  IN_PROGRESS: { label: "En ejecución", cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
  DONE: { label: "Completada", cls: "bg-[#DCFCE7] text-[#15803D]" },
  CANCELLED: { label: "Cancelada", cls: "bg-[#FEE2E2] text-[#DC2626]" },
};
const PRIORITY: Record<Priority, { label: string; cls: string }> = {
  LOW: { label: "Baja", cls: "bg-[#F1F5F9] text-[#64748B]" },
  MEDIUM: { label: "Media", cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
  HIGH: { label: "Alta", cls: "bg-[#FFEDD5] text-[#C2410C]" },
  URGENT: { label: "Urgente", cls: "bg-[#FEE2E2] text-[#DC2626]" },
};
const QUOTE_STATUS: Record<QuoteStatus, { label: string; cls: string }> = {
  REQUESTED: { label: "Solicitada", cls: "bg-[#F1F5F9] text-[#64748B]" },
  APPROVED: { label: "Aprobada", cls: "bg-[#DCFCE7] text-[#15803D]" },
  REJECTED: { label: "Rechazada", cls: "bg-[#FEE2E2] text-[#DC2626]" },
  PURCHASED: { label: "Comprada", cls: "bg-[#EDE9FE] text-[#6D28D9]" },
};
const REPORT_KPI_LABELS: Record<string, string> = {
  ordenesAbiertas: "Órdenes abiertas",
  preventivas: "Preventivas",
  correctivas: "Correctivas",
  completadas: "Completadas",
  tiempoMuertoMin: "Tiempo muerto (min)",
  equiposFueraServicio: "Equipos fuera de servicio",
  itemsBajoMinimo: "Ítems bajo mínimo",
};

function fmtMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export default function MantenimientoPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("ordenes");
  const [from, setFrom] = useState(todayBogota(-7));
  const [to, setTo] = useState(todayBogota());
  const [data, setData] = useState<Data | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [modal, setModal] = useState<
    | { kind: "order" }
    | { kind: "complete"; order: Order; openedAt: number }
    | { kind: "equipment" }
    | { kind: "history"; equipment: Equipment }
    | { kind: "item" }
    | { kind: "adjust"; item: Item; sign: 1 | -1 }
    | { kind: "quote" }
    | { kind: "report" }
    | null
  >(null);

  const load = useCallback(async () => {
    const [r, rr] = await Promise.all([
      fetch(`/api/panel/mantenimiento?from=${from}&to=${to}`),
      fetch("/api/panel/operaciones/informes?module=MODULE_MANTENIMIENTO"),
    ]);
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    if (!r.ok) { setAlert({ type: "err", msg: (await r.json()).error ?? "Error al cargar" }); setLoading(false); return; }
    setData(await r.json());
    if (rr.ok) setReports((await rr.json()).reports);
    setLoading(false);
  }, [from, to, router]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const perm = data?.permission ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };
  const done = (msg: string) => { setModal(null); setAlert({ type: "ok", msg }); load(); };
  const fail = (msg: string) => setAlert({ type: "err", msg });
  async function patch(url: string, body: unknown, okMsg: string) {
    const res = await patchReq(url, body);
    if (res.ok) { setAlert({ type: "ok", msg: okMsg }); load(); } else fail(res.error!);
  }

  const openOrders = useMemo(() => (data?.orders ?? []).filter((o) => o.status === "PENDING" || o.status === "IN_PROGRESS"), [data]);
  const closedOrders = useMemo(() => (data?.orders ?? []).filter((o) => o.status === "DONE" || o.status === "CANCELLED"), [data]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Mantenimiento</h1>
          <p className="mt-1 text-sm text-[#64748B]">Equipos, moldes e infraestructura: preventivo, correctivo, repuestos, cotizaciones e informe semanal.</p>
        </div>
        <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {alert && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>{alert.msg}</div>
      )}

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<MdBuild size={18} />} label="Órdenes abiertas" value={String(data.kpis.openOrders)} color="#27B1B8" />
          <Kpi icon={<MdCheckCircle size={18} />} label="Completadas en el período" value={String(data.kpis.completed)} color="#15803D" />
          <Kpi icon={<MdTimerOff size={18} />} label="Tiempo muerto del período" value={fmtMinutes(data.kpis.downtimeMinutes)} color="#F0A73C" />
          <Kpi icon={<MdWarningAmber size={18} />} label="Equipos no operativos" value={String(data.kpis.equipmentDown)} color="#DC2626" />
        </div>
      )}

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {loading || !data ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : (
        <>
          {tab === "ordenes" && (
            <div className="space-y-8">
              <Section
                title={`Órdenes abiertas (${openOrders.length})`}
                action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "order" })} disabled={data.equipment.length === 0}><MdAdd size={16} />Nueva orden</button>}
              >
                {data.equipment.length === 0 && <p className="mb-3 rounded-xl bg-[#FEF3C7] px-3 py-2 text-xs font-semibold text-[#B45309]">Registra primero los equipos en la pestaña Equipos.</p>}
                {openOrders.length === 0 && <Empty text="Sin órdenes abiertas." />}
                <div className="space-y-3">
                  {openOrders.map((o) => (
                    <OrderCard key={o.id} order={o} canEdit={perm.canEdit}
                      onStart={() => patch(`/api/panel/mantenimiento/ordenes/${o.id}`, { action: "start" }, `Orden ${o.number} iniciada`)}
                      onComplete={() => setModal({ kind: "complete", order: o, openedAt: Date.now() })}
                      onCancel={() => patch(`/api/panel/mantenimiento/ordenes/${o.id}`, { action: "cancel" }, `Orden ${o.number} cancelada`)}
                    />
                  ))}
                </div>
              </Section>
              <Section title={`Historial del período (${closedOrders.length})`}>
                <Table
                  head={["Orden", "Equipo", "Tipo", "Prioridad", "Estado", "Reportada", "Completada", "Tiempo muerto", "Resolución"]}
                  rows={closedOrders.map((o) => [
                    <b key="n">{o.number}</b>, `${o.equipment.name} (${o.equipment.code})`, o.type === "PREVENTIVE" ? "Preventivo" : "Correctivo",
                    <Badge key="p" {...PRIORITY[o.priority]} />, <Badge key="s" {...ORDER_STATUS[o.status]} />,
                    fmtDateTime(o.reportedAt), o.completedAt ? fmtDateTime(o.completedAt) : "—", o.downtimeMinutes != null ? fmtMinutes(o.downtimeMinutes) : "—", o.resolution ?? "—",
                  ])}
                  empty="Sin órdenes cerradas en este período."
                />
              </Section>
            </div>
          )}

          {tab === "equipos" && (
            <Section
              title="Equipos, moldes e infraestructura"
              action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "equipment" })}><MdAdd size={16} />Nuevo equipo</button>}
            >
              <Table
                head={["Código", "Nombre", "Tipo", "Ubicación", "Estado", "Órdenes", ""]}
                rows={data.equipment.map((e) => [
                  <b key="c">{e.code}</b>,
                  <span key="n">{e.name}{e.machine && <span className="block text-[10px] text-[#94A3B8]">Máquina #{e.machine.code} · {e.machine.name}</span>}</span>,
                  EQ_TYPE[e.type], e.location ?? "—", <Badge key="s" {...EQ_STATUS[e.status]} />, String(e._count.orders),
                  <div key="a" className="flex gap-2">
                    <button className={btnGhost} onClick={() => setModal({ kind: "history", equipment: e })}><MdHistory size={16} />Hoja de vida</button>
                    {perm.canEdit && e.status !== "MAINTENANCE" && (
                      <button className={btnGhost} onClick={() => patch(`/api/panel/mantenimiento/equipos/${e.id}`, { status: e.status === "DOWN" ? "OPERATIVE" : "DOWN" }, e.status === "DOWN" ? "Equipo marcado operativo" : "Equipo marcado fuera de servicio")}>
                        {e.status === "DOWN" ? "Marcar operativo" : "Fuera de servicio"}
                      </button>
                    )}
                  </div>,
                ])}
                empty="Sin equipos registrados. Agrega máquinas, moldes, herramientas o infraestructura."
              />
            </Section>
          )}

          {tab === "inventario" && (
            <Section
              title="Inventario de repuestos y herramientas"
              action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "item" })}><MdAdd size={16} />Nuevo ítem</button>}
            >
              {data.kpis.lowStockItems > 0 && <p className="mb-3 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{data.kpis.lowStockItems} ítem{data.kpis.lowStockItems === 1 ? "" : "s"} en o por debajo del stock mínimo.</p>}
              <Table
                head={["Código", "Nombre", "Categoría", "Stock", "Mínimo", "Ubicación", perm.canEdit ? "" : null]}
                rows={data.inventory.map((i) => [
                  <b key="c">{i.code}</b>, i.name, i.category === "TOOL" ? "Herramienta" : "Repuesto",
                  <span key="s" className={`font-bold ${i.stock <= i.minStock ? "text-[#DC2626]" : "text-[#1A1A1A]"}`}>{i.stock} {i.unit}</span>,
                  `${i.minStock} ${i.unit}`, i.location ?? "—",
                  perm.canEdit ? (
                    <div key="a" className="flex gap-1">
                      <button className={btnGhost} onClick={() => setModal({ kind: "adjust", item: i, sign: 1 })} aria-label="Entrada"><MdAdd size={16} /></button>
                      <button className={btnGhost} onClick={() => setModal({ kind: "adjust", item: i, sign: -1 })} aria-label="Salida" disabled={i.stock === 0}><MdRemove size={16} /></button>
                    </div>
                  ) : null,
                ])}
                empty="Sin ítems. Registra repuestos y herramientas."
              />
            </Section>
          )}

          {tab === "cotizaciones" && (
            <Section
              title="Cotizaciones y compra de repuestos"
              action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "quote" })}><MdAdd size={16} />Nueva cotización</button>}
            >
              <Table
                head={["Fecha", "Proveedor", "Descripción", "Orden", "Monto", "Estado", perm.canEdit ? "" : null]}
                rows={data.quotes.map((q) => [
                  fmtDate(q.createdAt), <b key="s">{q.supplier}</b>, q.description,
                  q.maintenanceOrder ? `${q.maintenanceOrder.number} · ${q.maintenanceOrder.equipment.name}` : "—",
                  <b key="a">{COP.format(q.amount)}</b>, <Badge key="st" {...QUOTE_STATUS[q.status]} />,
                  perm.canEdit ? (
                    <div key="ac" className="flex flex-wrap gap-1">
                      {q.status === "REQUESTED" && <>
                        <button className={btnGhost} onClick={() => patch(`/api/panel/mantenimiento/cotizaciones/${q.id}`, { status: "APPROVED" }, "Cotización aprobada")}>Aprobar</button>
                        <button className={btnGhost} onClick={() => patch(`/api/panel/mantenimiento/cotizaciones/${q.id}`, { status: "REJECTED" }, "Cotización rechazada")}>Rechazar</button>
                      </>}
                      {q.status === "APPROVED" && <button className={btnPrimary} onClick={() => patch(`/api/panel/mantenimiento/cotizaciones/${q.id}`, { status: "PURCHASED" }, "Compra registrada")}>Marcar comprada</button>}
                    </div>
                  ) : null,
                ])}
                empty="Sin cotizaciones."
              />
            </Section>
          )}

          {tab === "informes" && (
            <Section
              title="Informes al Jefe de Operaciones"
              action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "report" })}><MdAdd size={16} />Presentar informe</button>}
            >
              {reports.length === 0 && <Empty text="Aún no hay informes presentados." />}
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div key={rep.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-black text-[#1A1A1A]">{fmtDate(rep.periodStart)} — {fmtDate(rep.periodEnd)}</p>
                      <p className="text-xs text-[#94A3B8]">{rep.author.fullName} · {fmtDate(rep.createdAt)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {Object.keys(REPORT_KPI_LABELS).filter((k) => k in rep.kpis).map((k) => (
                        <Stat key={k} label={REPORT_KPI_LABELS[k]} value={String(rep.kpis[k])} />
                      ))}
                    </div>
                    {rep.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-[#1A1A1A]">{rep.notes}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {modal?.kind === "order" && data && <OrderModal equipment={data.equipment} technicians={data.technicians} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "complete" && <CompleteModal order={modal.order} openedAt={modal.openedAt} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "equipment" && data && <EquipmentModal machines={data.machines} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "history" && <HistoryModal equipment={modal.equipment} onClose={() => setModal(null)} />}
      {modal?.kind === "item" && <ItemModal onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "adjust" && <AdjustModal item={modal.item} sign={modal.sign} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "quote" && data && <QuoteModal orders={openOrders} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "report" && data && <ReportModal from={from} to={to} kpis={data.kpis} onClose={() => setModal(null)} onDone={done} onError={fail} />}
    </div>
  );
}

function OrderCard({ order: o, canEdit, onStart, onComplete, onCancel }: { order: Order; canEdit: boolean; onStart: () => void; onComplete: () => void; onCancel: () => void }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-black text-[#1A1A1A]">{o.number}</p>
            <Badge {...ORDER_STATUS[o.status]} />
            <Badge {...PRIORITY[o.priority]} />
            <Badge label={o.type === "PREVENTIVE" ? "Preventivo" : "Correctivo"} cls={o.type === "PREVENTIVE" ? "bg-[#E0F2FE] text-[#0369A1]" : "bg-[#FFEDD5] text-[#C2410C]"} />
          </div>
          <p className="mt-1 text-sm font-semibold text-[#1A1A1A]">{o.equipment.name} <span className="text-xs font-normal text-[#94A3B8]">({o.equipment.code} · {EQ_TYPE[o.equipment.type]})</span></p>
          <p className="mt-1 text-sm text-[#64748B]">{o.description}</p>
          <p className="mt-1 text-xs text-[#94A3B8]">
            Reportada {fmtDateTime(o.reportedAt)} por {o.reportedBy.fullName}
            {o.assignedTo && ` · Asignada a ${o.assignedTo.fullName}`}
            {o.startedAt && ` · Inició ${fmtDateTime(o.startedAt)}`}
          </p>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            {o.status === "PENDING" && <button className={btnPrimary} onClick={onStart}><MdPlayArrow size={16} />Iniciar</button>}
            {o.status === "IN_PROGRESS" && <button className={btnPrimary} onClick={onComplete}><MdCheckCircle size={16} />Completar</button>}
            <button className={btnGhost} onClick={onCancel}><MdCancel size={16} />Cancelar</button>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderModal({ equipment, technicians, onClose, onDone, onError }: ModalProps & { equipment: Equipment[]; technicians: Technician[] }) {
  const [equipmentId, setEquipmentId] = useState(equipment[0]?.id ?? "");
  const [type, setType] = useState<MaintType>("CORRECTIVE");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/mantenimiento/ordenes", { equipmentId, type, priority, description, assignedToId: assignedToId || undefined });
    setSubmitting(false);
    if (res.ok) onDone("Orden creada"); else onError(res.error!);
  };
  return (
    <Modal title="Nueva orden de mantenimiento" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!equipmentId || !description.trim()} />}>
      <div><label className={labelCls}>Equipo</label><SimpleSelect value={equipmentId} options={equipment.map((e) => ({ value: e.id, label: `${e.name} (${e.code})` }))} onChange={setEquipmentId} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Tipo</label><SimpleSelect value={type} options={[{ value: "CORRECTIVE", label: "Correctivo (falla)" }, { value: "PREVENTIVE", label: "Preventivo" }]} onChange={(v) => setType(v as MaintType)} /></div>
        <div><label className={labelCls}>Prioridad</label><SimpleSelect value={priority} options={(Object.keys(PRIORITY) as Priority[]).map((p) => ({ value: p, label: PRIORITY[p].label }))} onChange={(v) => setPriority(v as Priority)} /></div>
      </div>
      <div><label className={labelCls}>Asignar a (opcional)</label><SimpleSelect value={assignedToId} options={[{ value: "", label: "—" }, ...technicians.map((t) => ({ value: t.id, label: t.fullName }))]} onChange={setAssignedToId} /></div>
      <div><label className={labelCls}>Descripción de la falla o actividad</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} /></div>
    </Modal>
  );
}

function CompleteModal({ order, openedAt, onClose, onDone, onError }: ModalProps & { order: Order; openedAt: number }) {
  const elapsed = order.startedAt ? Math.max(0, Math.round((openedAt - new Date(order.startedAt).getTime()) / 60000)) : 0;
  const [resolution, setResolution] = useState("");
  const [downtime, setDowntime] = useState(String(elapsed));
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await patchReq(`/api/panel/mantenimiento/ordenes/${order.id}`, { action: "complete", resolution, downtimeMinutes: Number(downtime) });
    setSubmitting(false);
    if (res.ok) onDone(`Orden ${order.number} completada`); else onError(res.error!);
  };
  return (
    <Modal title={`Completar ${order.number}`} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!resolution.trim() || Number(downtime) < 0} />}>
      <p className="text-sm text-[#64748B]">{order.equipment.name} · {order.description}</p>
      <div><label className={labelCls}>Resolución / trabajo realizado</label><textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} className={inputCls} /></div>
      <div>
        <label className={labelCls}>Tiempo muerto (minutos)</label>
        <input type="number" min={0} value={downtime} onChange={(e) => setDowntime(e.target.value)} className={inputCls} />
        <p className="mt-1 text-[11px] text-[#94A3B8]">Calculado desde el inicio de la orden ({fmtMinutes(elapsed)}); ajústalo si el equipo estuvo detenido más o menos tiempo.</p>
      </div>
    </Modal>
  );
}

function EquipmentModal({ machines, onClose, onDone, onError }: ModalProps & { machines: Machine[] }) {
  const [type, setType] = useState<EquipmentType>("MACHINE");
  const [machineId, setMachineId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickMachine = (id: string) => {
    setMachineId(id);
    const m = machines.find((x) => x.id === id);
    if (m) { if (!name) setName(m.name); if (!code) setCode(`MAQ-${m.code}`); }
  };

  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/mantenimiento/equipos", { name, code, type, location, machineId: type === "MACHINE" ? machineId || undefined : undefined });
    setSubmitting(false);
    if (res.ok) onDone("Equipo registrado"); else onError(res.error!);
  };
  return (
    <Modal title="Nuevo equipo" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!name.trim() || !code.trim()} />}>
      <div><label className={labelCls}>Tipo</label><SimpleSelect value={type} options={(Object.keys(EQ_TYPE) as EquipmentType[]).map((t) => ({ value: t, label: EQ_TYPE[t] }))} onChange={(v) => setType(v as EquipmentType)} /></div>
      {type === "MACHINE" && machines.length > 0 && (
        <div><label className={labelCls}>Vincular máquina de producción (opcional)</label><SimpleSelect value={machineId} options={[{ value: "", label: "—" }, ...machines.map((m) => ({ value: m.id, label: `#${m.code} · ${m.name} (${m.brand})` }))]} onChange={pickMachine} /></div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Código</label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} placeholder="MAQ-01, MOL-12…" /></div>
        <div><label className={labelCls}>Ubicación (opcional)</label><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="Planta inyección…" /></div>
      </div>
      <div><label className={labelCls}>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
    </Modal>
  );
}

function HistoryModal({ equipment, onClose }: { equipment: Equipment; onClose: () => void }) {
  const [history, setHistory] = useState<Order[] | null>(null);
  useEffect(() => {
    fetch(`/api/panel/mantenimiento/equipos/${equipment.id}`).then(async (r) => setHistory(r.ok ? (await r.json()).history : []));
  }, [equipment.id]);
  const totalDowntime = (history ?? []).reduce((acc, o) => acc + (o.downtimeMinutes ?? 0), 0);
  return (
    <Modal title={`Hoja de vida — ${equipment.name} (${equipment.code})`} onClose={onClose} wide>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Tipo" value={EQ_TYPE[equipment.type]} />
        <Stat label="Estado" value={EQ_STATUS[equipment.status].label} />
        <Stat label="Órdenes" value={String(history?.length ?? equipment._count.orders)} />
        <Stat label="Tiempo muerto acumulado" value={fmtMinutes(totalDowntime)} />
      </div>
      {history === null ? <p className="py-6 text-center text-sm text-[#94A3B8]">Cargando…</p> : history.length === 0 ? <Empty text="Sin intervenciones registradas." /> : (
        <div className="space-y-2">
          {history.map((o) => (
            <div key={o.id} className="rounded-xl border border-[#E2E8F0] p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <b>{o.number}</b>
                <Badge {...ORDER_STATUS[o.status]} />
                <Badge label={o.type === "PREVENTIVE" ? "Preventivo" : "Correctivo"} cls={o.type === "PREVENTIVE" ? "bg-[#E0F2FE] text-[#0369A1]" : "bg-[#FFEDD5] text-[#C2410C]"} />
                <span className="text-xs text-[#94A3B8]">{fmtDateTime(o.reportedAt)}{o.completedAt && ` → ${fmtDateTime(o.completedAt)}`}{o.downtimeMinutes != null && ` · ${fmtMinutes(o.downtimeMinutes)}`}</span>
              </div>
              <p className="mt-1 text-[#64748B]">{o.description}</p>
              {o.resolution && <p className="mt-1 text-xs text-[#15803D]"><b>Resolución:</b> {o.resolution}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ItemModal({ onClose, onDone, onError }: ModalProps) {
  const [category, setCategory] = useState<Item["category"]>("SPARE_PART");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("0");
  const [unit, setUnit] = useState("und");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/mantenimiento/inventario", { name, code, category, stock: Number(stock), minStock: Number(minStock), unit, location });
    setSubmitting(false);
    if (res.ok) onDone("Ítem registrado"); else onError(res.error!);
  };
  return (
    <Modal title="Nuevo repuesto o herramienta" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!name.trim() || !code.trim()} />}>
      <div><label className={labelCls}>Categoría</label><SimpleSelect value={category} options={[{ value: "SPARE_PART", label: "Repuesto" }, { value: "TOOL", label: "Herramienta" }]} onChange={(v) => setCategory(v as Item["category"])} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Código</label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} /></div>
        <div><label className={labelCls}>Unidad</label><input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Stock inicial</label><input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Stock mínimo</label><input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} className={inputCls} /></div>
      </div>
      <div><label className={labelCls}>Ubicación (opcional)</label><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} /></div>
    </Modal>
  );
}

function AdjustModal({ item, sign, onClose, onDone, onError }: ModalProps & { item: Item; sign: 1 | -1 }) {
  const [qty, setQty] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await patchReq(`/api/panel/mantenimiento/inventario/${item.id}`, { delta: sign * Number(qty) });
    setSubmitting(false);
    if (res.ok) onDone(sign > 0 ? "Entrada registrada" : "Salida registrada"); else onError(res.error!);
  };
  return (
    <Modal title={`${sign > 0 ? "Entrada" : "Salida"} — ${item.name}`} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={Number(qty) <= 0 || (sign < 0 && Number(qty) > item.stock)} />}>
      <p className="text-sm text-[#64748B]">Stock actual: <b className="text-[#1A1A1A]">{item.stock} {item.unit}</b></p>
      <div><label className={labelCls}>Cantidad</label><input type="number" min={1} max={sign < 0 ? item.stock : undefined} value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} /></div>
    </Modal>
  );
}

function QuoteModal({ orders, onClose, onDone, onError }: ModalProps & { orders: Order[] }) {
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [maintenanceOrderId, setMaintenanceOrderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/mantenimiento/cotizaciones", { supplier, description, amount: Number(amount), maintenanceOrderId: maintenanceOrderId || undefined });
    setSubmitting(false);
    if (res.ok) onDone("Cotización registrada"); else onError(res.error!);
  };
  return (
    <Modal title="Nueva cotización de repuesto" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!supplier.trim() || !description.trim() || Number(amount) <= 0} />}>
      <div><label className={labelCls}>Proveedor</label><input value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Descripción</label><input value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} placeholder="Repuesto, cantidad, referencia…" /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Monto (COP)</label><input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Orden asociada (opcional)</label><SimpleSelect value={maintenanceOrderId} options={[{ value: "", label: "—" }, ...orders.map((o) => ({ value: o.id, label: `${o.number} · ${o.equipment.name}` }))]} onChange={setMaintenanceOrderId} /></div>
      </div>
    </Modal>
  );
}

function ReportModal({ from, to, kpis, onClose, onDone, onError }: ModalProps & { from: string; to: string; kpis: Kpis }) {
  const [periodStart, setPeriodStart] = useState(from);
  const [periodEnd, setPeriodEnd] = useState(to);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/operaciones/informes", {
      module: "MODULE_MANTENIMIENTO",
      periodStart,
      periodEnd,
      notes,
    });
    setSubmitting(false);
    if (res.ok) onDone("Informe presentado"); else onError(res.error!);
  };
  return (
    <Modal title="Presentar informe de mantenimiento" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={periodEnd < periodStart} />}>
      <p className="text-xs text-[#64748B]">Los indicadores se toman de los datos reales del período seleccionado arriba.</p>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Desde</label><input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Hasta</label><input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <Stat label="Órdenes abiertas" value={String(kpis.openOrders)} />
        <Stat label="Preventivas / correctivas" value={`${kpis.preventive} / ${kpis.corrective}`} />
        <Stat label="Completadas" value={String(kpis.completed)} />
        <Stat label="Tiempo muerto" value={fmtMinutes(kpis.downtimeMinutes)} />
        <Stat label="Equipos no operativos" value={String(kpis.equipmentDown)} />
        <Stat label="Ítems bajo mínimo" value={String(kpis.lowStockItems)} />
      </div>
      <div><label className={labelCls}>Actividades, necesidades y mejoras propuestas</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className={inputCls} /></div>
    </Modal>
  );
}
