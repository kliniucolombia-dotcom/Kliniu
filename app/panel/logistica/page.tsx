"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MdAdd, MdLocalShipping, MdAttachMoney, MdReportProblem, MdDirectionsCar, MdTwoWheeler, MdAirportShuttle,
  MdAssignment, MdClose, MdDelete, MdCheckCircle, MdPerson, MdRoute,
  MdCalendarMonth, MdChevronLeft, MdChevronRight, MdPlace,
  MdBuild, MdControlCamera, MdVerticalAlignCenter, MdSecurity, MdInventory2,
  MdElectricBolt, MdLocalGasStation, MdCable, MdLuggage, MdRemoveRedEye, MdWarningAmber,
} from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";
import { useConfirm } from "@/app/components/confirm-dialog";
import {
  COP, fmtDate, todayBogota, inputCls, labelCls, btnPrimary, btnGhost,
  type Permission, type ModalProps, post, patchReq,
  Kpi, Section, Empty, Table, Modal, Footer, Stat, Tabs, DateRange,
} from "../_components/ops-ui";

type Driver = { id: string; fullName: string; phone: string | null; active: boolean };
type VehicleType = "CAMIONETA" | "MOTO" | "FURGON" | "CAMION";
type Vehicle = {
  id: string; plate: string; type: VehicleType; active: boolean;
  soatDue: string | null; technicalReviewDue: string | null; policyDue: string | null;
  operationCardDue: string | null; extinguisherDue: string | null;
};
type ChecklistStatus = "B" | "M" | "NA";
type ChecklistItem = { key: string; category: string; label: string };
type ChecklistEntry = {
  id: string; vehicleId: string; driverId: string; date: string;
  items: Record<string, ChecklistStatus>; initials: string | null; notes: string | null;
  driver: Driver;
};
const CHECKLIST_TEMPLATE_MOTO: ChecklistItem[] = [
  { key: "frenos_funcionamiento", category: "Frenos y llantas", label: "Funcionamiento adecuado de frenos" },
  { key: "llantas_presion", category: "Frenos y llantas", label: "Presión, estado general de llantas" },
  { key: "luces", category: "Frenos y llantas", label: "Luces delanteras/traseras" },
  { key: "direccion_manillar", category: "Dirección y espejos", label: "Dirección/manillar y espejos" },
  { key: "niveles_fluidos", category: "Dirección y espejos", label: "Niveles de fluidos" },
  { key: "cadena_transmision", category: "Dirección y espejos", label: "Cadena/transmisión" },
  { key: "suspension", category: "Suspensión", label: "Suspensión delantera y trasera" },
  { key: "casco", category: "Protección conductor", label: "Casco de seguridad" },
  { key: "elementos_prevencion", category: "Protección conductor", label: "Elementos de prevención" },
  { key: "carga_asegurada", category: "Carga", label: "Carga asegurada" },
];
const CHECKLIST_TEMPLATE_VEHICULO: ChecklistItem[] = [
  { key: "frenos_liquido", category: "Frenos", label: "Nivel y líquido de frenos" },
  { key: "frenos_pastillas", category: "Frenos", label: "Grosor de pastillas / bandas" },
  { key: "llantas_presion", category: "Llantas y ruedas", label: "Presión de aire" },
  { key: "llantas_labrado", category: "Llantas y ruedas", label: "Profundidad de labrado" },
  { key: "llantas_rines", category: "Llantas y ruedas", label: "Estado de rines" },
  { key: "aceite", category: "Fluidos y motor", label: "Nivel y estado de aceite" },
  { key: "fugas_carter", category: "Fluidos y motor", label: "Fugas en cárter o empaques" },
  { key: "refrigerante", category: "Fluidos y motor", label: "Nivel de refrigerante" },
  { key: "luces_altas_bajas", category: "Sistema eléctrico", label: "Luces altas/bajas y direccionales" },
  { key: "luz_freno", category: "Sistema eléctrico", label: "Luz de freno" },
  { key: "pito", category: "Sistema eléctrico", label: "Pito / bocina" },
  { key: "bateria", category: "Sistema eléctrico", label: "Batería (bornes y sulfatación)" },
  { key: "fugas_barras", category: "Suspensión y dirección", label: "Fugas de aceite en barras" },
  { key: "copa_direccion", category: "Suspensión y dirección", label: "Juego en la copa de dirección" },
  { key: "amortiguacion", category: "Suspensión y dirección", label: "Amortiguación trasera" },
  { key: "acelerador", category: "Comandos y cables", label: "Juego libre del acelerador" },
  { key: "embrague", category: "Comandos y cables", label: "Recorrido del embrague" },
  { key: "guayas", category: "Comandos y cables", label: "Estado general de guayas" },
  { key: "botiquin", category: "Equipo de carretera", label: "Botiquín y linterna" },
  { key: "herramientas", category: "Equipo de carretera", label: "Herramientas" },
  { key: "kit_carretera", category: "Equipo de carretera", label: "Kit de carretera / señales" },
  { key: "extintor", category: "Equipo de carretera", label: "Extintor" },
  { key: "espejos", category: "Espejos y otros", label: "Espejos laterales y retrovisor" },
  { key: "filtros", category: "Espejos y otros", label: "Filtros (aire / combustible)" },
];
function checklistTemplateFor(type: VehicleType): ChecklistItem[] {
  return type === "MOTO" ? CHECKLIST_TEMPLATE_MOTO : CHECKLIST_TEMPLATE_VEHICULO;
}
const CATEGORY_ICON: Record<string, typeof MdBuild> = {
  "Frenos y llantas": MdBuild, "Frenos": MdBuild,
  "Dirección y espejos": MdControlCamera, "Suspensión y dirección": MdControlCamera,
  "Suspensión": MdVerticalAlignCenter,
  "Protección conductor": MdSecurity,
  "Carga": MdInventory2,
  "Llantas y ruedas": MdBuild,
  "Fluidos y motor": MdLocalGasStation,
  "Sistema eléctrico": MdElectricBolt,
  "Comandos y cables": MdCable,
  "Equipo de carretera": MdLuggage,
  "Espejos y otros": MdRemoveRedEye,
};
const DOW_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
function dowShort(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return DOW_SHORT[(new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7];
}
function isWeekend(iso: string) {
  const label = dowShort(iso);
  return label === "Sáb" || label === "Dom";
}
const STATUS_CELL: Record<ChecklistStatus, { bg: string; border: string; text: string; label: string }> = {
  B: { bg: "#DCFCE7", border: "#BBF7D0", text: "#15803D", label: "B" },
  M: { bg: "#FEE2E2", border: "#FCA5A5", text: "#DC2626", label: "M" },
  NA: { bg: "#F1F5F9", border: "#E2E8F0", text: "#64748B", label: "NA" },
};
const DUE_FIELDS: { key: keyof Vehicle; label: string }[] = [
  { key: "soatDue", label: "SOAT" },
  { key: "technicalReviewDue", label: "Revisión técnico-mecánica" },
  { key: "policyDue", label: "Póliza de responsabilidad" },
  { key: "operationCardDue", label: "Tarjeta de operación" },
  { key: "extinguisherDue", label: "Extintor" },
];
function dueStatus(dateIso: string | null): "ok" | "warn" | "expired" | null {
  if (!dateIso) return null;
  const days = (new Date(dateIso).getTime() - Date.now()) / 86400000;
  if (days < 0) return "expired";
  if (days < 30) return "warn";
  return "ok";
}
function vehicleDueAlert(v: Vehicle): "warn" | "expired" | null {
  const statuses = DUE_FIELDS.map((f) => dueStatus(v[f.key] as string | null));
  if (statuses.includes("expired")) return "expired";
  if (statuses.includes("warn")) return "warn";
  return null;
}
const VEHICLE_TYPE_LABEL: Record<VehicleType, string> = {
  CAMIONETA: "Camioneta", MOTO: "Moto", FURGON: "Furgón", CAMION: "Camión",
};
const VEHICLE_TYPE_ICON: Record<VehicleType, typeof MdDirectionsCar> = {
  CAMIONETA: MdDirectionsCar, MOTO: MdTwoWheeler, FURGON: MdAirportShuttle, CAMION: MdLocalShipping,
};
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
type Customer = { id: string; name: string; phone: string | null; address: string; city: string; source: "manual" | "orders" };
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

type Tab = "rutas" | "calendario" | "costos" | "novedades" | "flota" | "checklist" | "clientes" | "informes";
const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: "rutas", label: "Rutas", icon: <MdRoute size={16} /> },
  { key: "calendario", label: "Calendario", icon: <MdCalendarMonth size={16} /> },
  { key: "costos", label: "Costos", icon: <MdAttachMoney size={16} /> },
  { key: "novedades", label: "Novedades", icon: <MdReportProblem size={16} /> },
  { key: "flota", label: "Flota", icon: <MdDirectionsCar size={16} /> },
  { key: "checklist", label: "Checklist F21", icon: <MdCheckCircle size={16} /> },
  { key: "clientes", label: "Clientes", icon: <MdPerson size={16} /> },
  { key: "informes", label: "Informes", icon: <MdAssignment size={16} /> },
];

const ROUTE_STATUS: Record<RouteStatus, { label: string; cls: string }> = {
  PLANNED: { label: "Planificada", cls: "bg-[#FEF9C3] text-[#854D0E]" },
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
  return `${VEHICLE_TYPE_LABEL[v.type]} · ${v.plate}`;
}

/* ── Calendario: helpers de mes civil Bogotá ── */
const MONTH_NAMES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DOW_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

/** Día civil en Bogotá (YYYY-MM-DD) de un DateTime ISO. */
function bogotaDay(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
}
function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${String(last).padStart(2, "0")}` };
}
function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
/** Celdas de lunes a domingo; recorta la sexta semana si queda fuera del mes. */
function monthGrid(month: string) {
  const [y, m] = month.split("-").map(Number);
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
  const start = Date.UTC(y, m - 1, 1 - offset);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    return { iso, day: d.getUTCDate(), inMonth: iso.slice(0, 7) === month };
  });
  return cells.slice(-7).every((c) => !c.inMonth) ? cells.slice(0, 35) : cells;
}
function longDayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("es-CO", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
}

export default function LogisticaPanel() {
  const router = useRouter();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>("rutas");
  const [from, setFrom] = useState(todayBogota(-14));
  const [to, setTo] = useState(todayBogota(14));
  const [data, setData] = useState<Data | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [month, setMonth] = useState(() => todayBogota().slice(0, 7));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [modal, setModal] = useState<
    | { kind: "route"; date?: string }
    | { kind: "assign"; route: Route }
    | { kind: "cost" }
    | { kind: "incident" }
    | { kind: "vehicle" }
    | { kind: "driver" }
    | { kind: "customer" }
    | { kind: "report" }
    | { kind: "vehicleDue"; vehicle: Vehicle }
    | { kind: "checklistDay"; vehicle: Vehicle; date: string; entry: ChecklistEntry | null }
    | null
  >(null);
  const [checklistVehicleId, setChecklistVehicleId] = useState<string>("");
  const [checklistMonth, setChecklistMonth] = useState(() => todayBogota().slice(0, 7));
  const [checklistEntries, setChecklistEntries] = useState<ChecklistEntry[]>([]);

  const loadChecklist = useCallback(async () => {
    if (!checklistVehicleId) { setChecklistEntries([]); return; }
    const r = await fetch(`/api/panel/logistica/checklist?vehicleId=${checklistVehicleId}&month=${checklistMonth}`);
    if (r.ok) setChecklistEntries((await r.json()).entries);
  }, [checklistVehicleId, checklistMonth]);

  useEffect(() => {
    if (tab === "checklist") void loadChecklist();
  }, [tab, loadChecklist]);

  const load = useCallback(async () => {
    const r = await fetch(`/api/panel/logistica?from=${from}&to=${to}`);
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    if (!r.ok) { setAlert({ type: "err", msg: (await r.json()).error ?? "Error al cargar" }); setLoading(false); return; }
    setData(await r.json());
    setLoading(false);
  }, [from, to, router]);

  const loadReports = useCallback(async () => {
    const rr = await fetch("/api/panel/operaciones/informes?module=MODULE_LOGISTICA");
    if (rr.ok) setReports((await rr.json()).reports);
  }, []);

  const loadCustomers = useCallback(async () => {
    const rc = await fetch("/api/panel/logistica/clientes");
    if (rc.ok) setCustomers((await rc.json()).customers);
  }, []);

  useEffect(() => {
    if (tab === "informes") void loadReports();
    if (tab === "clientes") void loadCustomers();
  }, [tab, loadReports, loadCustomers]);

  useEffect(() => {
    const task = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(task);
  }, [load]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 4000);
    return () => clearTimeout(t);
  }, [alert]);

  // En el calendario el rango lo manda el mes visible, no el selector de fechas.
  useEffect(() => {
    if (tab !== "calendario") return;
    const range = monthRange(month);
    setFrom(range.from);
    setTo(range.to);
  }, [tab, month]);

  const perm = data?.permission ?? { canView: true, canCreate: false, canEdit: false, canDelete: false };

  const done = (msg: string) => {
    setModal(null);
    setAlert({ type: "ok", msg });
    load();
    if (tab === "informes") loadReports();
    if (tab === "clientes") loadCustomers();
    if (tab === "checklist") loadChecklist();
  };
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

  useEffect(() => {
    if (!checklistVehicleId && activeVehicles.length > 0) setChecklistVehicleId(activeVehicles[0].id);
  }, [activeVehicles, checklistVehicleId]);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Logística</h1>
          <p className="mt-1 text-sm text-[#64748B]">Rutas de distribución, costos de transporte, novedades e informe quincenal.</p>
        </div>
        {tab !== "calendario" && <DateRange from={from} to={to} onFrom={setFrom} onTo={setTo} />}
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
                          <span className="inline-flex items-center gap-1">{(() => { const Icon = VEHICLE_TYPE_ICON[r.vehicle.type]; return <Icon size={14} />; })()}{vehicleLabel(r.vehicle)}</span>
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

          {tab === "calendario" && (
            <RouteCalendar
              routes={data.routes}
              month={month}
              onMonth={setMonth}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              canCreate={perm.canCreate}
              onNewRoute={(date) => setModal({ kind: "route", date })}
              canEdit={perm.canEdit}
              onPatch={patch}
            />
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
                  head={["Placa", "Tipo", "Vencimientos", "Estado", perm.canEdit ? "" : null, perm.canDelete ? "" : null]}
                  rows={data.vehicles.map((v) => {
                    const alertLevel = vehicleDueAlert(v);
                    return [
                      <b key="p">{v.plate}</b>, VEHICLE_TYPE_LABEL[v.type],
                      <button
                        key="d"
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${alertLevel === "expired" ? "bg-[#FEE2E2] text-[#DC2626]" : alertLevel === "warn" ? "bg-[#FEF9C3] text-[#854D0E]" : "bg-[#F1F5F9] text-[#64748B]"}`}
                        onClick={() => setModal({ kind: "vehicleDue", vehicle: v })}
                      >
                        {alertLevel === "expired" ? "Vencido" : alertLevel === "warn" ? "Por vencer" : "Ver / editar"}
                      </button>,
                      <span key="s" className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${v.active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{v.active ? "Activo" : "Inactivo"}</span>,
                      perm.canEdit ? <button key="t" className="text-xs font-bold text-[#27B1B8]" onClick={() => patch(`/api/panel/logistica/vehiculos/${v.id}`, { active: !v.active }, v.active ? "Vehículo desactivado" : "Vehículo activado")}>{v.active ? "Desactivar" : "Activar"}</button> : null,
                      perm.canDelete
                        ? <button key="del" className="text-[#94A3B8] hover:text-[#DC2626]" onClick={async () => { if (await confirm({ title: "Eliminar vehículo", message: `¿Eliminar el vehículo ${v.plate}?`, danger: true })) del(`/api/panel/logistica/vehiculos/${v.id}`, "Vehículo eliminado"); }} aria-label="Eliminar vehículo"><MdDelete size={16} /></button>
                        : null,
                    ];
                  })}
                  empty="Sin vehículos. Registra la camioneta y la moto."
                />
              </Section>
              <Section title="Conductores" action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "driver" })}><MdAdd size={16} />Conductor</button>}>
                <Table
                  head={["Nombre", "Teléfono", "Estado", perm.canEdit ? "" : null, perm.canDelete ? "" : null]}
                  rows={data.drivers.map((d) => [
                    <b key="n">{d.fullName}</b>, d.phone ?? "—",
                    <span key="s" className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${d.active ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"}`}>{d.active ? "Activo" : "Inactivo"}</span>,
                    perm.canEdit ? <button key="t" className="text-xs font-bold text-[#27B1B8]" onClick={() => patch(`/api/panel/logistica/conductores/${d.id}`, { active: !d.active }, d.active ? "Conductor desactivado" : "Conductor activado")}>{d.active ? "Desactivar" : "Activar"}</button> : null,
                    perm.canDelete
                      ? <button key="del" className="text-[#94A3B8] hover:text-[#DC2626]" onClick={async () => { if (await confirm({ title: "Eliminar conductor", message: `¿Eliminar el conductor ${d.fullName}?`, danger: true })) del(`/api/panel/logistica/conductores/${d.id}`, "Conductor eliminado"); }} aria-label="Eliminar conductor"><MdDelete size={16} /></button>
                      : null,
                  ])}
                  empty="Sin conductores registrados."
                />
              </Section>
            </div>
          )}

          {tab === "checklist" && (
            <ChecklistView
              vehicles={data.vehicles}
              vehicleId={checklistVehicleId}
              onVehicleId={setChecklistVehicleId}
              month={checklistMonth}
              onMonth={setChecklistMonth}
              entries={checklistEntries}
              canCreate={perm.canCreate}
              onDay={(vehicle, date, entry) => setModal({ kind: "checklistDay", vehicle, date, entry })}
            />
          )}

          {tab === "clientes" && (
            <Section title="Clientes" action={perm.canCreate && <button className={btnPrimary} onClick={() => setModal({ kind: "customer" })}><MdAdd size={16} />Cliente</button>}>
              <Table
                head={["Nombre", "Teléfono", "Dirección", "Ciudad", perm.canDelete ? "" : null]}
                rows={customers.map((c) => [
                  <b key="n">{c.name}</b>, c.phone ?? "—", c.address, c.city,
                  perm.canDelete && c.source === "manual"
                    ? <button key="d" className="text-[#94A3B8] hover:text-[#DC2626]" onClick={async () => { await del(`/api/panel/logistica/clientes/${c.id}`, "Cliente eliminado"); loadCustomers(); }} aria-label="Eliminar cliente"><MdDelete size={16} /></button>
                    : perm.canDelete ? <span key="d" className="text-[10px] font-bold text-[#94A3B8]">De pedidos</span> : null,
                ])}
                empty="Sin clientes registrados."
              />
            </Section>
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
        <RouteModal initialDate={modal.date} vehicles={activeVehicles} drivers={activeDrivers} orders={data.assignableOrders} onClose={() => setModal(null)} onDone={done} onError={fail} />
      )}
      {modal?.kind === "assign" && data && (
        <AssignModal route={modal.route} orders={data.assignableOrders} onClose={() => setModal(null)} onDone={done} onError={fail} />
      )}
      {modal?.kind === "cost" && <CostModal vehicles={activeVehicles} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "incident" && <IncidentModal vehicles={activeVehicles} drivers={activeDrivers} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "vehicle" && <VehicleModal onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "driver" && <DriverModal onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "customer" && <CustomerModal onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "report" && data && <ReportModal from={from} to={to} kpis={data.kpis} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "vehicleDue" && <VehicleDueModal vehicle={modal.vehicle} onClose={() => setModal(null)} onDone={done} onError={fail} />}
      {modal?.kind === "checklistDay" && (
        <ChecklistDayModal vehicle={modal.vehicle} date={modal.date} entry={modal.entry} drivers={activeDrivers} onClose={() => setModal(null)} onDone={done} onError={fail} />
      )}
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

const LEGEND: { label: string; dot: string }[] = [
  { label: "Disponible", dot: "bg-[#E2E8F0]" },
  { label: "Planificada", dot: "bg-[#CA8A04]" },
  { label: "En curso", dot: "bg-[#1D4ED8]" },
  { label: "Finalizada", dot: "bg-[#15803D]" },
];

function RouteCalendar({
  routes, month, onMonth, selectedDay, onSelectDay, canCreate, onNewRoute, canEdit, onPatch,
}: {
  routes: Route[];
  month: string;
  onMonth: (m: string) => void;
  selectedDay: string | null;
  onSelectDay: (d: string | null) => void;
  canCreate: boolean;
  onNewRoute: (date: string) => void;
  canEdit: boolean;
  onPatch: (url: string, body: unknown, okMsg: string) => Promise<void>;
}) {
  const byDay = useMemo(() => {
    const map = new Map<string, Route[]>();
    for (const r of routes) {
      const day = bogotaDay(r.date);
      const list = map.get(day);
      if (list) list.push(r);
      else map.set(day, [r]);
    }
    return map;
  }, [routes]);

  const cells = useMemo(() => monthGrid(month), [month]);
  const today = todayBogota();
  const dayRoutes = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onMonth(shiftMonth(month, -1))}
            aria-label="Mes anterior"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#27B1B8] hover:text-[#27B1B8]"
          >
            <MdChevronLeft size={18} />
          </button>
          <p className="min-w-[150px] text-base font-black text-[#1A1A1A] first-letter:uppercase">{monthLabel(month)}</p>
          <button
            onClick={() => onMonth(shiftMonth(month, 1))}
            aria-label="Mes siguiente"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#27B1B8] hover:text-[#27B1B8]"
          >
            <MdChevronRight size={18} />
          </button>
          <button
            onClick={() => { onMonth(today.slice(0, 7)); onSelectDay(today); }}
            className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-bold text-[#27B1B8] hover:bg-[#F8FAFC]"
          >
            Hoy
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-[#475569]">
          {LEGEND.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <i className={`h-2.5 w-2.5 rounded-full ${l.dot}`} />
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
        {/* Rejilla mensual */}
        <div className="min-w-0 flex-1 rounded-2xl border border-[#E2E8F0] bg-white p-3">
          <div className="mb-1.5 grid grid-cols-7">
            {DOW_LABELS.map((d) => (
              <p key={d} className="px-1 py-1.5 text-[10px] font-black uppercase tracking-wide text-[#94A3B8]">{d}</p>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell) => {
              const list = byDay.get(cell.iso) ?? [];
              const isSelected = cell.iso === selectedDay;
              const isToday = cell.iso === today;
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => onSelectDay(isSelected ? null : cell.iso)}
                  aria-pressed={isSelected}
                  className={`flex h-20 flex-col rounded-xl border p-1.5 text-left transition sm:h-24 ${
                    isSelected
                      ? "border-2 border-[#27B1B8] bg-[#E8FAFB] shadow-[0_0_0_3px_rgba(39,177,184,0.12)]"
                      : cell.inMonth
                        ? "border-[#E2E8F0] bg-white hover:border-[#27B1B8]"
                        : "border-[#F1F5F9] bg-[#FAFBFC] opacity-50"
                  }`}
                >
                  <span className={`text-xs font-bold ${
                    isSelected ? "text-[#0C535B]" : isToday ? "text-[#27B1B8]" : cell.inMonth ? "text-[#1A1A1A]" : "text-[#CBD5E1]"
                  }`}>
                    {cell.day}
                  </span>
                  {list.length > 0 && (
                    <>
                      <span className="mt-1 inline-flex w-fit rounded-md bg-[#EFF6FF] px-1.5 py-0.5 text-[10px] font-bold text-[#1D4ED8] sm:hidden">
                        {list.length}
                      </span>
                      <span className="mt-1 hidden min-h-0 flex-col gap-0.5 overflow-hidden sm:flex">
                        {list.slice(0, 2).map((r) => (
                          <span key={r.id} className={`truncate rounded-md px-1.5 py-0.5 text-[10px] font-bold ${ROUTE_STATUS[r.status].cls}`}>
                            {r.vehicle.plate} · {r.orders.length}
                          </span>
                        ))}
                        {list.length > 2 && (
                          <span className="px-1 text-[10px] font-bold text-[#64748B]">+{list.length - 2} más</span>
                        )}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle del día */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4 xl:w-80 xl:shrink-0">
          {!selectedDay ? (
            <p className="py-8 text-center text-sm text-[#94A3B8]">Selecciona un día para ver sus rutas.</p>
          ) : (
            <>
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wide text-[#94A3B8]">
                    {dayRoutes.length === 0 ? "Disponible" : `${dayRoutes.length} ruta${dayRoutes.length === 1 ? "" : "s"}`}
                  </p>
                  <p className="text-lg font-black text-[#1A1A1A] first-letter:uppercase">{longDayLabel(selectedDay)}</p>
                </div>
                <button onClick={() => onSelectDay(null)} aria-label="Cerrar detalle" className="text-[#94A3B8] hover:text-[#1A1A1A]">
                  <MdClose size={16} />
                </button>
              </div>

              <div className="space-y-2.5">
                {dayRoutes.length === 0 && (
                  <p className="rounded-xl border border-dashed border-[#E2E8F0] py-6 text-center text-xs text-[#94A3B8]">
                    Sin rutas programadas este día.
                  </p>
                )}
                {dayRoutes.map((r) => (
                  <div key={r.id} className="rounded-xl border border-[#E2E8F0] p-3">
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#1A1A1A]">
                        {(() => { const Icon = VEHICLE_TYPE_ICON[r.vehicle.type]; return <Icon size={14} />; })()}
                        {r.vehicle.plate}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ROUTE_STATUS[r.status].cls}`}>
                        {ROUTE_STATUS[r.status].label}
                      </span>
                    </div>
                    <p className="inline-flex items-center gap-1 text-[11px] text-[#64748B]">
                      <MdPerson size={13} />{r.driver.fullName}
                    </p>
                    {r.orders.length === 0 ? (
                      <p className="mt-1.5 text-[11px] text-[#94A3B8]">Sin pedidos asignados.</p>
                    ) : (
                      <div className="mt-2 space-y-1.5 border-t border-[#F1F5F9] pt-2">
                        {r.orders.map((o) => (
                          <div key={o.id}>
                            <p className="text-xs font-bold text-[#1A1A1A]">{o.customerName}</p>
                            <p className="flex items-start gap-1 text-[11px] text-[#64748B]">
                              <MdPlace size={12} className="mt-0.5 shrink-0 text-[#94A3B8]" />
                              <span>{o.addressLine1}, {o.city}</span>
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                    {canEdit && r.status !== "DONE" && (
                      <div className="mt-2 border-t border-[#F1F5F9] pt-2">
                        {r.status === "PLANNED" && (
                          <button className="text-[11px] font-bold text-[#27B1B8]" onClick={() => onPatch(`/api/panel/logistica/rutas/${r.id}`, { status: "IN_PROGRESS" }, "Ruta iniciada")}>Iniciar</button>
                        )}
                        {r.status === "IN_PROGRESS" && (
                          <button className="text-[11px] font-bold text-[#15803D]" onClick={() => onPatch(`/api/panel/logistica/rutas/${r.id}`, { status: "DONE" }, "Ruta finalizada")}>Finalizar</button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {canCreate && (
                <button
                  onClick={() => onNewRoute(selectedDay)}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] py-2.5 text-xs font-bold text-[#475569] hover:border-[#27B1B8] hover:text-[#27B1B8]"
                >
                  <MdAdd size={15} />Nueva ruta este día
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

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

function RouteModal({ initialDate, vehicles, drivers, orders, onClose, onDone, onError }: ModalProps & { initialDate?: string; vehicles: Vehicle[]; drivers: Driver[]; orders: OrderLite[] }) {
  const [date, setDate] = useState(initialDate ?? todayBogota());
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

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" });
}

function VehicleDueModal({ vehicle, onClose, onDone, onError }: ModalProps & { vehicle: Vehicle }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(DUE_FIELDS.map((f) => [f.key, vehicle[f.key] ? String(vehicle[f.key]).slice(0, 10) : ""])),
  );
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const body = Object.fromEntries(DUE_FIELDS.map((f) => [f.key, values[f.key as string] || null]));
    const res = await patchReq(`/api/panel/logistica/vehiculos/${vehicle.id}`, body);
    setSubmitting(false);
    if (res.ok) onDone("Vencimientos actualizados"); else onError(res.error!);
  };
  const fields = vehicle.type === "MOTO" ? DUE_FIELDS.filter((f) => f.key !== "operationCardDue" && f.key !== "extinguisherDue") : DUE_FIELDS;
  return (
    <Modal title={`Vencimientos · ${vehicleLabel(vehicle)}`} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} />}>
      {fields.map((f) => (
        <div key={f.key as string}>
          <label className={labelCls}>{f.label}</label>
          <input type="date" value={values[f.key as string] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.key as string]: e.target.value }))} className={inputCls} />
        </div>
      ))}
    </Modal>
  );
}

function ChecklistView({
  vehicles, vehicleId, onVehicleId, month, onMonth, entries, canCreate, onDay,
}: {
  vehicles: Vehicle[]; vehicleId: string; onVehicleId: (id: string) => void;
  month: string; onMonth: (m: string) => void; entries: ChecklistEntry[]; canCreate: boolean;
  onDay: (vehicle: Vehicle, date: string, entry: ChecklistEntry | null) => void;
}) {
  const vehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const template = vehicle ? checklistTemplateFor(vehicle.type) : [];
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const entryByDate = useMemo(() => Object.fromEntries(entries.map((e) => [e.date.slice(0, 10), e])), [entries]);
  const categories = Array.from(new Set(template.map((i) => i.category)));
  const today = todayBogota();

  const alert = useMemo(() => {
    for (const d of days) {
      const items = entryByDate[d]?.items;
      if (!items) continue;
      for (const item of template) {
        if (items[item.key] === "M") return { date: d, label: item.label };
      }
    }
    return null;
  }, [days, entryByDate, template]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-[#1A1A1A]">Checklist F21</h2>
          <p className="text-xs text-[#64748B]">Revisión diaria pre-operacional · formato KL-SG-F21</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(() => {
            const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
            const VIcon = selectedVehicle ? VEHICLE_TYPE_ICON[selectedVehicle.type] : MdDirectionsCar;
            return (
              <div className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white pl-4 pr-1 shadow-sm">
                <VIcon size={16} className="text-[#0C535B]" />
                <SimpleSelect
                  value={vehicleId}
                  options={vehicles.map((v) => ({ value: v.id, label: vehicleLabel(v) }))}
                  onChange={onVehicleId}
                  triggerClassName="flex items-center gap-1.5 py-2 pr-3 text-sm font-bold text-[#1A1A1A]"
                />
              </div>
            );
          })()}
          <div className="flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-4 py-2 shadow-sm">
            <MdCalendarMonth size={16} className="text-[#64748B]" />
            <input type="month" value={month} onChange={(e) => onMonth(e.target.value)} className="border-0 bg-transparent p-0 text-sm font-bold text-[#1A1A1A] outline-none" />
          </div>
        </div>
      </div>

      {!vehicle && (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <Empty text="Selecciona un vehículo." />
        </div>
      )}

      {vehicle && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-5">
              {(["B", "M", "NA"] as ChecklistStatus[]).map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-black" style={{ background: STATUS_CELL[s].bg, border: `1px solid ${STATUS_CELL[s].border}`, color: STATUS_CELL[s].text }}>{STATUS_CELL[s].label}</div>
                  <span className="text-xs font-semibold text-[#334155]">{s === "B" ? "Bien" : s === "M" ? "Mal" : "No aplica"}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md border-[1.5px] border-dashed border-[#CBD5E1]" />
                <span className="text-xs font-semibold text-[#94A3B8]">Sin revisar</span>
              </div>
            </div>
            {alert && (
              <div className="flex items-center gap-2 rounded-full bg-[#FEF2F2] px-3 py-1.5">
                <MdWarningAmber size={15} className="text-[#DC2626]" />
                <span className="text-xs font-bold text-[#B91C1C]">1 alerta este mes · {alert.label.toLowerCase()}, {fmtDateShort(alert.date)}</span>
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-max border-separate border-spacing-0 text-xs">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[240px] border-b border-[#E2E8F0] bg-white px-4 py-3 text-left shadow-[2px_0_4px_rgba(15,23,42,0.03)]">
                      <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#94A3B8]">Ítem de revisión</span>
                    </th>
                    {days.map((d) => {
                      const isToday = d === today;
                      return (
                        <th
                          key={d}
                          className="w-14 px-1 py-2 text-center"
                          style={{
                            borderBottom: isToday ? "2px solid #27B1B8" : "1px solid #E2E8F0",
                            background: isToday ? "rgba(39,177,184,0.07)" : isWeekend(d) ? "#F8FAFC" : undefined,
                          }}
                        >
                          <div className="text-[9px] font-bold uppercase" style={{ color: isToday ? "#0C535B" : "#94A3B8" }}>{dowShort(d)}</div>
                          <div className="mt-0.5 text-[13px] font-extrabold" style={{ color: isToday ? "#0C535B" : "#1A1A1A" }}>{d.slice(8, 10)}</div>
                          {isToday && <div className="mt-0.5 text-[8px] font-extrabold tracking-wide text-[#27B1B8]">HOY</div>}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((cat) => {
                    const Icon = CATEGORY_ICON[cat] ?? MdBuild;
                    return (
                      <React.Fragment key={cat}>
                        <tr>
                          <td colSpan={days.length + 1} className="sticky left-0 z-10 p-0">
                            <div className="flex items-center gap-2 border-y border-[#F1F5F9] bg-[#F8FAFC] px-4 py-2.5">
                              <Icon size={14} className="text-[#0C535B]" />
                              <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#0C535B]">{cat}</span>
                            </div>
                          </td>
                        </tr>
                        {template.filter((i) => i.category === cat).map((item) => (
                          <tr key={item.key}>
                            <td className="sticky left-0 z-10 border-b border-[#F1F5F9] bg-white px-4 py-2.5 shadow-[2px_0_4px_rgba(15,23,42,0.03)]">
                              <span className="font-semibold text-[#1A1A1A]">{item.label}</span>
                            </td>
                            {days.map((d) => {
                              const status = entryByDate[d]?.items?.[item.key];
                              const isToday = d === today;
                              const cellBg = isToday ? "rgba(39,177,184,0.07)" : isWeekend(d) ? "#F8FAFC" : undefined;
                              return (
                                <td key={d} className="border-b border-[#F1F5F9] px-1 py-2 text-center" style={{ background: cellBg }}>
                                  <button
                                    disabled={!canCreate}
                                    onClick={() => onDay(vehicle, d, entryByDate[d] ?? null)}
                                    className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-extrabold transition-transform hover:scale-105 disabled:cursor-default"
                                    style={
                                      status
                                        ? { background: STATUS_CELL[status].bg, border: `${isToday ? "1.5px" : "1px"} solid ${isToday ? "#27B1B8" : STATUS_CELL[status].border}`, color: STATUS_CELL[status].text }
                                        : { border: `1.5px dashed ${isToday ? "#27B1B8" : "#E2E8F0"}` }
                                    }
                                  >
                                    {status ?? ""}
                                  </button>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-center gap-1.5 border-t border-[#F1F5F9] bg-[#F8FAFC] py-2.5">
              <MdChevronRight size={13} className="text-[#94A3B8]" />
              <span className="text-[11px] font-bold text-[#94A3B8]">Desliza para ver el resto del mes</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ChecklistDayModal({
  vehicle, date, entry, drivers, onClose, onDone, onError,
}: ModalProps & { vehicle: Vehicle; date: string; entry: ChecklistEntry | null; drivers: Driver[] }) {
  const template = checklistTemplateFor(vehicle.type);
  const [driverId, setDriverId] = useState(entry?.driverId ?? drivers[0]?.id ?? "");
  const [items, setItems] = useState<Record<string, ChecklistStatus>>(() => {
    const base = Object.fromEntries(template.map((i) => [i.key, "B" as ChecklistStatus]));
    return { ...base, ...(entry?.items ?? {}) };
  });
  const [initials, setInitials] = useState(entry?.initials ?? "");
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/logistica/checklist", { vehicleId: vehicle.id, driverId, date, items, initials, notes });
    setSubmitting(false);
    if (res.ok) onDone("Checklist guardado"); else onError(res.error!);
  };
  return (
    <Modal title={`Checklist ${fmtDateShort(date)} · ${vehicleLabel(vehicle)}`} onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!driverId} />} wide>
      <div><label className={labelCls}>Conductor</label><SimpleSelect value={driverId} options={drivers.map((d) => ({ value: d.id, label: d.fullName }))} onChange={setDriverId} /></div>
      <div className="grid gap-2">
        {template.map((item) => (
          <div key={item.key} className="flex items-center justify-between gap-3 rounded-xl border border-[#E2E8F0] px-3 py-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{item.category}</p>
              <p className="text-sm text-[#1A1A1A]">{item.label}</p>
            </div>
            <SimpleSelect
              value={items[item.key] ?? "B"}
              options={[{ value: "B", label: "Bien" }, { value: "M", label: "Mal" }, { value: "NA", label: "No aplica" }]}
              onChange={(v) => setItems((it) => ({ ...it, [item.key]: v as ChecklistStatus }))}
            />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className={labelCls}>Iniciales</label><input value={initials} onChange={(e) => setInitials(e.target.value)} className={inputCls} /></div>
        <div><label className={labelCls}>Notas</label><input value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} /></div>
      </div>
    </Modal>
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
      <div><label className={labelCls}>Tipo</label><SimpleSelect value={type} options={[{ value: "CAMIONETA", label: "Camioneta" }, { value: "MOTO", label: "Moto" }, { value: "FURGON", label: "Furgón" }, { value: "CAMION", label: "Camión" }]} onChange={(v) => setType(v as Vehicle["type"])} /></div>
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

function CustomerModal({ onClose, onDone, onError }: ModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    setSubmitting(true);
    const res = await post("/api/panel/logistica/clientes", { name, phone, address, city });
    setSubmitting(false);
    if (res.ok) onDone("Cliente registrado"); else onError(res.error!);
  };
  return (
    <Modal title="Nuevo cliente" onClose={onClose} footer={<Footer onClose={onClose} onSubmit={submit} submitting={submitting} disabled={!name.trim() || !address.trim() || !city.trim()} />}>
      <div><label className={labelCls}>Nombre</label><input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Teléfono (opcional)</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Dirección</label><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} /></div>
      <div><label className={labelCls}>Ciudad</label><input value={city} onChange={(e) => setCity(e.target.value)} className={inputCls} /></div>
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
