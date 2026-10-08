"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdAdd, MdBuild, MdPrecisionManufacturing, MdInventory, MdRequestQuote, MdAssignment,
  MdPlayArrow, MdCheckCircle, MdCancel, MdHistory, MdWarningAmber, MdTimerOff, MdRemove, MdEdit,
} from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";
import { SignaturePad } from "./signature-pad";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import {
  COP, fmtDate, fmtDateTime, todayBogota, inputCls, labelCls, btnPrimary, btnGhost,
  type Permission, type ModalProps, post, patchReq,
  Kpi, Section, Empty, Table, Modal, Footer, Stat, Badge, Tabs, DateRange,
} from "../_components/ops-ui";
import { SkeletonTable } from "../../components/skeleton";

type EquipmentType = "MACHINE" | "MOLD" | "TOOL" | "INFRA";
type EquipmentStatus = "OPERATIVE" | "DOWN" | "MAINTENANCE";
type MaintType = "PREVENTIVE" | "CORRECTIVE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type OrderStatus = "PENDING" | "IN_PROGRESS" | "DONE" | "CANCELLED";
type QuoteStatus = "REQUESTED" | "APPROVED" | "REJECTED" | "PURCHASED";

type Equipment = {
  id: string; name: string; code: string; type: EquipmentType; location: string | null; status: EquipmentStatus;
  imageUrl: string | null; attachmentUrl: string | null; attachmentName: string | null;
  machine: { id: string; code: number; name: string } | null;
  mold: { id: string; code: string; name: string } | null;
  _count: { orders: number };
};
type Machine = { id: string; code: number; name: string; brand: string };
type Attachment = { url: string; name: string; isImage: boolean };
type Order = {
  id: string; number: string; type: MaintType; priority: Priority; status: OrderStatus;
  reportedAt: string; startedAt: string | null; completedAt: string | null; downtimeMinutes: number | null;
  description: string; resolution: string | null;
  signatureData: string | null; signedByName: string | null; executorSignatureData: string | null; executorName: string | null; signedAt: string | null;
  attachments: Attachment[];
  equipment: { id: string; name: string; code: string; type: EquipmentType; status: EquipmentStatus };
  reportedBy: { fullName: string }; assignedTo: { fullName: string } | null;
  quotes: { id: string; status: QuoteStatus; amount: number }[];
};
type Item = { id: string; name: string; code: string; category: "SPARE_PART" | "TOOL"; stock: number; minStock: number; unit: string; location: string | null; imageUrl: string | null; attachmentUrl: string | null; attachmentName: string | null };
type Quote = {
  id: string; supplier: string; description: string; amount: number; status: QuoteStatus; createdAt: string;
  attachments: Attachment[];
  maintenanceOrder: { id: string; number: string; equipment: { name: string } } | null;
};
type Kpis = { openOrders: number; preventive: number; corrective: number; completed: number; downtimeMinutes: number; equipmentDown: number; lowStockItems: number };
type Technician = { id: string; fullName: string };
type Report = { id: string; periodStart: string; periodEnd: string; kpis: Record<string, number | string>; notes: string | null; attachments: Attachment[]; createdAt: string; author: { fullName: string } };
type Data = { equipment: Equipment[]; machines: Machine[]; orders: Order[]; inventory: Item[]; quotes: Quote[]; kpis: Kpis; permission: Permission; technicians: Technician[]; molds: { id: string; code: string; name: string }[] };

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

function AttachmentPreview({ items, large }: { items: Attachment[]; large?: boolean }) {
  if (!items.length) return null;
  const box = large ? "h-24 w-24" : "h-14 w-14";
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((a, i) => a.isImage ? (
        <a key={`${a.url}-${i}`} href={a.url} target="_blank" rel="noopener noreferrer" title={a.name}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.url} alt={a.name} className={`${box} rounded-lg border border-[#E2E8F0] object-cover`} />
        </a>
      ) : (
        <a key={`${a.url}-${i}`} href={a.url} target="_blank" rel="noopener noreferrer" className={btnGhost}>📎 {a.name}</a>
      ))}
    </div>
  );
}

function AttachmentsField({ value, onChange, folder, onError }: { value: Attachment[]; onChange: (v: Attachment[]) => void; folder: "equipos" | "ordenes" | "inventario" | "cotizaciones" | "informes"; onError: (msg: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const next = [...value];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", folder);
        const res = await fetch("/api/panel/mantenimiento/upload", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) { onError(json.error ?? `No fue posible subir ${file.name}`); continue; }
        next.push({ url: json.url, name: json.name, isImage: json.isImage });
      }
      onChange(next);
    } finally {
      setUploading(false);
    }
  };
  const removeAt = (index: number) => onChange(value.filter((_, i) => i !== index));
  return (
    <div className="space-y-2">
      <label className={`${btnGhost} cursor-pointer`}>
        {uploading ? "Subiendo…" : "Adjuntar fotos o archivos"}
        <input type="file" multiple className="hidden" disabled={uploading} onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
      </label>
      {value.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {value.map((a, i) => (
            <span key={`${a.url}-${i}`} className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1">
              {a.isImage ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer" title={a.name}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.name} className="h-12 w-12 rounded object-cover" />
                </a>
              ) : (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="max-w-[160px] truncate px-1 text-xs font-semibold text-[#27B1B8]">📎 {a.name}</a>
              )}
              <button type="button" className="rounded px-1 text-xs font-bold text-[#DC2626] hover:bg-[#FEE2E2]" onClick={() => removeAt(i)} aria-label="Quitar adjunto">×</button>
            </span>
          ))}
        </div>
      )}
      <p className="text-[11px] text-[#94A3B8]">Fotos (JPG/PNG/WEBP) y documentos hasta 25 MB cada uno.</p>
    </div>
  );
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
    | { kind: "equipment"; equipment?: Equipment }
    | { kind: "history"; equipment: Equipment }
    | { kind: "item"; item?: Item }
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

  const { markLocalWrite } = useRealtimeRefresh(["maintenance"], load);

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
    markLocalWrite();
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
        <SkeletonTable />
      ) : (
        <>
          {tab === "ordenes" && (
            <div className="space-y-8">
              <Section
                title={`Órdenes abiertas (${openOrders.length})`}
                action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "order" })} disabled={data.equipment.length === 0 && data.molds.length === 0}><MdAdd size={16} />Nueva orden</button>}
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
                head={["Foto", "Código", "Nombre", "Tipo", "Ubicación", "Estado", "Órdenes", ""]}
                rows={data.equipment.map((e) => [
                  e.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img key="img" src={e.imageUrl} alt={e.name} className="h-10 w-10 rounded-lg border border-[#E2E8F0] object-cover" />
                    : <span key="img" className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#94A3B8]"><MdPrecisionManufacturing size={18} /></span>,
                  <b key="c">{e.code}</b>,
                  <span key="n">{e.name}{e.machine && <span className="block text-[10px] text-[#94A3B8]">Máquina #{e.machine.code} · {e.machine.name}</span>}
                    {e.attachmentUrl && <a href={e.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-[10px] font-semibold text-[#27B1B8] hover:underline">📎 {e.attachmentName ?? "Archivo"}</a>}
                  </span>,
                  EQ_TYPE[e.type], e.location ?? "—", <Badge key="s" {...EQ_STATUS[e.status]} />, String(e._count.orders),
                  <div key="a" className="flex flex-wrap gap-2">
                    <button className={btnGhost} onClick={() => setModal({ kind: "history", equipment: e })}><MdHistory size={16} />Hoja de vida</button>
                    {perm.canEdit && (
                      <>
                        <button className={btnGhost} onClick={() => setModal({ kind: "equipment", equipment: e })}><MdEdit size={16} />Editar</button>
                        {e.status !== "MAINTENANCE" && (
                          <button className={btnGhost} onClick={() => patch(`/api/panel/mantenimiento/equipos/${e.id}`, { status: e.status === "DOWN" ? "OPERATIVE" : "DOWN" }, e.status === "DOWN" ? "Equipo marcado operativo" : "Equipo marcado fuera de servicio")}>
                            {e.status === "DOWN" ? "Marcar operativo" : "Fuera de servicio"}
                          </button>
                        )}
                      </>
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
                head={["Foto", "Código", "Nombre", "Categoría", "Stock", "Mínimo", "Ubicación", perm.canEdit ? "" : null]}
                rows={data.inventory.map((i) => [
                  i.imageUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img key="img" src={i.imageUrl} alt={i.name} className="h-10 w-10 rounded-lg border border-[#E2E8F0] object-cover" />
                    : <span key="img" className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F5F9] text-[#94A3B8]"><MdInventory size={18} /></span>,
                  <b key="c">{i.code}</b>,
                  <span key="n">{i.name}
                    {i.attachmentUrl && <a href={i.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 block text-[10px] font-semibold text-[#27B1B8] hover:underline">📎 {i.attachmentName ?? "Archivo"}</a>}
                  </span>,
                  i.category === "TOOL" ? "Herramienta" : "Repuesto",
                  <span key="s" className={`font-bold ${i.stock <= i.minStock ? "text-[#DC2626]" : "text-[#1A1A1A]"}`}>{i.stock} {i.unit}</span>,
                  `${i.minStock} ${i.unit}`, i.location ?? "—",
                  perm.canEdit ? (
                    <div key="a" className="flex gap-1">
                      <button className={btnGhost} onClick={() => setModal({ kind: "item", item: i })} aria-label="Editar"><MdEdit size={16} /></button>
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
                  fmtDate(q.createdAt), <b key="s">{q.supplier}</b>,
                  <span key="d">{q.description}{q.attachments?.length > 0 && <div className="mt-1"><AttachmentPreview items={q.attachments} /></div>}</span>,
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
                    {rep.attachments?.length > 0 && <div className="mt-3"><AttachmentPreview items={rep.attachments} /></div>}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {modal?.kind === "order" && data && <OrderModal equipment={data.equipment} technicians={data.technicians} molds={data.molds} onClose={() => setModal(null)} onDone={done} onError={fail} markLocalWrite={markLocalWrite} />}
      {modal?.kind === "complete" && <CompleteModal order={modal.order} openedAt={modal.openedAt} onClose={() => setModal(null)} onDone={done} onError={fail} markLocalWrite={markLocalWrite} />}
      {modal?.kind === "equipment" && data && <EquipmentModal equipment={modal.equipment} machines={data.machines} onClose={() => setModal(null)} onDone={done} onError={fail} markLocalWrite={markLocalWrite} />}
      {modal?.kind === "history" && <HistoryModal equipment={modal.equipment} onClose={() => setModal(null)} />}
      {modal?.kind === "item" && <ItemModal item={modal.item} onClose={() => setModal(null)} onDone={done} onError={fail} markLocalWrite={markLocalWrite} />}
      {modal?.kind === "adjust" && <AdjustModal item={modal.item} sign={modal.sign} onClose={() => setModal(null)} onDone={done} onError={fail} markLocalWrite={markLocalWrite} />}
      {modal?.kind === "quote" && data && <QuoteModal orders={openOrders} onClose={() => setModal(null)} onDone={done} onError={fail} markLocalWrite={markLocalWrite} />}
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
          {o.attachments?.length > 0 && <div className="mt-2"><AttachmentPreview items={o.attachments} /></div>}
          <p className="mt-1 text-xs text-[#94A3B8]">
            Reportada {fmtDateTime(o.reportedAt)} por {o.reportedBy.fullName}
            {o.assignedTo && ` · Asignada a ${o.assignedTo.fullName}`}
            {o.startedAt && ` · Inició ${fmtDateTime(o.startedAt)}`}
          </p>
        </div>
        {(canEdit || o.status === "PENDING" || o.status === "IN_PROGRESS") && (
          <div className="flex flex-wrap gap-2">
            {o.status === "PENDING" && <button className={btnPrimary} onClick={onStart}><MdPlayArrow size={16} />Iniciar</button>}
            {o.status === "IN_PROGRESS" && <button className={btnPrimary} onClick={onComplete}><MdCheckCircle size={16} />Completar</button>}
            {canEdit && <button className={btnGhost} onClick={onCancel}><MdCancel size={16} />Cancelar</button>}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderModal({ equipment, technicians, molds, onClose, onDone, onError, markLocalWrite }: ModalProps & { equipment: Equipment[]; technicians: Technician[]; molds: { id: string; code: string; name: string }[]; markLocalWrite: () => void }) {
  const options = [...equipment.map((e) => ({ value: e.id, label: `${e.name} (${e.code})` })), ...molds.map((m) => ({ value: `mold:${m.id}`, label: `Molde ${m.name} (${m.code})` }))];
  const [equipmentId, setEquipmentId] = useState(options[0]?.value ?? "");
  const [type, setType] = useState<MaintType>("CORRECTIVE");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [assignedToId, setAssignedToId] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
    const res = await post("/api/panel/mantenimiento/ordenes", { equipmentId, type, priority, description, assignedToId: assignedToId || undefined, attachments });
    setSubmitting(false);
    if (res.ok) onDone("Orden creada"); else onError(res.error!);
  };
  return (
    <Modal title="Nueva orden de mantenimiento" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!equipmentId || !description.trim()} />}>
      <div><label className={labelCls}>Equipo</label><SimpleSelect value={equipmentId} options={options} onChange={setEquipmentId} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Tipo</label><SimpleSelect value={type} options={[{ value: "CORRECTIVE", label: "Correctivo (falla)" }, { value: "PREVENTIVE", label: "Preventivo" }]} onChange={(v) => setType(v as MaintType)} /></div>
        <div><label className={labelCls}>Prioridad</label><SimpleSelect value={priority} options={(Object.keys(PRIORITY) as Priority[]).map((p) => ({ value: p, label: PRIORITY[p].label }))} onChange={(v) => setPriority(v as Priority)} /></div>
      </div>
      <div><label className={labelCls}>Asignar a (opcional)</label><SimpleSelect value={assignedToId} options={[{ value: "", label: "—" }, ...technicians.map((t) => ({ value: t.id, label: t.fullName }))]} onChange={setAssignedToId} /></div>
      <div><label className={labelCls}>Descripción de la falla o actividad</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} /></div>
      <div><label className={labelCls}>Fotos o archivos de la falla (opcional)</label><AttachmentsField value={attachments} onChange={setAttachments} folder="ordenes" onError={onError} /></div>
    </Modal>
  );
}

function CompleteModal({ order, openedAt, onClose, onDone, onError, markLocalWrite }: ModalProps & { order: Order; openedAt: number; markLocalWrite: () => void }) {
  const elapsed = order.startedAt ? Math.max(0, Math.round((openedAt - new Date(order.startedAt).getTime()) / 60000)) : 0;
  const [resolution, setResolution] = useState("");
  const [downtime, setDowntime] = useState(String(elapsed));
  const [signedByName, setSignedByName] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [executorName, setExecutorName] = useState(order.assignedTo?.fullName ?? "");
  const [executorSignature, setExecutorSignature] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>(order.attachments ?? []);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
    const res = await patchReq(`/api/panel/mantenimiento/ordenes/${order.id}`, { action: "complete", resolution, downtimeMinutes: Number(downtime), signedByName, signatureData: signature, executorName, executorSignatureData: executorSignature, attachments });
    setSubmitting(false);
    if (res.ok) onDone(`Orden ${order.number} completada`); else onError(res.error!);
  };
  return (
    <Modal title={`Completar ${order.number}`} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!resolution.trim() || Number(downtime) < 0 || !signedByName.trim() || !signature || !executorName.trim() || !executorSignature} />}>
      <p className="text-sm text-[#64748B]">{order.equipment.name} · {order.description}</p>
      <div><label className={labelCls}>Resolución / trabajo realizado</label><textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} className={inputCls} /></div>
      <div>
        <label className={labelCls}>Tiempo muerto (minutos)</label>
        <input type="number" min={0} value={downtime} onChange={(e) => setDowntime(e.target.value)} className={inputCls} />
        <p className="mt-1 text-[11px] text-[#94A3B8]">Calculado desde el inicio de la orden ({fmtMinutes(elapsed)}); ajústalo si el equipo estuvo detenido más o menos tiempo.</p>
      </div>
      <div><label className={labelCls}>Fotos o archivos del trabajo (opcional)</label><AttachmentsField value={attachments} onChange={setAttachments} folder="ordenes" onError={onError} /></div>
      <div><label className={labelCls}>Técnico que ejecutó</label><input value={executorName} onChange={(e) => setExecutorName(e.target.value)} maxLength={120} className={inputCls} /></div>
      <div><label className={labelCls}>Firma del técnico</label><SignaturePad onChange={setExecutorSignature} /></div>
      <div><label className={labelCls}>Nombre de quien recibe</label><input value={signedByName} onChange={(e) => setSignedByName(e.target.value)} maxLength={120} className={inputCls} /></div>
      <div><label className={labelCls}>Firma de conformidad</label><SignaturePad onChange={setSignature} /></div>
    </Modal>
  );
}

function EquipmentModal({ equipment, machines, onClose, onDone, onError, markLocalWrite }: ModalProps & { equipment?: Equipment; machines: Machine[]; markLocalWrite: () => void }) {
  const editing = Boolean(equipment);
  const [type, setType] = useState<EquipmentType>(equipment?.type ?? "MACHINE");
  const [machineId, setMachineId] = useState(equipment?.machine?.id ?? "");
  const [name, setName] = useState(equipment?.name ?? "");
  const [code, setCode] = useState(equipment?.code ?? "");
  const [location, setLocation] = useState(equipment?.location ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(equipment?.imageUrl ?? null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(equipment?.attachmentUrl ?? null);
  const [attachmentName, setAttachmentName] = useState<string | null>(equipment?.attachmentName ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<"image" | "file" | null>(null);

  const pickMachine = (id: string) => {
    setMachineId(id);
    const m = machines.find((x) => x.id === id);
    if (m) { if (!name) setName(m.name); if (!code) setCode(`MAQ-${m.code}`); }
  };

  const upload = async (file: File, kind: "image" | "file") => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "equipos");
      const res = await fetch("/api/panel/mantenimiento/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { onError(json.error ?? "No fue posible subir el archivo"); return; }
      if (kind === "image") setImageUrl(json.url);
      else { setAttachmentUrl(json.url); setAttachmentName(json.name); }
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
    const payload = { name, location, imageUrl, attachmentUrl, attachmentName, type, machineId: type === "MACHINE" ? machineId || undefined : undefined };
    const res = editing
      ? await patchReq(`/api/panel/mantenimiento/equipos/${equipment!.id}`, payload)
      : await post("/api/panel/mantenimiento/equipos", { ...payload, code });
    setSubmitting(false);
    if (res.ok) onDone(editing ? "Equipo actualizado" : "Equipo registrado"); else onError(res.error!);
  };

  return (
    <Modal title={editing ? `Editar equipo — ${equipment!.code}` : "Nuevo equipo"} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting || uploading !== null} disabled={!name.trim() || !code.trim()} />}>
      {editing ? (
        <div className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm text-[#64748B]">Tipo: <b className="text-[#1A1A1A]">{EQ_TYPE[type]}</b> · Código: <b className="text-[#1A1A1A]">{code}</b></div>
      ) : (
        <>
          <div><label className={labelCls}>Tipo</label><SimpleSelect value={type} options={(Object.keys(EQ_TYPE) as EquipmentType[]).map((t) => ({ value: t, label: EQ_TYPE[t] }))} onChange={(v) => setType(v as EquipmentType)} /></div>
          {type === "MACHINE" && machines.length > 0 && (
            <div><label className={labelCls}>Vincular máquina de producción (opcional)</label><SimpleSelect value={machineId} options={[{ value: "", label: "—" }, ...machines.map((m) => ({ value: m.id, label: `#${m.code} · ${m.name} (${m.brand})` }))]} onChange={pickMachine} /></div>
          )}
        </>
      )}
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Código</label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} placeholder="MAQ-01, MOL-12…" disabled={editing} /></div>
        <div><label className={labelCls}>Ubicación (opcional)</label><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} placeholder="Planta inyección…" /></div>
      </div>
      <div><label className={labelCls}>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>

      <div>
        <label className={labelCls}>Foto de la máquina (para reconocerla)</label>
        <div className="flex items-center gap-3">
          {imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imageUrl} alt={name} className="h-16 w-16 rounded-xl border border-[#E2E8F0] object-cover" />
            : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#94A3B8]"><MdPrecisionManufacturing size={24} /></span>}
          <div className="flex flex-wrap gap-2">
            <label className={`${btnGhost} cursor-pointer`}>
              {uploading === "image" ? "Subiendo…" : imageUrl ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "image"); e.target.value = ""; }} />
            </label>
            {imageUrl && <button type="button" className={btnGhost} onClick={() => setImageUrl(null)}>Quitar</button>}
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Archivo adjunto (manual, ficha técnica…)</label>
        <div className="flex flex-wrap items-center gap-3">
          {attachmentUrl
            ? <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#27B1B8] hover:underline">📎 {attachmentName ?? "Archivo"}</a>
            : <span className="text-xs text-[#94A3B8]">Sin archivo</span>}
          <label className={`${btnGhost} cursor-pointer`}>
            {uploading === "file" ? "Subiendo…" : attachmentUrl ? "Cambiar archivo" : "Subir archivo"}
            <input type="file" className="hidden" disabled={uploading !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "file"); e.target.value = ""; }} />
          </label>
          {attachmentUrl && <button type="button" className={btnGhost} onClick={() => { setAttachmentUrl(null); setAttachmentName(null); }}>Quitar</button>}
        </div>
      </div>
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
      {(equipment.imageUrl || equipment.attachmentUrl) && (
        <div className="flex flex-wrap items-center gap-4">
          {equipment.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={equipment.imageUrl} alt={equipment.name} className="h-32 w-32 rounded-xl border border-[#E2E8F0] object-cover" />
          )}
          {equipment.attachmentUrl && (
            <a href={equipment.attachmentUrl} target="_blank" rel="noopener noreferrer" className={btnGhost}>📎 {equipment.attachmentName ?? "Archivo adjunto"}</a>
          )}
        </div>
      )}
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
              {o.attachments?.length > 0 && <div className="mt-2"><AttachmentPreview items={o.attachments} /></div>}
              {o.resolution && <p className="mt-1 text-xs text-[#15803D]"><b>Resolución:</b> {o.resolution}</p>}
              {o.executorSignatureData && (
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.executorSignatureData} alt={`Firma de ${o.executorName ?? "técnico"}`} className="h-12 rounded border border-[#E2E8F0] bg-white" />
                  <span className="text-xs text-[#64748B]">Ejecutó: <b>{o.executorName}</b></span>
                </div>
              )}
              {o.signatureData ? (
                <div className="mt-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={o.signatureData} alt={`Firma de ${o.signedByName ?? "quien recibe"}`} className="h-12 rounded border border-[#E2E8F0] bg-white" />
                  <span className="text-xs text-[#64748B]">Recibió: <b>{o.signedByName}</b>{o.signedAt && ` · ${fmtDateTime(o.signedAt)}`}</span>
                </div>
              ) : o.status === "DONE" && <p className="mt-1 text-xs text-[#94A3B8]">Sin firma</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function ItemModal({ item, onClose, onDone, onError, markLocalWrite }: ModalProps & { item?: Item; markLocalWrite: () => void }) {
  const editing = Boolean(item);
  const [category, setCategory] = useState<Item["category"]>(item?.category ?? "SPARE_PART");
  const [name, setName] = useState(item?.name ?? "");
  const [code, setCode] = useState(item?.code ?? "");
  const [stock, setStock] = useState(String(item?.stock ?? 0));
  const [minStock, setMinStock] = useState(String(item?.minStock ?? 0));
  const [unit, setUnit] = useState(item?.unit ?? "und");
  const [location, setLocation] = useState(item?.location ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(item?.imageUrl ?? null);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(item?.attachmentUrl ?? null);
  const [attachmentName, setAttachmentName] = useState<string | null>(item?.attachmentName ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState<"image" | "file" | null>(null);

  const upload = async (file: File, kind: "image" | "file") => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", "inventario");
      const res = await fetch("/api/panel/mantenimiento/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) { onError(json.error ?? "No fue posible subir el archivo"); return; }
      if (kind === "image") setImageUrl(json.url);
      else { setAttachmentUrl(json.url); setAttachmentName(json.name); }
    } finally {
      setUploading(null);
    }
  };

  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
    const res = editing
      ? await patchReq(`/api/panel/mantenimiento/inventario/${item!.id}`, { name, minStock: Number(minStock), location, imageUrl, attachmentUrl, attachmentName })
      : await post("/api/panel/mantenimiento/inventario", { name, code, category, stock: Number(stock), minStock: Number(minStock), unit, location, imageUrl, attachmentUrl, attachmentName });
    setSubmitting(false);
    if (res.ok) onDone(editing ? "Ítem actualizado" : "Ítem registrado"); else onError(res.error!);
  };

  return (
    <Modal title={editing ? `Editar ítem — ${item!.code}` : "Nuevo repuesto o herramienta"} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting || uploading !== null} disabled={!name.trim() || !code.trim()} />}>
      {editing ? (
        <div className="rounded-xl bg-[#F8FAFC] px-3 py-2 text-sm text-[#64748B]">Categoría: <b className="text-[#1A1A1A]">{category === "TOOL" ? "Herramienta" : "Repuesto"}</b> · Código: <b className="text-[#1A1A1A]">{code}</b> · Stock: <b className="text-[#1A1A1A]">{stock} {unit}</b></div>
      ) : (
        <>
          <div><label className={labelCls}>Categoría</label><SimpleSelect value={category} options={[{ value: "SPARE_PART", label: "Repuesto" }, { value: "TOOL", label: "Herramienta" }]} onChange={(v) => setCategory(v as Item["category"])} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>Código</label><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} className={inputCls} /></div>
            <div><label className={labelCls}>Unidad</label><input value={unit} onChange={(e) => setUnit(e.target.value)} className={inputCls} /></div>
          </div>
        </>
      )}
      <div><label className={labelCls}>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
      {!editing && (
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelCls}>Stock inicial</label><input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} className={inputCls} /></div>
          <div><label className={labelCls}>Stock mínimo</label><input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} className={inputCls} /></div>
        </div>
      )}
      {editing && (
        <div><label className={labelCls}>Stock mínimo</label><input type="number" min={0} value={minStock} onChange={(e) => setMinStock(e.target.value)} className={inputCls} /></div>
      )}
      <div><label className={labelCls}>Ubicación (opcional)</label><input value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} /></div>

      <div>
        <label className={labelCls}>Foto del repuesto o herramienta (opcional)</label>
        <div className="flex items-center gap-3">
          {imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imageUrl} alt={name} className="h-16 w-16 rounded-xl border border-[#E2E8F0] object-cover" />
            : <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#94A3B8]"><MdInventory size={24} /></span>}
          <div className="flex flex-wrap gap-2">
            <label className={`${btnGhost} cursor-pointer`}>
              {uploading === "image" ? "Subiendo…" : imageUrl ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "image"); e.target.value = ""; }} />
            </label>
            {imageUrl && <button type="button" className={btnGhost} onClick={() => setImageUrl(null)}>Quitar</button>}
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Archivo adjunto (ficha técnica, opcional)</label>
        <div className="flex flex-wrap items-center gap-3">
          {attachmentUrl
            ? <a href={attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#27B1B8] hover:underline">📎 {attachmentName ?? "Archivo"}</a>
            : <span className="text-xs text-[#94A3B8]">Sin archivo</span>}
          <label className={`${btnGhost} cursor-pointer`}>
            {uploading === "file" ? "Subiendo…" : attachmentUrl ? "Cambiar archivo" : "Subir archivo"}
            <input type="file" className="hidden" disabled={uploading !== null} onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f, "file"); e.target.value = ""; }} />
          </label>
          {attachmentUrl && <button type="button" className={btnGhost} onClick={() => { setAttachmentUrl(null); setAttachmentName(null); }}>Quitar</button>}
        </div>
      </div>
    </Modal>
  );
}

function AdjustModal({ item, sign, onClose, onDone, onError, markLocalWrite }: ModalProps & { item: Item; sign: 1 | -1; markLocalWrite: () => void }) {
  const [qty, setQty] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
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

function QuoteModal({ orders, onClose, onDone, onError, markLocalWrite }: ModalProps & { orders: Order[]; markLocalWrite: () => void }) {
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [maintenanceOrderId, setMaintenanceOrderId] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    markLocalWrite();
    const res = await post("/api/panel/mantenimiento/cotizaciones", { supplier, description, amount: Number(amount), maintenanceOrderId: maintenanceOrderId || undefined, attachments });
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
      <div><label className={labelCls}>Cotización del proveedor o fotos (opcional)</label><AttachmentsField value={attachments} onChange={setAttachments} folder="cotizaciones" onError={onError} /></div>
    </Modal>
  );
}

function ReportModal({ from, to, kpis, onClose, onDone, onError }: ModalProps & { from: string; to: string; kpis: Kpis }) {
  const [periodStart, setPeriodStart] = useState(from);
  const [periodEnd, setPeriodEnd] = useState(to);
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/operaciones/informes", {
      module: "MODULE_MANTENIMIENTO",
      periodStart,
      periodEnd,
      notes,
      attachments,
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
      <div><label className={labelCls}>Soportes del informe (fotos o archivos, opcional)</label><AttachmentsField value={attachments} onChange={setAttachments} folder="informes" onError={onError} /></div>
    </Modal>
  );
}
