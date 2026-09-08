"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdAdd, MdLocalShipping, MdAttachMoney, MdReportProblem, MdDirectionsCar, MdTwoWheeler,
  MdAssignment, MdClose, MdDelete, MdCheckCircle, MdPerson, MdRoute,
} from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";
import {
  COP, fmtDate, todayBogota, inputCls, labelCls, btnPrimary, btnGhost,
  type Permission, type ModalProps, post, patchReq,
  Kpi, Section, Empty, Table, Modal, Footer, Stat, Tabs, DateRange,
} from "../_components/ops-ui";

type Driver = { id: string; fullName: string; phone: string | null; active: boolean };
type Vehicle = { id: string; plate: string; type: "CAMIONETA" | "MOTO"; active: boolean };
type RouteStatus = "PLANNED" | "IN_PROGRESS" | "DONE";
type OrderLite = {
  id: string;
  customerName: string;
  customerPhone: string;
  city: string;
  department: string;
  addressLine1: string;
  shippingStatus: "PENDING" | "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  totalItems: number;
  subtotal: number;
  createdAt: string;
};
type Route = {
  id: string;
  date: string;
  status: RouteStatus;
  notes: string | null;
  vehicle: Vehicle;
  driver: Driver;
  createdBy: { fullName: string };
  orders: OrderLite[];
};
type CostCategory = "COMBUSTIBLE" | "MANTENIMIENTO" | "PEAJES" | "OTRO";
type Cost = { id: string; date: string; category: CostCategory; amount: number; notes: string | null; vehicle: Vehicle; createdBy: { fullName: string } };
type Incident = {
  id: string;
  date: string;
  type: string;
  description: string;
  correctiveAction: string | null;
  status: "OPEN" | "RESOLVED";
  vehicle: Vehicle | null;
  driver: Driver | null;
  createdBy: { fullName: string };
};
type Kpis = {
  routesTotal: number;
  routesDone: number;
  ordersTotal: number;
  ordersDelivered: number;
  costTotal: number;
  costByVehicle: { vehicleId: string; amount: number }[];
  openIncidents: number;
};
type Report = {
  id: string;
  periodStart: string;
  periodEnd: string;
  kpis: Record<string, number | string>;
  notes: string | null;
  createdAt: string;
  author: { fullName: string };
};
type Data = {
  drivers: Driver[];
  vehicles: Vehicle[];
  routes: Route[];
  assignableOrders: OrderLite[];
  costs: Cost[];
  incidents: Incident[];
  kpis: Kpis;
  permission: Permission;
};

type Tab = "rutas" | "costos" | "novedades" | "flota" | "informes";
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "rutas", label: "Rutas", icon: <MdRoute size={16} /> },
  { key: "costos", label: "Costos", icon: <MdAttachMoney size={16} /> },
  { key: "novedades", label: "Novedades", icon: <MdReportProblem size={16} /> },
  { key: "flota", label: "Flota", icon: <MdDirectionsCar size={16} /> },
  { key: "informes", label: "Informes", icon: <MdAssignment size={16} /> },
];

const ROUTE_STATUS: Record<RouteStatus, { label: string; cls: string }> = {
  PLANNED: { label: "Planificada", cls: "bg-[#F1F5F9] text-[#64748B]" },
  IN_PROGRESS: { label: "En curso", cls: "bg-[#EFF6FF] text-[#1D4ED8]" },
  DONE: { label: "Finalizada", cls: "bg-[#DCFCE7] text-[#15803D]" },
};
const SHIPPING_LABEL: Record<OrderLite["shippingStatus"], string> = {
  PENDING: "Pendiente",
  PREPARING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};
const COST_LABEL: Record<CostCategory, string> = {
  COMBUSTIBLE: "Combustible",
  MANTENIMIENTO: "Mantenimiento",
  PEAJES: "Peajes",
  OTRO: "Otro",
};

function vehicleLabel(v: Vehicle) {
  return `${v.type === "MOTO" ? "Moto" : "Camioneta"} · ${v.plate}`;
}

export default function LogisticaPanel() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("rutas");
  const [from, setFrom] = useState(todayBogota(-14));
  const [to, setTo] = useState(todayBogota());
  const [data, setData] = useState<Data | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [modal, setModal] = useState<
    | { kind: "route" }
    | { kind: "assign"; route: Route }
    | { kind: "cost" }
    | { kind: "incident" }
    | { kind: "vehicle" }
    | { kind: "driver" }
    | { kind: "report" }
    | null
  >(null);

  const load = useCallback(async () => {
    const [r, rr] = await Promise.all([
      fetch(`/api/panel/logistica?from=${from}&to=${to}`),
      fetch("/api/panel/operaciones/informes?module=MODULE_LOGISTICA"),
    ]);
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    if (!r.ok) { setAlert({ type: "err", msg: (await r.json()).error ?? "Error al cargar" }); setLoading(false); return; }
    setData(await r.json());
    if (rr.ok) setReports((await rr.json()).reports);
    setLoading(false);
  }, [from, to, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  const perm = data?.permission ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const done = (msg: string) => { setModal(null); setAlert({ type: "ok", msg }); load(); };
  const fail = (msg: string) => setAlert({ type: "err", msg });

  async function patch(url: string, body: unknown, okMsg: string) {
    const r = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (r.ok) { setAlert({ type: "ok", msg: okMsg }); load(); } else fail((await r.json()).error ?? "Error");
  }
  async function del(url: string, okMsg: string) {
    const r = await fetch(url, { method: "DELETE" });
    if (r.ok) { setAlert({ type: "ok", msg: okMsg }); load(); } else fail((await r.json()).error ?? "Error");
  }

  const activeVehicles = useMemo(() => (data?.vehicles ?? []).filter((v) => v.active), [data]);
  const activeDrivers = useMemo(() => (data?.drivers ?? []).filter((d) => d.active), [data]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Logística</h1>
          <p className="mt-1 text-sm text-[#64748B]">Rutas de distribución, costos de transporte, novedades e informe quincenal.</p>
        </div>
        <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />
      </div>

      {alert && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
          {alert.msg}
        </div>
      )}

      {data && (
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi icon={<MdRoute size={18} />} label="Rutas finalizadas" value={`${data.kpis.routesDone} / ${data.kpis.routesTotal}`} color="#27B1B8" />
          <Kpi icon={<MdLocalShipping size={18} />} label="Pedidos entregados" value={`${data.kpis.ordersDelivered} / ${data.kpis.ordersTotal}`} color="#7C6CE0" />
          <Kpi icon={<MdAttachMoney size={18} />} label="Costo transporte" value={COP.format(data.kpis.costTotal)} color="#F0A73C" />
          <Kpi icon={<MdReportProblem size={18} />} label="Novedades abiertas" value={String(data.kpis.openIncidents)} color="#DC2626" />
        </div>
      )}

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {loading || !data ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : (
        <>
          {tab === "rutas" && (
            <Section
              title="Rutas de distribución"
              action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "route" })}><MdAdd size={16} />Nueva ruta</button>}
            >
              {data.routes.length === 0 && <Empty text="Sin rutas en este período." />}
              <div className="space-y-3">
                {data.routes.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-[#1A1A1A]">{fmtDate(r.date)}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${ROUTE_STATUS[r.status].cls}`}>{ROUTE_STATUS[r.status].label}</span>
                        </div>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B]">
                          <span className="inline-flex items-center gap-1">{r.vehicle.type === "MOTO" ? <MdTwoWheeler size={14} /> : <MdDirectionsCar size={14} />}{vehicleLabel(r.vehicle)}</span>
                          <span className="inline-flex items-center gap-1"><MdPerson size={14} />{r.driver.fullName}</span>
                          <span>{r.orders.length} pedido{r.orders.length === 1 ? "" : "s"}</span>
                        </p>
                        {r.notes && <p className="mt-1 text-xs text-[#94A3B8]">{r.notes}</p>}
                      </div>
                      {perm.canEdit && (
                        <div className="flex flex-wrap gap-2">
                          {r.status === "PLANNED" && <button className={btnGhost} onClick={() => patch(`/api/panel/logistica/rutas/${r.id}`, { status: "IN_PROGRESS" }, "Ruta iniciada")}>Iniciar</button>}
                          {r.status === "IN_PROGRESS" && <button className={btnPrimary} onClick={() => patch(`/api/panel/logistica/rutas/${r.id}`, { status: "DONE" }, "Ruta finalizada")}><MdCheckCircle size={16} />Finalizar</button>}
                          {r.status !== "DONE" && <button className={btnGhost} onClick={() => setModal({ kind: "assign", route: r })}><MdAdd size={16} />Pedidos</button>}
                          {perm.canDelete && r.status === "PLANNED" && (
                            <button className="inline-flex items-center rounded-xl border border-[#FEE2E2] px-2.5 py-2 text-[#DC2626] hover:bg-[#FEF2F2]" onClick={() => del(`/api/panel/logistica/rutas/${r.id}`, "Ruta eliminada")} aria-label="Eliminar ruta"><MdDelete size={16} /></button>
                          )}
                        </div>
                      )}
                    </div>
                    {r.orders.length > 0 && (
                      <div className="mt-3 overflow-x-auto">
                        <table className="w-full min-w-[560px] text-xs">
                          <thead className="text-left font-bold uppercase tracking-wide text-[#94A3B8]">
                            <tr><th className="py-1.5 pr-3">Cliente</th><th className="py-1.5 pr-3">Ciudad</th><th className="py-1.5 pr-3">Dirección</th><th className="py-1.5 pr-3">Ítems</th><th className="py-1.5 pr-3">Estado</th>{perm.canEdit && r.status !== "DONE" && <th />}</tr>
                          </thead>
                          <tbody>
                            {r.orders.map((o) => (
                              <tr key={o.id} className="border-t border-[#F1F5F9]">
                                <td className="py-1.5 pr-3 font-semibold text-[#1A1A1A]">{o.customerName}<span className="block text-[10px] font-normal text-[#94A3B8]">{o.customerPhone}</span></td>
                                <td className="py-1.5 pr-3 text-[#64748B]">{o.city}</td>
                                <td className="py-1.5 pr-3 text-[#64748B]">{o.addressLine1}</td>
                                <td className="py-1.5 pr-3">{o.totalItems}</td>
                                <td className="py-1.5 pr-3">{SHIPPING_LABEL[o.shippingStatus]}</td>
                                {perm.canEdit && r.status !== "DONE" && (
                                  <td className="py-1.5 text-right"><button className="text-[#94A3B8] hover:text-[#DC2626]" onClick={() => patch(`/api/panel/logistica/rutas/${r.id}`, { removeOrderId: o.id }, "Pedido quitado de la ruta")} aria-label="Quitar pedido"><MdClose size={14} /></button></td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {tab === "costos" && (
            <Section
              title="Costos de transporte"
              action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "cost" })}><MdAdd size={16} />Registrar costo</button>}
            >
              {data.kpis.costByVehicle.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {data.kpis.costByVehicle.map((c) => {
                    const v = data.vehicles.find((x) => x.id === c.vehicleId);
                    return <span key={c.vehicleId} className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-bold text-[#C2410C]">{v ? vehicleLabel(v) : "—"}: {COP.format(c.amount)}</span>;
                  })}
                </div>
              )}
              <Table
                head={["Fecha", "Vehículo", "Categoría", "Monto", "Nota", "Registró", perm.canDelete ? "" : null]}
                rows={data.costs.map((c) => [
                  fmtDate(c.date), vehicleLabel(c.vehicle), COST_LABEL[c.category], <b key="a">{COP.format(c.amount)}</b>, c.notes ?? "—", c.createdBy.fullName,
                  perm.canDelete ? <button key="d" className="text-[#94A3B8] hover:text-[#DC2626]" onClick={() => del(`/api/panel/logistica/costos/${c.id}`, "Costo eliminado")} aria-label="Eliminar"><MdDelete size={16} /></button> : null,
                ])}
                empty="Sin costos en este período."
              />
            </Section>
          )}

          {tab === "novedades" && (
            <Section
              title="Novedades de transporte"
              action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "incident" })}><MdAdd size={16} />Nueva novedad</button>}
            >
              {data.incidents.length === 0 && <Empty text="Sin novedades en este período." />}
              <div className="space-y-3">
                {data.incidents.map((i) => (
                  <div key={i.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-black text-[#1A1A1A]">{i.type}</p>
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${i.status === "OPEN" ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#DCFCE7] text-[#15803D]"}`}>{i.status === "OPEN" ? "Abierta" : "Resuelta"}</span>
                        </div>
                        <p className="mt-1 text-xs text-[#64748B]">{fmtDate(i.date)}{i.vehicle ? ` · ${vehicleLabel(i.vehicle)}` : ""}{i.driver ? ` · ${i.driver.fullName}` : ""} · {i.createdBy.fullName}</p>
                        <p className="mt-2 text-sm text-[#1A1A1A]">{i.description}</p>
                        {i.correctiveAction && <p className="mt-1 text-xs text-[#15803D]"><b>Acción correctiva:</b> {i.correctiveAction}</p>}
                      </div>
                      {perm.canEdit && i.status === "OPEN" && (
                        <ResolveIncident onResolve={(action) => patch(`/api/panel/logistica/novedades/${i.id}`, { status: "RESOLVED", correctiveAction: action || i.correctiveAction }, "Novedad resuelta")} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {tab === "flota" && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Section title="Vehículos" action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "vehicle" })}><MdAdd size={16} />Vehículo</button>}>
                <Table
                  head={["Placa", "Tipo", "Estado", perm.canEdit ? "" : null]}
                  rows={data.vehicles.map((v) => [
                    <b key="p">{v.plate}</b>, v.type === "MOTO" ? "Moto" : "Camioneta",
                    <span key="s" className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${v.active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{v.active ? "Activo" : "Inactivo"}</span>,
                    perm.canEdit ? <button key="t" className="text-xs font-bold text-[#27B1B8]" onClick={() => patch(`/api/panel/logistica/vehiculos/${v.id}`, { active: !v.active }, v.active ? "Vehículo desactivado" : "Vehículo activado")}>{v.active ? "Desactivar" : "Activar"}</button> : null,
                  ])}
                  empty="Sin vehículos. Registra la camioneta y la moto."
                />
              </Section>
              <Section title="Conductores" action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "driver" })}><MdAdd size={16} />Conductor</button>}>
                <Table
                  head={["Nombre", "Teléfono", "Estado", perm.canEdit ? "" : null]}
                  rows={data.drivers.map((d) => [
                    <b key="n">{d.fullName}</b>, d.phone ?? "—",
                    <span key="s" className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${d.active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{d.active ? "Activo" : "Inactivo"}</span>,
                    perm.canEdit ? <button key="t" className="text-xs font-bold text-[#27B1B8]" onClick={() => patch(`/api/panel/logistica/conductores/${d.id}`, { active: !d.active }, d.active ? "Conductor desactivado" : "Conductor activado")}>{d.active ? "Desactivar" : "Activar"}</button> : null,
                  ])}
                  empty="Sin conductores registrados."
                />
              </Section>
            </div>
          )}

          {tab === "informes" && (
            <Section
              title="Informes quincenales al Jefe de Operaciones"
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
                      {Object.keys(REPORT_KPI_LABELS).filter((k) => k in rep.kpis).map((k) => [k, rep.kpis[k]] as const).map(([k, v]) => (
                        <div key={k} className="rounded-xl bg-[#F8FAFC] px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{REPORT_KPI_LABELS[k] ?? k}</p>
                          <p className="text-sm font-black text-[#1A1A1A]">{k === "costoTotal" && typeof v === "number" ? COP.format(v) : String(v)}</p>
                        </div>
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

      {modal?.kind === "route" && data && (
        <RouteModal vehicles={activeVehicles} drivers={activeDrivers} orders={data.assignableOrders} onClose={() => setModal(null)} onDone={done} onError={fail} />
      )}
      {modal?.kind === "assign" && data && (
        <AssignModal route={modal.route} orders={data.assignableOrders} onClose={() => setModal(null)} onDone={done} onError={fail} />
      )}
      {modal?.kind === "cost" && <CostModal vehicles={activeVehicles} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "incident" && <IncidentModal vehicles={activeVehicles} drivers={activeDrivers} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "vehicle" && <VehicleModal onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "driver" && <DriverModal onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "report" && data && <ReportModal from={from} to={to} kpis={data.kpis} onClose={() => setModal(null)} onDone={done} onError={fail} />}
    </div>
  );
}

const REPORT_KPI_LABELS: Record<string, string> = {
  rutasTotal: "Rutas",
  rutasFinalizadas: "Rutas finalizadas",
  pedidosEnRuta: "Pedidos en ruta",
  pedidosEntregados: "Entregados",
  costoTotal: "Costo transporte",
  novedadesAbiertas: "Novedades abiertas",
};

function OrderPicker({ orders, selected, onToggle }: { orders: OrderLite[]; selected: Set<string>; onToggle: (id: string) => void }) {
  const [q, setQ] = useState("");
  const list = orders.filter((o) => `${o.customerName} ${o.city} ${o.addressLine1}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <label className={labelCls}>Pedidos a incluir ({selected.size})</label>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, ciudad o dirección…" className={`${inputCls} mb-2`} />
      <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[#E2E8F0] p-2">
        {list.length === 0 && <p className="py-4 text-center text-xs text-[#94A3B8]">Sin pedidos pendientes de ruta.</p>}
        {list.map((o) => (
          <label key={o.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-[#F8FAFC]">
            <input type="checkbox" checked={selected.has(o.id)} onChange={() => onToggle(o.id)} className="mt-0.5" />
            <span className="min-w-0 text-xs">
              <b className="text-[#1A1A1A]">{o.customerName}</b> · {o.city} · {o.totalItems} ítem{o.totalItems === 1 ? "" : "s"}
              <span className="block text-[#94A3B8]">{o.addressLine1} · {SHIPPING_LABEL[o.shippingStatus]}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function RouteModal({ vehicles, drivers, orders, onClose, onDone, onError }: ModalProps & { vehicles: Vehicle[]; drivers: Driver[]; orders: OrderLite[] }) {
  const [date, setDate] = useState(todayBogota());
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [driverId, setDriverId] = useState(drivers[0]?.id ?? "");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/logistica/rutas", { date, vehicleId, driverId, notes, orderIds: [...selected] });
    setSubmitting(false);
    if (res.ok) onDone("Ruta creada"); else onError(res.error!);
  };

  const missingFleet = vehicles.length === 0 || drivers.length === 0;

  return (
    <Modal title="Nueva ruta de distribución" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={missingFleet || !vehicleId || !driverId} />}>
      {missingFleet && <p className="rounded-xl bg-[#FEF3C7] px-3 py-2 text-xs font-semibold text-[#B45309]">Registra al menos un vehículo y un conductor activos en la pestaña Flota.</p>}
      <div><label className={labelCls}>Fecha</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Vehículo</label><SimpleSelect value={vehicleId} options={vehicles.map((v) => ({ value: v.id, label: vehicleLabel(v) }))} onChange={setVehicleId} /></div>
      <div><label className={labelCls}>Conductor</label><SimpleSelect value={driverId} options={drivers.map((d) => ({ value: d.id, label: d.fullName }))} onChange={setDriverId} /></div>
      <OrderPicker orders={orders} selected={selected} onToggle={toggle} />
      <div><label className={labelCls}>Notas (opcional)</label><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} placeholder="Zona, horario, observaciones…" /></div>
    </Modal>
  );
}

function AssignModal({ route, orders, onClose, onDone, onError }: ModalProps & { route: Route; orders: OrderLite[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const submit = async () => {
    setSubmitting(true);
    const res = await patchReq(`/api/panel/logistica/rutas/${route.id}`, { addOrderIds: [...selected] });
    setSubmitting(false);
    if (res.ok) onDone("Pedidos agregados a la ruta"); else onError(res.error!);
  };
  return (
    <Modal title={`Agregar pedidos — ruta ${fmtDate(route.date)}`} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={selected.size === 0} />}>
      <OrderPicker orders={orders} selected={selected} onToggle={toggle} />
    </Modal>
  );
}

function CostModal({ vehicles, onClose, onDone, onError }: ModalProps & { vehicles: Vehicle[] }) {
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? "");
  const [date, setDate] = useState(todayBogota());
  const [category, setCategory] = useState<CostCategory>("COMBUSTIBLE");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/logistica/costos", { vehicleId, date, category, amount: Number(amount), notes });
    setSubmitting(false);
    if (res.ok) onDone("Costo registrado"); else onError(res.error!);
  };
  return (
    <Modal title="Registrar costo de transporte" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!vehicleId || Number(amount) <= 0} />}>
      {vehicles.length === 0 && <p className="rounded-xl bg-[#FEF3C7] px-3 py-2 text-xs font-semibold text-[#B45309]">Registra un vehículo activo primero.</p>}
      <div><label className={labelCls}>Vehículo</label><SimpleSelect value={vehicleId} options={vehicles.map((v) => ({ value: v.id, label: vehicleLabel(v) }))} onChange={setVehicleId} /></div>
      <div><label className={labelCls}>Fecha</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Categoría</label><SimpleSelect value={category} options={(Object.keys(COST_LABEL) as CostCategory[]).map((c) => ({ value: c, label: COST_LABEL[c] }))} onChange={(v) => setCategory(v as CostCategory)} /></div>
      <div><label className={labelCls}>Monto (COP)</label><input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Nota (opcional)</label><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
    </Modal>
  );
}

function IncidentModal({ vehicles, drivers, onClose, onDone, onError }: ModalProps & { vehicles: Vehicle[]; drivers: Driver[] }) {
  const [date, setDate] = useState(todayBogota());
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [correctiveAction, setCorrectiveAction] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/logistica/novedades", { date, type, description, correctiveAction, vehicleId: vehicleId || undefined, driverId: driverId || undefined });
    setSubmitting(false);
    if (res.ok) onDone("Novedad registrada"); else onError(res.error!);
  };
  return (
    <Modal title="Nueva novedad de transporte" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!type.trim() || !description.trim()} />}>
      <div><label className={labelCls}>Fecha</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Tipo</label><input value={type} onChange={(e) => setType(e.target.value)} className={inputCls} placeholder="Retraso, daño de mercancía, impuntualidad, presentación…" /></div>
      <div><label className={labelCls}>Descripción</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputCls} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Vehículo (opcional)</label><SimpleSelect value={vehicleId} options={[{ value: "", label: "—" }, ...vehicles.map((v) => ({ value: v.id, label: vehicleLabel(v) }))]} onChange={setVehicleId} /></div>
        <div><label className={labelCls}>Conductor (opcional)</label><SimpleSelect value={driverId} options={[{ value: "", label: "—" }, ...drivers.map((d) => ({ value: d.id, label: d.fullName }))]} onChange={setDriverId} /></div>
      </div>
      <div><label className={labelCls}>Acción correctiva (opcional)</label><input value={correctiveAction} onChange={(e) => setCorrectiveAction(e.target.value)} className={inputCls} /></div>
    </Modal>
  );
}

function ResolveIncident({ onResolve }: { onResolve: (action: string) => void }) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("");
  if (!open) return <button className={btnGhost} onClick={() => setOpen(true)}><MdCheckCircle size={16} />Resolver</button>;
  return (
    <div className="flex w-full flex-col gap-2 sm:w-72">
      <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Acción correctiva ejecutada" className={inputCls} />
      <div className="flex gap-2">
        <button className={btnGhost} onClick={() => setOpen(false)}>Cancelar</button>
        <button className={btnPrimary} onClick={() => onResolve(action.trim())}>Marcar resuelta</button>
      </div>
    </div>
  );
}

function VehicleModal({ onClose, onDone, onError }: ModalProps) {
  const [plate, setPlate] = useState("");
  const [type, setType] = useState<Vehicle["type"]>("CAMIONETA");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/logistica/vehiculos", { plate, type });
    setSubmitting(false);
    if (res.ok) onDone("Vehículo registrado"); else onError(res.error!);
  };
  return (
    <Modal title="Nuevo vehículo" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!plate.trim()} />}>
      <div><label className={labelCls}>Placa</label><input value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase())} className={inputCls} placeholder="ABC123" /></div>
      <div><label className={labelCls}>Tipo</label><SimpleSelect value={type} options={[{ value: "CAMIONETA", label: "Camioneta" }, { value: "MOTO", label: "Moto" }]} onChange={(v) => setType(v as Vehicle["type"])} /></div>
    </Modal>
  );
}

function DriverModal({ onClose, onDone, onError }: ModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/logistica/conductores", { fullName, phone });
    setSubmitting(false);
    if (res.ok) onDone("Conductor registrado"); else onError(res.error!);
  };
  return (
    <Modal title="Nuevo conductor" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!fullName.trim()} />}>
      <div><label className={labelCls}>Nombre completo</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Teléfono (opcional)</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></div>
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
      module: "MODULE_LOGISTICA",
      periodStart,
      periodEnd,
      notes,
    });
    setSubmitting(false);
    if (res.ok) onDone("Informe presentado"); else onError(res.error!);
  };
  return (
    <Modal title="Presentar informe quincenal" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={periodEnd < periodStart} />}>
      <p className="text-xs text-[#64748B]">Los indicadores se toman de los datos reales del período seleccionado arriba (cambia las fechas del panel para ajustar el período).</p>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Desde</label><input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Hasta</label><input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className={inputCls} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-3">
        <Stat label="Rutas" value={`${kpis.routesDone} / ${kpis.routesTotal}`} />
        <Stat label="Pedidos entregados" value={`${kpis.ordersDelivered} / ${kpis.ordersTotal}`} />
        <Stat label="Costo transporte" value={COP.format(kpis.costTotal)} />
        <Stat label="Novedades abiertas" value={String(kpis.openIncidents)} />
      </div>
      <div><label className={labelCls}>Novedades y plan de acción</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={5} className={inputCls} placeholder="Resumen de novedades del período y acciones propuestas…" /></div>
    </Modal>
  );
}
