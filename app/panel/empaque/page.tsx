"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import {
  MdLocalShipping, MdPictureAsPdf, MdChevronLeft, MdPerson, MdCheck, MdSearch,
  MdDescription, MdInventory2, MdStickyNote2, MdOpenInNew, MdBlock, MdSettings, MdDelete, MdAdd, MdHistory, MdWarningAmber,
} from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";
import { COP, Empty, Modal, Footer, inputCls, labelCls, btnPrimary, btnGhost } from "../_components/ops-ui";
import { useConfirm } from "@/app/components/confirm-dialog";
import { SkeletonTable } from "../../components/skeleton";

type OrderItem = {
  id: string; name: string; image?: string | null; quantity: number; unitPrice: number; lineTotal: number;
};

type Order = {
  id: string;
  createdAt: string;
  status: string;
  paymentStatus?: string;
  shippingStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company?: string | null;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2?: string | null;
  notes?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  adminNotes?: string | null;
  subtotal: number;
  totalItems: number;
  items: OrderItem[];
  assignedSeller?: { fullName: string } | null;
};

type Caja = { id: string; nombre: string; largoCm: number; anchoCm: number; altoCm: number; pesoKg: number | null };

type CarrierEvent = {
  id: string; createdAt: string; actorEmail: string;
  tipo: "generada" | "anulada" | "estado" | "novedad"; guia: string; codigo?: string; descripcion: string; fechaCoordinadora?: string;
};

const hasGuide = (o: Order) => o.carrier === "Coordinadora" && Boolean(o.trackingNumber);
const trackingUrl = (guia: string) =>
  `https://coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=${encodeURIComponent(guia)}`;

type OrderForm = { shippingStatus: string; carrier: string; trackingNumber: string; adminNotes: string };

const SHIPPING_STATUSES = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

const SHIPPING_COLORS: Record<string, { bg: string; text: string }> = {
  PENDING:   { bg: "#FEF3C7", text: "#92400E" },
  PREPARING: { bg: "#DBEAFE", text: "#1E40AF" },
  SHIPPED:   { bg: "#D1FAE5", text: "#065F46" },
  DELIVERED: { bg: "#DCFCE7", text: "#166534" },
  CANCELLED: { bg: "#FEE2E2", text: "#991B1B" },
};

function getShippingStatusLabel(status: string) {
  if (status === "PREPARING") return "En preparación";
  if (status === "SHIPPED")   return "Enviado";
  if (status === "DELIVERED") return "Entregado";
  if (status === "CANCELLED") return "Cancelado";
  return "Pendiente";
}

function StatusBadge({ status }: { status: string }) {
  const c = SHIPPING_COLORS[status] ?? SHIPPING_COLORS.PENDING;
  return (
    <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: c.bg, color: c.text }}>
      {getShippingStatusLabel(status)}
    </span>
  );
}

function getProgressStep(shippingStatus: string, paymentStatus?: string) {
  if (shippingStatus === "DELIVERED") return 3;
  if (shippingStatus === "SHIPPED")   return 2;
  if (shippingStatus === "PREPARING") return 1;
  if (paymentStatus  === "PAID")      return 0;
  return -1;
}

function OrderProgress({ order }: { order: Order }) {
  const activeStep = getProgressStep(order.shippingStatus, order.paymentStatus);
  const steps = [
    { label: "Pedido confirmado", icon: <MdDescription size={18} /> },
    { label: "En preparación",   icon: <MdInventory2 size={18} /> },
    { label: "Enviado",          icon: <MdLocalShipping size={18} /> },
    { label: "Recibido",         icon: <MdCheck size={18} /> },
  ];

  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Flujo del pedido</p>
      <div className="mt-4 overflow-x-auto">
        <div className="relative min-w-[480px] px-1 py-2">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-7 z-0">
            <span className="block h-1.5 rounded-full bg-[#E2E8F0]" />
            <span className="absolute left-0 top-0 h-1.5 rounded-full bg-[#27B1B8] transition-all duration-300"
              style={{ width: activeStep < 0 ? "0%" : `${(activeStep / (steps.length - 1)) * 100}%` }} />
          </div>
          <div className="relative flex items-start justify-between">
            {steps.map((step, i) => {
              const done = activeStep >= 0 && i <= activeStep;
              return (
                <div key={step.label} className="relative flex min-w-[100px] flex-1 flex-col items-center text-center">
                  <span className={`relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border ${done ? "border-[#27B1B8] bg-[#27B1B8] text-white" : "border-[#E2E8F0] bg-[#F8FAFC] text-[#94A3B8]"}`}>
                    {step.icon}
                  </span>
                  <p className={`mt-2 text-sm font-bold ${done ? "text-[#0C535B]" : "text-[#94A3B8]"}`}>{step.label}</p>
                  {i === activeStep && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#27B1B8]">Actual</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const EVENT_STYLE: Record<CarrierEvent["tipo"], string> = {
  generada: "bg-[#27B1B8]",
  estado: "bg-[#0C535B]",
  novedad: "bg-[#F59E0B]",
  anulada: "bg-[#DC2626]",
};

function CarrierHistory({ events }: { events: CarrierEvent[] }) {
  if (!events.length) return <p className="text-sm text-[#94A3B8]">Sin movimientos todavía.</p>;
  return (
    <ol className="relative space-y-4 border-l-2 border-[#E2E8F0] pl-5">
      {[...events].reverse().map((e) => (
        <li key={e.id} className="relative">
          <span className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full ring-4 ring-white ${EVENT_STYLE[e.tipo]}`} aria-hidden />
          <p className="flex items-center gap-1.5 text-sm font-bold text-[#1A1A1A]">
            {e.tipo === "novedad" && <MdWarningAmber size={15} className="text-[#F59E0B]" aria-hidden />}
            {e.descripcion}
          </p>
          <p className="text-xs text-[#64748B]">
            {e.fechaCoordinadora
              ? `Coordinadora: ${e.fechaCoordinadora}`
              : new Date(e.createdAt).toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" })}
            {" · Guía "}{e.guia}
            {e.tipo === "generada" || e.tipo === "anulada" ? ` · ${e.actorEmail}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

type CajaDraft = { id: string; nombre: string; largoCm: string; anchoCm: string; altoCm: string; pesoKg: string };

function CajasModal({ cajas, onClose, onSaved }: { cajas: Caja[]; onClose: () => void; onSaved: (c: Caja[]) => void }) {
  const [rows, setRows] = useState<CajaDraft[]>(() =>
    cajas.map((c) => ({ id: c.id, nombre: c.nombre, largoCm: String(c.largoCm), anchoCm: String(c.anchoCm), altoCm: String(c.altoCm), pesoKg: c.pesoKg == null ? "" : String(c.pesoKg) })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (i: number, k: keyof CajaDraft, v: string) => setRows((r) => r.map((row, j) => (j === i ? { ...row, [k]: v } : row)));
  const n = (v: string) => Number(v.replace(",", "."));

  const save = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/panel/empaque/cajas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rows.map((r) => ({ id: r.id, nombre: r.nombre, largoCm: n(r.largoCm), anchoCm: n(r.anchoCm), altoCm: n(r.altoCm), pesoKg: r.pesoKg.trim() ? n(r.pesoKg) : null }))),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setError(data.error ?? "No se pudieron guardar las cajas");
    onSaved(data as Caja[]);
  };

  return (
    <Modal title="Cajas de bodega" wide onClose={onClose} footer={<Footer onClose={onClose} onSubmit={save} submitting={saving} />}>
      <p className="mb-4 text-sm text-[#64748B]">Medidas por tipo de caja. Al elegir una caja se llenan solas las medidas de la guía. El peso es opcional.</p>
      <div className="space-y-3">
        {rows.length === 0 && <Empty text="Aún no hay cajas. Agrega la primera." />}
        {rows.map((r, i) => (
          <div key={r.id} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-[#E2E8F0] p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <label className="col-span-2 sm:col-span-1"><span className={labelCls}>Nombre</span>
              <input value={r.nombre} onChange={(e) => set(i, "nombre", e.target.value)} placeholder="Caja pequeña" className={inputCls} /></label>
            <label><span className={labelCls}>Largo (cm)</span><input inputMode="decimal" value={r.largoCm} onChange={(e) => set(i, "largoCm", e.target.value)} className={inputCls} /></label>
            <label><span className={labelCls}>Ancho (cm)</span><input inputMode="decimal" value={r.anchoCm} onChange={(e) => set(i, "anchoCm", e.target.value)} className={inputCls} /></label>
            <label><span className={labelCls}>Alto (cm)</span><input inputMode="decimal" value={r.altoCm} onChange={(e) => set(i, "altoCm", e.target.value)} className={inputCls} /></label>
            <label><span className={labelCls}>Peso (kg)</span><input inputMode="decimal" value={r.pesoKg} onChange={(e) => set(i, "pesoKg", e.target.value)} placeholder="Opcional" className={inputCls} /></label>
            <button type="button" onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))} aria-label={`Quitar ${r.nombre || "caja"}`}
              className="inline-flex h-9 w-9 items-center justify-center justify-self-end rounded-xl border border-[#E2E8F0] text-[#DC2626] hover:bg-[#FEE2E2]">
              <MdDelete size={17} aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => setRows((rs) => [...rs, { id: crypto.randomUUID(), nombre: "", largoCm: "", anchoCm: "", altoCm: "", pesoKg: "" }])}
        className={`mt-3 ${btnGhost}`}>
        <MdAdd size={16} aria-hidden /> Agregar caja
      </button>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#FEE2E2] px-3 py-2 text-sm text-[#991B1B]">{error}</p>}
    </Modal>
  );
}

export default function EmpaquePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [shippingFilter, setShippingFilter] = useState<string>("all");
  const [form, setForm] = useState<OrderForm>({ shippingStatus: "", carrier: "", trackingNumber: "", adminNotes: "" });
  const [pkg, setPkg] = useState({ pesoKg: "", largoCm: "", anchoCm: "", altoCm: "", unidades: "1" });
  const [guideLoading, setGuideLoading] = useState(false);
  const [guideError, setGuideError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cajas, setCajas] = useState<Caja[]>([]);
  const [showCajas, setShowCajas] = useState(false);
  const [events, setEvents] = useState<CarrierEvent[]>([]);
  const [cancelling, setCancelling] = useState(false);
  const confirm = useConfirm();

  const loadEvents = (orderId: string) =>
    fetch(`/api/panel/orders/${orderId}/guia-coordinadora/historial`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch(() => setEvents([]));

  useEffect(() => {
    fetch("/api/panel/empaque/cajas").then((r) => (r.ok ? r.json() : [])).then((d) => setCajas(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/panel/orders")
      .then(async (r) => {
        const d = await r.json().catch(() => null);
        if (!r.ok) setLoadError(d?.error ?? "No fue posible cargar los pedidos");
        setOrders(Array.isArray(d) ? d : []);
      })
      .catch(() => setLoadError("No fue posible cargar los pedidos"))
      .finally(() => setLoading(false));
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchSearch = !q || o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || o.city.toLowerCase().includes(q) || (o.trackingNumber ?? "").toLowerCase().includes(q);
      const matchFilter = shippingFilter === "all" || o.shippingStatus === shippingFilter;
      return matchSearch && matchFilter;
    });
  }, [orders, search, shippingFilter]);

  const withGuide = filteredOrders.filter(hasGuide);

  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null;

  const openOrder = (order: Order) => {
    setSelectedId(order.id);
    setEvents([]);
    void loadEvents(order.id);
    setSaved(false);
    setGuideError("");
    setPkg({ pesoKg: "", largoCm: "", anchoCm: "", altoCm: "", unidades: "1" });
    setForm({
      shippingStatus: order.shippingStatus ?? "PENDING",
      carrier: order.carrier ?? "",
      trackingNumber: order.trackingNumber ?? "",
      adminNotes: order.adminNotes ?? "",
    });
  };

  const saveOrder = async () => {
    if (!selectedId) return;
    setSaving(true);
    const res = await fetch("/api/panel/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selectedId, ...form }),
    });
    if (res.ok) {
      const updated = await res.json() as Order;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      setSaved(true);
    }
    setSaving(false);
  };

  const generateGuide = async () => {
    if (!selectedId) return;
    setGuideLoading(true);
    setGuideError("");
    const res = await fetch(`/api/panel/orders/${selectedId}/guia-coordinadora`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(Object.entries(pkg).map(([k, v]) => [k, Number(v.replace(",", "."))]))),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const updated = data as Order;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      setForm((f) => ({ ...f, shippingStatus: updated.shippingStatus, carrier: updated.carrier ?? "", trackingNumber: updated.trackingNumber ?? "" }));
      void loadEvents(updated.id);
    } else {
      setGuideError(data.error ?? "No fue posible generar la guía");
    }
    setGuideLoading(false);
  };

  const cancelGuide = async (order: Order) => {
    const ok = await confirm({
      title: "Anular guía",
      message: `Se anulará la guía ${order.trackingNumber} en Coordinadora y podrás generar una nueva. Bota el rótulo impreso.`,
      confirmLabel: "Anular guía",
      danger: true,
    });
    if (!ok) return;
    setCancelling(true);
    setGuideError("");
    const res = await fetch(`/api/panel/orders/${order.id}/guia-coordinadora`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      const updated = data as Order;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      setForm((f) => ({ ...f, carrier: "", trackingNumber: "", adminNotes: updated.adminNotes ?? f.adminNotes }));
      setSelected((sel) => { const next = new Set(sel); next.delete(order.id); return next; });
      void loadEvents(order.id);
    } else {
      setGuideError(data.error ?? "No fue posible anular la guía");
    }
    setCancelling(false);
  };

  const applyCaja = (c: Caja) =>
    setPkg((p) => ({ ...p, largoCm: String(c.largoCm), anchoCm: String(c.anchoCm), altoCm: String(c.altoCm), ...(c.pesoKg != null ? { pesoKg: String(c.pesoKg) } : {}) }));

  const toggleSelected = (id: string) =>
    setSelected((sel) => { const next = new Set(sel); if (next.has(id)) next.delete(id); else next.add(id); return next; });

  const header = (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Operaciones</p>
      <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Empaque</h1>
      <p className="mt-1 text-sm text-[#64748B]">Pedidos para empacar y despachar. Genera la guía de Coordinadora e imprime el rótulo.</p>
    </div>
  );

  if (loading) {
    return <div className="p-6 lg:p-8">{header}<SkeletonTable /></div>;
  }

  /* ── Detalle ── */
  if (selectedId && selectedOrder) {
    return (
      <div className="space-y-5 p-6 lg:p-8">
        <button type="button" onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-1 rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
          <MdChevronLeft size={18} aria-hidden />
          Volver a pedidos
        </button>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Pedido</p>
              <h2 className="mt-1 break-all font-mono text-lg font-black text-[#0C535B]">{selectedOrder.id}</h2>
              <p className="mt-2 text-sm font-bold text-[#1A1A1A]">{selectedOrder.customerName}</p>
              <p className="text-sm text-[#64748B]">{selectedOrder.department}, {selectedOrder.city}</p>
              <p className="text-sm text-[#1A1A1A]">{selectedOrder.addressLine1}{selectedOrder.addressLine2 ? `, ${selectedOrder.addressLine2}` : ""}</p>
              {selectedOrder.assignedSeller && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#E6F7F8] px-3 py-1 text-xs font-bold text-[#0C535B]">
                  <MdPerson size={14} aria-hidden /> Vendedor: {selectedOrder.assignedSeller.fullName}
                </span>
              )}
              {selectedOrder.notes && (
                <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-[#FEF3C7] px-3 py-2 text-xs text-[#92400E]">
                  <MdStickyNote2 size={14} className="mt-px shrink-0" aria-hidden />
                  <span><span className="font-bold">Nota:</span> {selectedOrder.notes}</span>
                </p>
              )}
            </div>
            <StatusBadge status={selectedOrder.shippingStatus} />
          </div>

          {/* Productos */}
          <div className="mt-5 space-y-2">
            {selectedOrder.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] px-4 py-3">
                {item.image && (
                  <Image src={item.image} alt={item.name} width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg object-contain" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[#1A1A1A]">{item.name}</p>
                  <p className="text-xs text-[#64748B]">Cantidad: {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-[#0C535B]">{COP.format(item.lineTotal)}</p>
              </div>
            ))}
            <div className="flex justify-between rounded-xl bg-[#0C535B] px-4 py-3 text-sm font-bold text-white">
              <span>{selectedOrder.totalItems} producto{selectedOrder.totalItems === 1 ? "" : "s"}</span>
              <span>{COP.format(selectedOrder.subtotal)}</span>
            </div>
          </div>
        </div>

        <OrderProgress order={selectedOrder} />

        {/* Guía Coordinadora */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#27B1B8] text-white">
              <MdLocalShipping size={18} aria-hidden />
            </span>
            <h2 className="text-base font-black text-[#1A1A1A]">Guía Coordinadora</h2>
          </div>
          {selectedOrder.carrier === "Coordinadora" && selectedOrder.trackingNumber ? (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-sm text-[#1A1A1A]">
                Guía <span className="font-mono font-bold">{selectedOrder.trackingNumber}</span>
              </p>
              <a href={`/api/panel/orders/${selectedOrder.id}/guia-coordinadora`} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                <MdPictureAsPdf size={16} aria-hidden />
                Imprimir rótulo
              </a>
              <a href={trackingUrl(selectedOrder.trackingNumber)} target="_blank" rel="noopener noreferrer" className={btnGhost}>
                <MdOpenInNew size={16} aria-hidden />
                Rastrear
              </a>
              {(selectedOrder.shippingStatus === "PENDING" || selectedOrder.shippingStatus === "PREPARING") && (
                <button type="button" onClick={() => cancelGuide(selectedOrder)} disabled={cancelling}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#FECACA] px-3.5 py-2 text-sm font-bold text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50">
                  <MdBlock size={16} aria-hidden />
                  {cancelling ? "Anulando…" : "Anular guía"}
                </button>
              )}
              {guideError && <p role="alert" className="w-full rounded-xl bg-[#FEE2E2] px-3 py-2 text-sm text-[#991B1B]">{guideError}</p>}
            </div>
          ) : (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-[#64748B]">Caja:</span>
                {cajas.length === 0 && <span className="text-xs text-[#94A3B8]">Sin cajas guardadas</span>}
                {cajas.map((c) => {
                  const active = pkg.largoCm === String(c.largoCm) && pkg.anchoCm === String(c.anchoCm) && pkg.altoCm === String(c.altoCm);
                  return (
                    <button key={c.id} type="button" onClick={() => applyCaja(c)} aria-pressed={active}
                      title={`${c.largoCm} × ${c.anchoCm} × ${c.altoCm} cm${c.pesoKg != null ? ` · ${c.pesoKg} kg` : ""}`}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${active ? "bg-[#27B1B8] text-white" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                      {c.nombre}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setShowCajas(true)}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold text-[#0C535B] hover:bg-[#E6F7F8]">
                  <MdSettings size={14} aria-hidden /> Administrar cajas
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {([
                  ["pesoKg", "Peso (kg)"],
                  ["largoCm", "Largo (cm)"],
                  ["anchoCm", "Ancho (cm)"],
                  ["altoCm", "Alto (cm)"],
                  ["unidades", "Cajas"],
                ] as const).map(([key, label]) => (
                  <label key={key}>
                    <span className={labelCls}>{label}</span>
                    <input inputMode="decimal" value={pkg[key]}
                      onChange={(e) => setPkg((p) => ({ ...p, [key]: e.target.value }))}
                      className={inputCls} />
                  </label>
                ))}
              </div>
              {guideError && <p role="alert" className="mt-3 rounded-xl bg-[#FEE2E2] px-3 py-2 text-sm text-[#991B1B]">{guideError}</p>}
              <button type="button" onClick={generateGuide}
                disabled={guideLoading || !pkg.pesoKg || !pkg.largoCm || !pkg.anchoCm || !pkg.altoCm || !pkg.unidades}
                className={`mt-4 ${btnPrimary}`}>
                <MdLocalShipping size={16} aria-hidden />
                {guideLoading ? "Generando guía…" : "Generar guía"}
              </button>
            </>
          )}
        </div>

        {/* Historial de la guía */}
        {(events.length > 0 || hasGuide(selectedOrder)) && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#0C535B] text-white">
                <MdHistory size={18} aria-hidden />
              </span>
              <h2 className="text-base font-black text-[#1A1A1A]">Historial del envío</h2>
            </div>
            <CarrierHistory events={events} />
          </div>
        )}

        {showCajas && <CajasModal cajas={cajas} onClose={() => setShowCajas(false)} onSaved={(c) => { setCajas(c); setShowCajas(false); }} />}

        {/* Envío */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
          <h2 className="text-base font-black text-[#1A1A1A]">Datos del envío</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <span className={labelCls}>Estado de envío</span>
              <SimpleSelect
                value={form.shippingStatus}
                options={SHIPPING_STATUSES.map((s) => ({ value: s, label: getShippingStatusLabel(s) }))}
                onChange={(v) => setForm((f) => ({ ...f, shippingStatus: v }))}
              />
            </div>
            <label>
              <span className={labelCls}>Transportadora</span>
              <input value={form.carrier}
                onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                placeholder="Ej. Coordinadora, Servientrega..." className={inputCls} />
            </label>
            <label>
              <span className={labelCls}>Número de guía</span>
              <input value={form.trackingNumber}
                onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                placeholder="Ej. 123456789" className={inputCls} />
            </label>
            <label className="md:col-span-2">
              <span className={labelCls}>Notas internas</span>
              <textarea rows={3} value={form.adminNotes}
                onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
                placeholder="Ej. Sale hoy en la tarde, cliente pidió entregar en portería..." className={inputCls} />
            </label>
          </div>
          <button type="button" onClick={saveOrder} disabled={saving} className={`mt-4 ${btnPrimary}`}>
            {saved && !saving && <MdCheck size={16} aria-hidden />}
            {saving ? "Guardando…" : saved ? "Guardado" : "Actualizar pedido"}
          </button>
        </div>
      </div>
    );
  }

  /* ── Lista ── */
  return (
    <div className="p-6 lg:p-8">
      {header}

      <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-white p-4">
        <div className="relative">
          <MdSearch size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" aria-hidden />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por pedido, cliente, ciudad o guía..."
            aria-label="Buscar pedidos"
            className={`${inputCls} pl-9`} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => setShippingFilter("all")}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${shippingFilter === "all" ? "bg-[#27B1B8] text-white" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
            Todos ({orders.length})
          </button>
          {SHIPPING_STATUSES.map((s) => {
            const count = orders.filter((o) => o.shippingStatus === s).length;
            const active = shippingFilter === s;
            return (
              <button key={s} type="button" onClick={() => setShippingFilter(s)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${active ? "bg-[#27B1B8] text-white" : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"}`}>
                {getShippingStatusLabel(s)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="rounded-2xl bg-[#FEE2E2] px-4 py-3 text-sm text-[#991B1B]">{loadError}</p>
      ) : filteredOrders.length === 0 ? (
        <Empty text={orders.length === 0 ? "No hay pedidos aún." : "Ningún pedido coincide con los filtros."} />
      ) : (
        <div className="space-y-3">
          {withGuide.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-[#64748B]">
                <input type="checkbox" className="h-4 w-4 accent-[#27B1B8]"
                  checked={withGuide.every((o) => selected.has(o.id))}
                  onChange={(e) => setSelected(e.target.checked ? new Set(withGuide.map((o) => o.id)) : new Set())} />
                {selected.size > 0 ? `${selected.size} rótulo${selected.size === 1 ? "" : "s"} seleccionado${selected.size === 1 ? "" : "s"}` : "Seleccionar los que tienen guía"}
              </label>
              {selected.size > 0 && (
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelected(new Set())} className={btnGhost}>Limpiar</button>
                  <a href={`/api/panel/orders/etiquetas?ids=${[...selected].join(",")}`} target="_blank" rel="noopener noreferrer" className={btnPrimary}>
                    <MdPictureAsPdf size={16} aria-hidden />
                    Imprimir {selected.size} rótulo{selected.size === 1 ? "" : "s"}
                  </a>
                </div>
              )}
            </div>
          )}
          {filteredOrders.map((order) => {
            const previewImages = order.items.filter((i): i is OrderItem & { image: string } => Boolean(i.image)).slice(0, 2);
            return (
              <div key={order.id} className="flex items-stretch gap-2">
              {withGuide.length > 0 && (
                hasGuide(order) ? (
                  <label className="flex w-10 shrink-0 cursor-pointer items-center justify-center rounded-2xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]">
                    <input type="checkbox" className="h-4 w-4 accent-[#27B1B8]" checked={selected.has(order.id)} onChange={() => toggleSelected(order.id)}
                      aria-label={`Seleccionar rótulo de ${order.customerName}`} />
                  </label>
                ) : <span className="w-10 shrink-0" aria-hidden />
              )}
              <button type="button" onClick={() => openOrder(order)}
                className="block min-w-0 flex-1 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-4 text-left transition hover:border-[#27B1B8]/50 hover:bg-[#F8FAFC] sm:px-5">
                <div className="flex items-start gap-4">
                  {previewImages.length > 0 ? (
                    <div className="flex shrink-0 gap-1.5">
                      {previewImages.map((item, i) => (
                        <div key={i} className="h-14 w-14 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
                          <Image src={item.image} alt="" width={56} height={56} className="h-full w-full object-contain p-1" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#0C535B] text-lg font-black text-white">
                      {order.totalItems}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs font-bold text-[#94A3B8]">{order.id.slice(-10).toUpperCase()}</p>
                      <StatusBadge status={order.shippingStatus} />
                    </div>
                    <p className="mt-1 text-sm font-bold text-[#1A1A1A]">{order.customerName}</p>
                    <p className="text-sm text-[#64748B]">{order.city}, {order.department}</p>
                    <p className="truncate text-xs text-[#94A3B8]">{order.addressLine1}</p>
                    {hasGuide(order) && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#0C535B]">
                        <MdLocalShipping size={13} aria-hidden /> Guía {order.trackingNumber}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-bold text-[#0C535B]">{COP.format(order.subtotal)}</p>
                      <div className="flex items-center gap-2">
                        {order.assignedSeller && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F7F8] px-2.5 py-0.5 text-xs font-bold text-[#0C535B]">
                            <MdPerson size={13} aria-hidden /> {order.assignedSeller.fullName}
                          </span>
                        )}
                        <p className="text-xs text-[#94A3B8]">{new Date(order.createdAt).toLocaleDateString("es-CO")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
