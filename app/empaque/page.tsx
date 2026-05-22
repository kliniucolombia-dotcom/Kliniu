"use client";
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);
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
    { label: "Pedido confirmado", icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v3h3"/><path d="M9 12h6"/><path d="M9 16h4"/></svg> },
    { label: "En preparación",   icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 4 7l8 4 8-4-8-4Z"/><path d="M4 7v10l8 4 8-4V7"/><path d="M12 11v10"/></svg> },
    { label: "Enviado",          icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7h11v8H3z"/><path d="M14 10h3l4 3v2h-7z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="17.5" cy="17.5" r="1.5"/></svg> },
    { label: "Recibido",         icon: <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6"/></svg> },
  ];

  return (
    <div className="rounded-2xl border border-black/8 bg-[#fafaf9] px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#8b8d91]">Flujo del pedido</p>
        <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-widest text-[#0C535B] shadow-sm">
          {getShippingStatusLabel(order.shippingStatus)}
        </span>
      </div>
      <div className="mt-5 overflow-x-auto">
        <div className="relative min-w-[480px] px-1 py-2">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 z-0">
            <span className="block h-[6px] rounded-full bg-[#d9dde4]" />
            <span className="absolute left-0 top-0 h-[6px] rounded-full bg-gradient-to-r from-[#27B1B8] to-[#F07826] transition-all duration-300"
              style={{ width: activeStep < 0 ? "0%" : `${(activeStep / (steps.length - 1)) * 100}%` }} />
          </div>
          <div className="relative flex items-start justify-between">
            {steps.map((step, i) => {
              const done    = activeStep >= 0 && i <= activeStep;
              const current = i === activeStep;
              return (
                <div key={step.label} className="relative flex min-w-[100px] flex-1 flex-col items-center text-center">
                  <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${done ? "border-[#27B1B8] bg-[#27B1B8] text-white" : "border-black/10 bg-[#f8f8f7] text-[#8b8d91]"}`}>
                    {step.icon}
                  </span>
                  <p className={`mt-3 text-sm font-semibold ${done ? "text-[#0C535B]" : "text-[#8b8d91]"}`}>{step.label}</p>
                  {current && <p className="mt-1 text-xs font-bold uppercase tracking-widest text-[#F07826]">Actual</p>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EmpaqueOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");
  const [shippingFilter, setShippingFilter] = useState<string>("all");
  const [form, setForm] = useState<OrderForm>({ shippingStatus: "", carrier: "", trackingNumber: "", adminNotes: "" });

  useEffect(() => {
    fetch("/api/panel/orders")
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : []))
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

  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null;

  const openOrder = (order: Order) => {
    setSelectedId(order.id);
    setSaved(false);
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <p className="text-sm text-[#94A3B8]">Cargando pedidos…</p>
      </div>
    );
  }

  /* ── Detail view ── */
  if (selectedId && selectedOrder) {
    const colors = SHIPPING_COLORS[selectedOrder.shippingStatus] ?? SHIPPING_COLORS.PENDING;
    return (
      <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
        <button type="button" onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#F07826] transition-colors hover:bg-[#F07826] hover:text-white">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Volver a pedidos
        </button>

        <div className="rounded-2xl border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[#8b8d91]">Pedido</p>
              <h2 className="mt-1 break-all font-mono text-lg font-bold text-[#0C535B]">{selectedOrder.id}</h2>
              <p className="mt-2 text-sm text-[#6e7379]">{selectedOrder.customerName}</p>
              {selectedOrder.assignedSeller && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#f0fafa] px-3 py-1 text-xs font-semibold text-[#0C535B]">
                  👤 Vendedor: {selectedOrder.assignedSeller.fullName}
                </span>
              )}
              <p className="text-sm text-[#6e7379]">{selectedOrder.department}, {selectedOrder.city}</p>
              <p className="text-sm font-medium text-[#333]">{selectedOrder.addressLine1}{selectedOrder.addressLine2 ? `, ${selectedOrder.addressLine2}` : ""}</p>
              {selectedOrder.notes && (
                <p className="mt-2 rounded-xl bg-[#FEF3C7] px-3 py-1.5 text-xs text-[#92400E] inline-block">
                  <span className="font-bold">Nota:</span> {selectedOrder.notes}
                </p>
              )}
            </div>
            <span className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest"
              style={{ background: colors.bg, color: colors.text }}>
              {getShippingStatusLabel(selectedOrder.shippingStatus)}
            </span>
          </div>

          {/* Items */}
          <div className="mt-5 space-y-2">
            {selectedOrder.items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl border border-black/8 bg-[#fafaf9] px-4 py-3">
                {item.image && (
                  <Image src={item.image} alt={item.name} width={48} height={48} className="h-12 w-12 shrink-0 rounded-lg object-contain" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1f2328] truncate">{item.name}</p>
                  <p className="text-xs text-[#8b8d91]">Cantidad: {item.quantity}</p>
                </div>
                <p className="text-sm font-bold text-[#27B1B8]">{formatCurrency(item.lineTotal)}</p>
              </div>
            ))}
            <div className="flex justify-between rounded-xl bg-[#0C535B] px-4 py-3 text-sm font-bold text-white">
              <span>{selectedOrder.totalItems} producto{selectedOrder.totalItems === 1 ? "" : "s"}</span>
              <span>{formatCurrency(selectedOrder.subtotal)}</span>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5">
            <OrderProgress order={selectedOrder} />
          </div>

          {/* Edit form */}
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-[#333]">Estado de envío</span>
              <select value={form.shippingStatus}
                onChange={(e) => setForm((f) => ({ ...f, shippingStatus: e.target.value }))}
                className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm outline-none transition focus:border-[#F07826]">
                {SHIPPING_STATUSES.map((s) => (
                  <option key={s} value={s}>{getShippingStatusLabel(s)}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-[#333]">Transportadora</span>
              <input value={form.carrier}
                onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                placeholder="Ej. Coordinadora, Servientrega..."
                className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm outline-none transition focus:border-[#F07826]" />
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-semibold text-[#333]">Número de guía</span>
              <input value={form.trackingNumber}
                onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                placeholder="Ej. 123456789"
                className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm outline-none transition focus:border-[#F07826]" />
            </label>

            <label className="space-y-1.5 md:col-span-2">
              <span className="text-sm font-semibold text-[#333]">Notas internas</span>
              <textarea rows={3} value={form.adminNotes}
                onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
                placeholder="Ej. Sale hoy en la tarde, cliente pidió entregar en portería..."
                className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm outline-none transition focus:border-[#F07826]" />
            </label>
          </div>

          <div className="mt-5">
            <button type="button" onClick={saveOrder} disabled={saving}
              className="rounded-full bg-[#F07826] px-8 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
              {saving ? "Guardando…" : saved ? "✓ Guardado" : "Actualizar pedido"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── List view ── */
  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#F07826]">Área de Empaque</p>
        <h1 className="text-3xl font-black text-[#1A1A1A]">Pedidos para empacar</h1>
      </div>

      {/* Search + filters */}
      <div className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por pedido, cliente, ciudad o guía..."
          className="w-full rounded-xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm outline-none transition focus:border-[#F07826]" />

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => setShippingFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${shippingFilter === "all" ? "bg-[#F07826] text-white" : "border border-black/10 bg-[#fafaf9] text-[#5d6167] hover:bg-[#f0f0f0]"}`}>
            Todos ({orders.length})
          </button>
          {SHIPPING_STATUSES.map((s) => {
            const count = orders.filter((o) => o.shippingStatus === s).length;
            const colors = SHIPPING_COLORS[s];
            return (
              <button key={s} type="button" onClick={() => setShippingFilter(s)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${shippingFilter === s ? "ring-2 ring-offset-1" : "border border-black/10"}`}
                style={shippingFilter === s ? { background: colors.bg, color: colors.text } : { background: "#fafaf9", color: "#5d6167" }}>
                {getShippingStatusLabel(s)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Order list */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/12 bg-white p-8 text-center text-sm text-[#6e7379]">
            {orders.length === 0 ? "No hay pedidos aún." : "Ningún pedido coincide con los filtros."}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const colors = SHIPPING_COLORS[order.shippingStatus] ?? SHIPPING_COLORS.PENDING;
            const previewImages = order.items.filter((i): i is OrderItem & { image: string } => Boolean(i.image)).slice(0, 2);
            return (
              <button key={order.id} type="button" onClick={() => openOrder(order)}
                className="block w-full rounded-2xl border border-black/8 bg-white px-5 py-4 text-left shadow-[0_4px_12px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-0.5 hover:border-[#F07826]/30">
                <div className="flex items-start gap-4">
                  {previewImages.length > 0 ? (
                    <div className="flex shrink-0 gap-1.5">
                      {previewImages.map((item, i) => (
                        <div key={i} className="h-16 w-16 overflow-hidden rounded-xl border border-black/8 bg-white">
                          <Image src={item.image} alt="" width={64} height={64} className="h-full w-full object-contain p-1" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-[#0C535B] text-lg font-black text-white">
                      {order.totalItems}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs font-bold text-[#8b8d91]">{order.id.slice(-10).toUpperCase()}</p>
                      <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: colors.bg, color: colors.text }}>
                        {getShippingStatusLabel(order.shippingStatus)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-bold text-[#1f2328]">{order.customerName}</p>
                    <p className="text-sm text-[#6e7379]">{order.city}, {order.department}</p>
                    <p className="text-xs text-[#aaa]">{order.addressLine1}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-sm font-bold text-[#27B1B8]">{formatCurrency(order.subtotal)}</p>
                      <div className="flex items-center gap-2">
                        {order.assignedSeller && (
                          <span className="rounded-full bg-[#f0fafa] px-2.5 py-0.5 text-xs font-semibold text-[#0C535B]">
                            👤 {order.assignedSeller.fullName}
                          </span>
                        )}
                        <p className="text-xs text-[#aaa]">{new Date(order.createdAt).toLocaleDateString("es-CO")}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
