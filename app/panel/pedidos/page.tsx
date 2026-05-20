"use client";
import { useState, useEffect } from "react";

type OrderItem = {
  id: string; name: string; image: string; quantity: number; unitPrice: number; lineTotal: number;
};

type Order = {
  id: string;
  createdAt: string;
  status: string;
  shippingStatus: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company?: string;
  department: string;
  city: string;
  addressLine1: string;
  addressLine2?: string;
  notes?: string;
  carrier?: string;
  trackingNumber?: string;
  adminNotes?: string;
  subtotal: number;
  totalItems: number;
  items: OrderItem[];
  assignedSeller?: { fullName: string };
};

const SHIPPING_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "Pendiente",   color: "#D97706", bg: "#FEF3C7" },
  PREPARING: { label: "Preparando",  color: "#2563EB", bg: "#DBEAFE" },
  SHIPPED:   { label: "Enviado",     color: "#7C3AED", bg: "#EDE9FE" },
  DELIVERED: { label: "Entregado",   color: "#16A34A", bg: "#DCFCE7" },
  CANCELLED: { label: "Cancelado",   color: "#DC2626", bg: "#FEE2E2" },
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente pago", PAID: "Pagado", CANCELLED: "Cancelado",
};

function fmt(n: number) {
  return `$ ${n.toLocaleString("es-CO")}`;
}

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ shippingStatus: "", carrier: "", trackingNumber: "", adminNotes: "" });

  useEffect(() => {
    fetch("/api/panel/orders")
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const openOrder = (order: Order) => {
    setSelected(order);
    setForm({
      shippingStatus: order.shippingStatus ?? "PENDING",
      carrier: order.carrier ?? "",
      trackingNumber: order.trackingNumber ?? "",
      adminNotes: order.adminNotes ?? "",
    });
  };

  const saveOrder = async () => {
    if (!selected) return;
    setSaving(true);
    const res = await fetch("/api/panel/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, ...form }),
    });
    if (res.ok) {
      const updated = await res.json() as Order;
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
      setSelected((prev) => prev ? { ...prev, ...updated } : prev);
    }
    setSaving(false);
  };

  const waLink = (phone: string, name: string, orderId: string) => {
    const msg = `Hola ${name}, soy del equipo Kliniu. Te escribo sobre tu pedido #${orderId.slice(-6).toUpperCase()}. ¿En qué te puedo ayudar?`;
    return `https://wa.me/57${phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) return (
    <div className="flex h-full items-center justify-center p-12">
      <p className="text-sm text-[#94A3B8]">Cargando pedidos…</p>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">Panel Comercial</p>
        <h1 className="text-3xl font-black text-[#1A1A1A]">Mis Pedidos</h1>
        <p className="mt-1 text-sm text-[#64748B]">{orders.length} pedido{orders.length !== 1 ? "s" : ""} asignado{orders.length !== 1 ? "s" : ""}</p>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-16 text-center">
          <p className="text-4xl">📭</p>
          <p className="mt-3 text-sm font-semibold text-[#64748B]">Aún no tienes pedidos asignados</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const sh = SHIPPING_LABELS[order.shippingStatus] ?? SHIPPING_LABELS.PENDING;
            return (
              <div
                key={order.id}
                onClick={() => openOrder(order)}
                className="cursor-pointer rounded-2xl border border-[#E2E8F0] bg-white p-5 transition-all hover:border-[#27B1B8]/40 hover:shadow-[0_4px_20px_rgba(39,177,184,0.08)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#1A1A1A]">#{order.id.slice(-6).toUpperCase()}</span>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                        style={{ color: sh.color, background: sh.bg }}
                      >
                        {sh.label}
                      </span>
                      <span className="text-xs text-[#94A3B8]">{ORDER_STATUS_LABELS[order.status] ?? order.status}</span>
                    </div>
                    <p className="mt-1 truncate text-sm font-semibold text-[#334155]">{order.customerName}</p>
                    <p className="text-xs text-[#64748B]">{order.city}, {order.department}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-black text-[#0C535B]">{fmt(order.subtotal)}</p>
                    <p className="text-xs text-[#94A3B8]">{order.totalItems} producto{order.totalItems !== 1 ? "s" : ""}</p>
                    <p className="mt-1 text-[10px] text-[#CBD5E1]">
                      {new Date(order.createdAt).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>

                {/* Productos resumidos */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {order.items.slice(0, 3).map((item) => (
                    <span key={item.id} className="rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[11px] font-medium text-[#475569]">
                      {item.quantity}× {item.name}
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="rounded-lg bg-[#F1F5F9] px-2.5 py-1 text-[11px] text-[#94A3B8]">
                      +{order.items.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal detalle ── */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/30 backdrop-blur-[2px]" onClick={() => setSelected(null)}>
          <div
            className="relative h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E2E8F0] bg-white px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">Detalle del pedido</p>
                <h2 className="text-xl font-black text-[#1A1A1A]">#{selected.id.slice(-6).toUpperCase()}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-full border border-[#E2E8F0] p-2 hover:bg-[#F1F5F9]">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* Cliente */}
              <section className="rounded-2xl border border-[#E2E8F0] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Cliente</p>
                <p className="text-base font-black text-[#1A1A1A]">{selected.customerName}</p>
                {selected.company && <p className="text-sm text-[#475569]">{selected.company}</p>}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#27B1B8]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.18 2 2 0 0 1 3.6 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.6a16 16 0 0 0 6.06 6.06l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    {selected.customerPhone}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#475569]">
                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#27B1B8]" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {selected.customerEmail}
                  </div>
                </div>
                <a
                  href={waLink(selected.customerPhone, selected.customerName.split(" ")[0], selected.id)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2 text-sm font-bold text-white hover:opacity-90 transition-opacity"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  Contactar por WhatsApp
                </a>
              </section>

              {/* Dirección */}
              <section className="rounded-2xl border border-[#E2E8F0] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Dirección de envío</p>
                <p className="text-sm font-semibold text-[#1A1A1A]">{selected.addressLine1}</p>
                {selected.addressLine2 && <p className="text-sm text-[#475569]">{selected.addressLine2}</p>}
                <p className="text-sm text-[#475569]">{selected.city}, {selected.department}</p>
                {selected.notes && (
                  <div className="mt-2 rounded-xl bg-[#FEF3C7] px-3 py-2 text-xs text-[#92400E]">
                    <span className="font-bold">Nota:</span> {selected.notes}
                  </div>
                )}
              </section>

              {/* Productos */}
              <section className="rounded-2xl border border-[#E2E8F0] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Productos</p>
                <div className="space-y-2">
                  {selected.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#1A1A1A]">{item.name}</p>
                        <p className="text-xs text-[#94A3B8]">{item.quantity} × {fmt(item.unitPrice)}</p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-[#0C535B]">{fmt(item.lineTotal)}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[#E2E8F0] pt-3">
                  <p className="text-sm font-bold text-[#1A1A1A]">Total</p>
                  <p className="text-lg font-black text-[#0C535B]">{fmt(selected.subtotal)}</p>
                </div>
              </section>

              {/* Gestión envío */}
              <section className="rounded-2xl border border-[#E2E8F0] p-4">
                <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Gestión del envío</p>
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#475569]">Estado</label>
                    <select
                      value={form.shippingStatus}
                      onChange={(e) => setForm((f) => ({ ...f, shippingStatus: e.target.value }))}
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                    >
                      {Object.entries(SHIPPING_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#475569]">Transportadora</label>
                    <input
                      value={form.carrier}
                      onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
                      placeholder="Ej: Servientrega, Coordinadora…"
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#475569]">Número de guía</label>
                    <input
                      value={form.trackingNumber}
                      onChange={(e) => setForm((f) => ({ ...f, trackingNumber: e.target.value }))}
                      placeholder="Número de rastreo"
                      className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#475569]">Notas internas</label>
                    <textarea
                      rows={2}
                      value={form.adminNotes}
                      onChange={(e) => setForm((f) => ({ ...f, adminNotes: e.target.value }))}
                      placeholder="Observaciones del vendedor…"
                      className="w-full resize-none rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
                    />
                  </div>
                  <button
                    onClick={saveOrder}
                    disabled={saving}
                    className="w-full rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  >
                    {saving ? "Guardando…" : "Guardar cambios"}
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
