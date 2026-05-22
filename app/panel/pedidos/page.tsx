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

function getShippingStatusLabel(status: string) {
  if (status === "PREPARING") return "En preparación";
  if (status === "SHIPPED") return "Enviado";
  if (status === "DELIVERED") return "Entregado";
  if (status === "CANCELLED") return "Cancelado";
  return "Pendiente";
}

function getPaymentStatusLabel(status: string) {
  if (status === "PAID") return "Pago confirmado";
  if (status === "FAILED") return "Pago fallido";
  return "Pago pendiente";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function getProgressStep(shippingStatus: string, paymentStatus?: string) {
  if (shippingStatus === "DELIVERED") return 3;
  if (shippingStatus === "SHIPPED") return 2;
  if (shippingStatus === "PREPARING") return 1;
  if (paymentStatus === "PAID") return 0;
  return -1;
}

function OrderProgress({ order }: { order: Order }) {
  const activeStep = getProgressStep(order.shippingStatus, order.paymentStatus);
  const steps = [
    {
      label: "Pedido confirmado",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h9l3 3v15H6z" /><path d="M15 3v3h3" /><path d="M9 12h6" /><path d="M9 16h4" />
        </svg>
      ),
    },
    {
      label: "En preparación",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 4 7l8 4 8-4-8-4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" />
        </svg>
      ),
    },
    {
      label: "Enviado",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7h11v8H3z" /><path d="M14 10h3l4 3v2h-7z" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" />
        </svg>
      ),
    },
    {
      label: "Recibido",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 12 4 4L19 6" />
        </svg>
      ),
    },
  ];

  return (
    <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Flujo del pedido</p>
          <p className="mt-2 text-sm leading-7 text-[#6e7379]">Muestra el mismo progreso que verá el cliente en su cuenta.</p>
        </div>
        <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0C535B] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
          {getShippingStatusLabel(order.shippingStatus)}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="relative min-w-[560px] px-1 py-2">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-6 z-0">
            <span className="block h-[6px] rounded-full bg-[#d9dde4] shadow-[inset_0_1px_2px_rgba(15,23,42,0.08)]" />
            <span
              className="absolute left-0 top-0 h-[6px] rounded-full bg-gradient-to-r from-[#27B1B8] to-[#f4a261] shadow-[0_6px_16px_rgba(237,132,53,0.25)] transition-all duration-300"
              style={{ width: activeStep < 0 ? "0%" : `${(activeStep / (steps.length - 1)) * 100}%` }}
            />
          </div>
          <div className="relative flex items-start justify-between gap-0">
            {steps.map((step, index) => {
              const isCompleted = activeStep >= 0 && index <= activeStep;
              const isCurrent = index === activeStep;
              return (
                <div key={step.label} className="relative flex min-w-[120px] flex-1 flex-col items-center text-center">
                  <span className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${isCompleted ? "border-[#27B1B8] bg-[#27B1B8] text-white" : "border-black/10 bg-[#f8f8f7] text-[#8b8d91]"} ${isCurrent ? "shadow-[0_10px_24px_rgba(237,132,53,0.2)]" : ""}`}>
                    {step.icon}
                  </span>
                  <div className="mt-3">
                    <p className={`text-sm font-semibold ${isCompleted ? "text-[#0C535B]" : "text-[#8b8d91]"}`}>{step.label}</p>
                    {isCurrent && <p className="mt-1 text-xs font-medium uppercase tracking-[0.14em] text-[#27B1B8]">Actual</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [shippingFilter, setShippingFilter] = useState<"all" | string>("all");
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
      const matchesSearch = !q || o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || (o.trackingNumber ?? "").toLowerCase().includes(q);
      const matchesFilter = shippingFilter === "all" || o.shippingStatus === shippingFilter;
      return matchesSearch && matchesFilter;
    });
  }, [orders, search, shippingFilter]);

  const selectedOrder = orders.find((o) => o.id === selectedId) ?? null;

  const openOrder = (order: Order) => {
    setSelectedId(order.id);
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
    }
    setSaving(false);
  };

  const waLink = (phone: string, name: string, orderId: string) => {
    const msg = `Hola ${name}, soy del equipo Kliniu. Te escribo sobre tu pedido #${orderId.slice(-6).toUpperCase()}. ¿En qué te puedo ayudar?`;
    return `https://wa.me/57${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
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
    return (
      <div className="min-h-full bg-[#f5f5f5] p-6 space-y-6">
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
          Atrás
        </button>

        {/* Order header */}
        <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8b8d91]">Pedido seleccionado</p>
              <h3 className="mt-2 break-all text-2xl font-semibold tracking-[-0.04em] text-[#0C535B]">{selectedOrder.id}</h3>
              <p className="mt-3 text-sm leading-7 text-[#6e7379]">
                {selectedOrder.customerName} · {selectedOrder.customerEmail} · {selectedOrder.customerPhone}
              </p>
              {selectedOrder.assignedSeller && (
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#f0fafa] px-3 py-1 text-xs font-semibold text-[#0C535B]">
                  👤 Vendedor: {selectedOrder.assignedSeller.fullName}
                </p>
              )}
              <p className="text-sm leading-7 text-[#6e7379]">
                {selectedOrder.department}, {selectedOrder.city} · {selectedOrder.addressLine1}
                {selectedOrder.addressLine2 ? ` · ${selectedOrder.addressLine2}` : ""}
              </p>
              {selectedOrder.notes && (
                <p className="mt-1 rounded-xl bg-[#FEF3C7] px-3 py-1.5 text-xs text-[#92400E] inline-block">
                  <span className="font-bold">Nota del cliente:</span> {selectedOrder.notes}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-[#0C535B] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                {selectedOrder.status === "PAID" ? "Pagado" : selectedOrder.status === "CANCELLED" ? "Cancelado" : "Pendiente"}
              </span>
              <span className="rounded-full border border-[#27B1B8]/18 bg-[#EAF8F6] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0C535B]">
                {getPaymentStatusLabel(selectedOrder.paymentStatus ?? selectedOrder.status)}
              </span>
              <span className="rounded-full border border-[#1f8b45]/18 bg-[#effaf2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#1f6b39]">
                {getShippingStatusLabel(selectedOrder.shippingStatus)}
              </span>
            </div>
          </div>

          {/* Items + totals */}
          <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_320px]">
            <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8b8d91]">Resumen del pedido</p>
                  <p className="mt-2 text-sm text-[#6e7379]">Revisa qué compró el cliente antes de actualizar envío y guía.</p>
                </div>
                <span className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0C535B] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                  {selectedOrder.totalItems} producto{selectedOrder.totalItems === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-5 space-y-3">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="rounded-[1rem] border border-black/8 bg-white px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#1f2328]">{item.name}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8b8d91]">Cantidad</p>
                        <p className="mt-1 text-sm font-medium text-[#5d6167]">{item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-[#8b8d91]">Precio unidad</p>
                        <p className="mt-1 text-sm font-semibold text-[#0C535B]">{formatCurrency(item.unitPrice)}</p>
                        <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#8b8d91]">Subtotal</p>
                        <p className="mt-1 text-sm font-semibold text-[#27B1B8]">{formatCurrency(item.lineTotal)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-3 content-start">
              <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Total del pedido</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[#27B1B8]">{formatCurrency(selectedOrder.subtotal)}</p>
              </div>
              <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Transportadora actual</p>
                <p className="mt-2 text-sm font-semibold text-[#0C535B]">{selectedOrder.carrier || "Por definir"}</p>
              </div>
              <div className="rounded-[1.4rem] border border-black/8 bg-[#fafaf9] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Guía actual</p>
                <p className="mt-2 text-sm font-semibold text-[#0C535B]">{selectedOrder.trackingNumber || "Aún no asignada"}</p>
              </div>
              {/* WhatsApp — seller exclusive */}
              <a
                href={waLink(selectedOrder.customerPhone, selectedOrder.customerName.split(" ")[0], selectedOrder.id)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-[1.4rem] bg-[#25D366] px-5 py-4 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Contactar al cliente
              </a>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-6">
            <OrderProgress order={selectedOrder} />
          </div>

          {/* Edit form */}
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm font-medium text-[#4f545a]">Estado de envío</span>
              <select
                value={form.shippingStatus}
                onChange={(e) => setForm((f) => ({ ...f, shippingStatus: e.target.value }))}
                className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
              >
                {SHIPPING_STATUSES.map((s) => (
                  <option key={s} value={s}>{getShippingStatusLabel(s)}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[#4f545a]">Transportadora</span>
              <input
                value={form.carrier}
                onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                placeholder="Ej. Coordinadora, Servientrega..."
                className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-medium text-[#4f545a]">Número de guía</span>
              <input
                value={form.trackingNumber}
                onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                placeholder="Ej. 123456789"
                className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
              />
            </label>

            <label className="space-y-2 md:col-span-2">
              <span className="text-sm font-medium text-[#4f545a]">Notas internas del envío</span>
              <textarea
                rows={4}
                value={form.adminNotes}
                onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
                placeholder="Ej. Sale hoy en la tarde, cliente pidió entregar en portería..."
                className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={saveOrder}
              disabled={saving}
              className="inline-flex rounded-full bg-[#0C535B] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? "Guardando..." : "Actualizar pedido"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── List view ── */
  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">Panel Comercial</p>
        <h1 className="text-3xl font-black text-[#1A1A1A]">Mis Pedidos</h1>
      </div>

      {/* Search + filters */}
      <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <label className="space-y-2">
          <span className="text-sm font-medium text-[#4f545a]">Buscar por pedido, cliente o guía</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ej: cm..., nombre, 123456..."
            className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
          />
        </label>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShippingFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${shippingFilter === "all" ? "bg-[#0C535B] text-white" : "border border-black/10 bg-[#fafaf9] text-[#5d6167] hover:bg-[#ececea]"}`}
          >
            Todos
          </button>
          {SHIPPING_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setShippingFilter(s)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-200 ${shippingFilter === s ? "bg-[#6366f1] text-white" : "border border-black/10 bg-[#fafaf9] text-[#5d6167] hover:bg-[#ececea]"}`}
            >
              {getShippingStatusLabel(s)}
            </button>
          ))}
        </div>

        <p className="mt-5 text-sm text-[#6e7379]">
          Mostrando {filteredOrders.length} pedido{filteredOrders.length === 1 ? "" : "s"}.
        </p>
      </div>

      {/* Order list */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="rounded-[1.5rem] border border-dashed border-black/12 bg-white p-8 text-center text-sm leading-7 text-[#6e7379] shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            {orders.length === 0 ? "Aún no tienes pedidos asignados." : "Ningún pedido coincide con los filtros."}
          </div>
        ) : (
          filteredOrders.map((order) => {
            const previewImages = order.items
              .filter((item): item is OrderItem & { image: string } => Boolean(item.image))
              .slice(0, 3);

            return (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrder(order)}
                className="block w-full rounded-[1.5rem] border border-black/8 bg-white px-5 py-5 text-left shadow-[0_14px_28px_rgba(15,23,42,0.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#0C535B]/18"
              >
                <div className="flex items-start gap-4">
                  {/* Text info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold uppercase tracking-[0.22em] text-[#8b8d91]">Pedido</p>
                    <p className="mt-2 break-all text-base font-semibold leading-snug text-[#1f2328]">{order.id}</p>
                    <p className="mt-2 text-sm text-[#5d6167]">{order.customerName} · {order.city}</p>
                    <p className="mt-0.5 text-sm text-[#7a7f86]">
                      {new Date(order.createdAt).toLocaleDateString("es-CO")} · {order.totalItems} producto{order.totalItems === 1 ? "" : "s"}
                    </p>
                    {order.assignedSeller && (
                      <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#f0fafa] px-2.5 py-0.5 text-xs font-semibold text-[#0C535B]">
                        👤 {order.assignedSeller.fullName}
                      </p>
                    )}
                    <p className="mt-3 text-xl font-semibold text-[#27B1B8]">{formatCurrency(order.subtotal)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#EAF8F6] px-3 py-1 text-xs font-semibold text-[#0C535B]">
                        {getPaymentStatusLabel(order.paymentStatus ?? order.status)}
                      </span>
                      <span className="rounded-full bg-[#effaf2] px-3 py-1 text-xs font-semibold text-[#1f6b39]">
                        {getShippingStatusLabel(order.shippingStatus)}
                      </span>
                    </div>
                    <div className="mt-3 border-t border-black/8 pt-3">
                      <p className="line-clamp-1 text-[13px] text-[#7a7f86]">
                        {order.items[0]?.name || "Pedido con productos varios"}
                      </p>
                    </div>
                  </div>

                  {/* Image + arrow */}
                  <div className="flex shrink-0 flex-col items-end gap-3">
                    {previewImages.length > 0 ? (
                      <div className="flex gap-2">
                        {previewImages.map((item, index) => (
                          <div key={`${order.id}-img-${index}`} className="h-[88px] w-[88px] overflow-hidden rounded-[0.95rem] border border-black/8 bg-white shadow-[0_10px_20px_rgba(15,23,42,0.10)]">
                            <Image
                              src={item.image}
                              alt={`Producto ${index + 1}`}
                              width={88}
                              height={88}
                              sizes="88px"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex h-[88px] w-[88px] items-center justify-center rounded-[0.95rem] border border-black/8 bg-[#0C535B] text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-[0_10px_20px_rgba(15,23,42,0.10)]">
                        {order.items[0]?.name?.slice(0, 2) || "UP"}
                      </div>
                    )}
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#27B1B8]">
                      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                        <path d="m8 5 8 7-8 7z" />
                      </svg>
                    </span>
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
