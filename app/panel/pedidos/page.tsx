"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { SimpleSelect } from "../_components/simple-select";
import Image from "next/image";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type OrderItem = {
  id: string; name: string; image?: string | null; quantity: number; unitPrice: number; lineTotal: number; sku?: string | null;
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
  odooOrderId?: number | null;
  odooOrderName?: string | null;
  odooSyncStatus?: string;
  odooSyncError?: string | null;
};

type OrderForm = { shippingStatus: string; carrier: string; trackingNumber: string; adminNotes: string };

const SHIPPING_STATUSES = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"] as const;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push("...");
    result.push(p);
  });
  return result;
}

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
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8b8d91]">Flujo del pedido</p>
          <p className="mt-2 text-sm leading-7 text-[#6e7379]">Muestra el mismo progreso que verá el cliente en su cuenta.</p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#0C535B] shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
          {getShippingStatusLabel(order.shippingStatus)}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <div className="relative min-w-[300px] px-1 py-2 sm:min-w-[560px]">
          <div className="pointer-events-none absolute left-[12.5%] right-[12.5%] top-4 z-0 sm:top-6">
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
                <div key={step.label} className="relative flex min-w-0 flex-1 flex-col items-center text-center sm:min-w-[120px]">
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border sm:h-12 sm:w-12 ${isCompleted ? "border-[#27B1B8] bg-[#27B1B8] text-white" : "border-black/10 bg-[#f8f8f7] text-[#8b8d91]"} ${isCurrent ? "shadow-[0_10px_24px_rgba(237,132,53,0.2)]" : ""}`}>
                    {step.icon}
                  </span>
                  <div className="mt-2 px-0.5 sm:mt-3">
                    <p className={`text-[11px] font-semibold leading-tight sm:text-sm ${isCompleted ? "text-[#0C535B]" : "text-[#8b8d91]"}`}>{step.label}</p>
                    {isCurrent && <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-[#27B1B8] sm:text-xs sm:tracking-[0.14em]">Actual</p>}
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

const DATE_PRESETS = [
  { value: "all", label: "Todos" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "Esta semana" },
  { value: "month", label: "Este mes" },
  { value: "30d", label: "Últimos 30 días" },
] as const;

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const STATUS_CARD_STYLES: Record<string, { bg: string; text: string }> = {
  all: { bg: "bg-[#EAF8F6]", text: "text-[#27B1B8]" },
  PENDING: { bg: "bg-[#FFF7ED]", text: "text-[#C2410C]" },
  PREPARING: { bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]" },
  SHIPPED: { bg: "bg-[#F5F3FF]", text: "text-[#6D28D9]" },
  DELIVERED: { bg: "bg-[#F0FDF4]", text: "text-[#15803D]" },
  CANCELLED: { bg: "bg-[#FEF2F2]", text: "text-[#DC2626]" },
};

export default function PedidosPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [shippingFilter, setShippingFilter] = useState<"all" | string>("all");
  const [datePreset, setDatePreset] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [form, setForm] = useState<OrderForm>({ shippingStatus: "", carrier: "", trackingNumber: "", adminNotes: "" });
  const [isRetryingOdoo, setIsRetryingOdoo] = useState(false);

  const loadOrders = useCallback(() => {
    fetch("/api/panel/orders")
      .then((r) => r.json())
      .then((d) => setOrders(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useRealtimeRefresh(["orders"], loadOrders);

  const customers = useMemo(() => {
    const names = Array.from(new Set(orders.map((o) => o.customerName))).sort();
    return names;
  }, [orders]);

  const matchesDatePreset = (createdAt: string, preset: string) => {
    if (preset === "all") return true;
    const d = new Date(createdAt);
    const now = new Date();
    if (preset === "today") {
      return d.toDateString() === now.toDateString();
    }
    if (preset === "week") {
      const dayOfWeek = (now.getDay() + 6) % 7; // lunes = 0
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - dayOfWeek);
      weekStart.setHours(0, 0, 0, 0);
      return d >= weekStart;
    }
    if (preset === "month") {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    if (preset === "30d") {
      const cutoff = new Date(now);
      cutoff.setDate(now.getDate() - 30);
      return d >= cutoff;
    }
    return true;
  };

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesSearch = !q || o.id.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q) || (o.trackingNumber ?? "").toLowerCase().includes(q) || o.items.some((it) => (it.sku ?? "").toLowerCase().includes(q));
      const matchesFilter = shippingFilter === "all" || o.shippingStatus === shippingFilter;
      const matchesDate = matchesDatePreset(o.createdAt, datePreset);
      const matchesCustomer = customerFilter === "all" || o.customerName === customerFilter;
      return matchesSearch && matchesFilter && matchesDate && matchesCustomer;
    });
  }, [orders, search, shippingFilter, datePreset, customerFilter]);

  useEffect(() => { setPage(1); }, [search, shippingFilter, datePreset, customerFilter, perPage]);

  const pageCount = Math.max(1, Math.ceil(filteredOrders.length / perPage));
  const pagedOrders = filteredOrders.slice((page - 1) * perPage, page * perPage);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length };
    for (const s of SHIPPING_STATUSES) counts[s] = orders.filter((o) => o.shippingStatus === s).length;
    return counts;
  }, [orders]);

  const exportCsv = () => {
    const header = ["Pedido", "Cliente", "Fecha", "Total", "Estado pago", "Estado envío", "Guía"];
    const rows = filteredOrders.map((o) => [
      o.id, o.customerName, new Date(o.createdAt).toLocaleDateString("es-CO"),
      String(o.subtotal), getPaymentStatusLabel(o.paymentStatus ?? o.status), getShippingStatusLabel(o.shippingStatus), o.trackingNumber ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pedidos-kliniu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const onRetryOdoo = async (orderId: string) => {
    setIsRetryingOdoo(true);
    const res = await fetch(`/api/orders/${orderId}/sync-odoo`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? {
              ...o,
              odooOrderId: data.odooOrderId ?? o.odooOrderId,
              odooOrderName: data.odooOrderName ?? o.odooOrderName,
              odooSyncStatus: data.odooSyncStatus ?? o.odooSyncStatus,
              odooSyncError: res.ok ? null : data.error ?? o.odooSyncError,
            }
          : o,
      ),
    );
    setIsRetryingOdoo(false);
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
              {selectedOrder.odooSyncStatus === "SYNCED" && (
                <span className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#333]" title={selectedOrder.odooOrderName ?? undefined}>
                  Odoo: {selectedOrder.odooOrderName}
                </span>
              )}
              {selectedOrder.odooSyncStatus === "FAILED" && (
                <button
                  type="button"
                  onClick={() => onRetryOdoo(selectedOrder.id)}
                  disabled={isRetryingOdoo}
                  className="rounded-full border border-[#c0392b]/30 bg-[#FDECEA] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#c0392b] hover:bg-[#c0392b] hover:text-white disabled:opacity-60"
                  title={selectedOrder.odooSyncError ?? undefined}
                >
                  {isRetryingOdoo ? "Sincronizando..." : "Reintentar Odoo"}
                </button>
              )}
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
                        {item.sku && (
                          <p className="mt-0.5 text-xs text-[#8b8d91]">Código: <span className="font-medium text-[#5d6167]">{item.sku}</span></p>
                        )}
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
              <SimpleSelect
                value={form.shippingStatus}
                options={SHIPPING_STATUSES.map((s) => ({ value: s, label: getShippingStatusLabel(s) }))}
                onChange={(v) => setForm((f) => ({ ...f, shippingStatus: v }))}
              />
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
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">Panel Comercial</p>
          <h1 className="text-3xl font-black text-[#1A1A1A]">Mis Pedidos</h1>
          <p className="mt-1 text-sm text-[#6e7379]">Consulta y gestiona todos los pedidos de tus clientes.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:text-[#0C535B]"
          >
            <IconDownload /> Exportar
          </button>
        </div>
      </div>

      {/* Search + filters */}
      <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <label className="space-y-2">
            <span className="text-sm font-medium text-[#4f545a]">Buscar</span>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b8d91]"><IconSearch /></span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pedido, cliente, guía o SKU..."
                className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] py-3 pl-10 pr-4 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#4f545a]">Estado</span>
            <SimpleSelect
              value={shippingFilter}
              options={[{ value: "all", label: "Todos" }, ...SHIPPING_STATUSES.map((s) => ({ value: s, label: getShippingStatusLabel(s) }))]}
              onChange={(v) => setShippingFilter(v)}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#4f545a]">Fecha</span>
            <SimpleSelect
              value={datePreset}
              options={DATE_PRESETS.map((d) => ({ value: d.value, label: d.label }))}
              onChange={(v) => setDatePreset(v)}
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-[#4f545a]">Cliente</span>
            <SimpleSelect
              value={customerFilter}
              options={[{ value: "all", label: "Todos" }, ...customers.map((c) => ({ value: c, label: c }))]}
              onChange={(v) => setCustomerFilter(v)}
            />
          </label>
        </div>

        {/* Quick filters */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8d91]">Filtros rápidos</span>
          {DATE_PRESETS.filter((d) => d.value !== "all").map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDatePreset(datePreset === d.value ? "all" : d.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors duration-200 ${datePreset === d.value ? "bg-[#0C535B] text-white" : "border border-black/10 bg-[#fafaf9] text-[#5d6167] hover:bg-[#ececea]"}`}
            >
              {d.label}
            </button>
          ))}
          {(search || shippingFilter !== "all" || datePreset !== "all" || customerFilter !== "all") && (
            <button
              type="button"
              onClick={() => { setSearch(""); setShippingFilter("all"); setDatePreset("all"); setCustomerFilter("all"); }}
              className="ml-auto text-xs font-semibold text-[#27B1B8] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[{ value: "all", label: "Todos" }, ...SHIPPING_STATUSES.map((s) => ({ value: s, label: getShippingStatusLabel(s) }))].map((s) => {
          const style = STATUS_CARD_STYLES[s.value] ?? STATUS_CARD_STYLES.all;
          const active = shippingFilter === s.value;
          return (
            <button
              key={s.value}
              type="button"
              onClick={() => setShippingFilter(s.value)}
              className={`rounded-[1.2rem] border px-4 py-4 text-left transition-all duration-200 ${style.bg} ${active ? "border-[#27B1B8] shadow-[0_10px_22px_rgba(39,177,184,0.18)]" : "border-black/8 hover:-translate-y-0.5"}`}
            >
              <p className={`text-2xl font-bold ${style.text}`}>{statusCounts[s.value] ?? 0}</p>
              <p className="mt-1 text-xs font-semibold text-[#5d6167]">{s.label}</p>
              <p className="text-[11px] text-[#8b8d91]">Pedidos</p>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                <th className="p-4">Pedido</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Total</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Guía / seguimiento</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {pagedOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-sm text-[#6e7379]">
                    {orders.length === 0 ? "Aún no tienes pedidos asignados." : "Ningún pedido coincide con los filtros."}
                  </td>
                </tr>
              ) : (
                pagedOrders.map((order) => {
                  const previewImage = order.items.find((it) => it.image)?.image;
                  return (
                    <tr key={order.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-black/8 bg-[#fafaf9]">
                            {previewImage ? (
                              <Image src={previewImage} alt="" width={40} height={40} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-semibold uppercase text-[#8b8d91]">{order.items[0]?.name?.slice(0, 2) ?? "UP"}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="max-w-[160px] truncate text-sm font-semibold text-[#1f2328]">{order.id}</p>
                            <p className="text-xs text-[#8b8d91]">{order.totalItems} producto{order.totalItems === 1 ? "" : "s"} · SKU {order.items[0]?.sku ?? "—"}</p>
                            {order.assignedSeller && <p className="text-xs font-medium text-[#0C535B]">👤 {order.assignedSeller.fullName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="font-medium text-[#1f2328]">{order.customerName}</p>
                        <p className="text-xs text-[#8b8d91]">{order.city}</p>
                      </td>
                      <td className="p-4 text-[#5d6167]">
                        {new Date(order.createdAt).toLocaleDateString("es-CO")}
                        <p className="text-xs text-[#8b8d91]">{new Date(order.createdAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="p-4 font-semibold text-[#0C535B]">{formatCurrency(order.subtotal)}</td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="w-fit rounded-full bg-[#EAF8F6] px-2.5 py-0.5 text-xs font-semibold text-[#0C535B]">{getPaymentStatusLabel(order.paymentStatus ?? order.status)}</span>
                          <span className="w-fit rounded-full bg-[#effaf2] px-2.5 py-0.5 text-xs font-semibold text-[#1f6b39]">{getShippingStatusLabel(order.shippingStatus)}</span>
                        </div>
                      </td>
                      <td className="p-4 text-[#5d6167]">
                        {order.trackingNumber ? (
                          <span className="font-medium">{order.trackingNumber}</span>
                        ) : (
                          <span className="text-[#8b8d91]">—</span>
                        )}
                        {order.carrier && <p className="text-xs text-[#8b8d91]">{order.carrier}</p>}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          onClick={() => openOrder(order)}
                          title="Ver pedido"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-[#5d6167] transition-colors duration-200 hover:border-[#0C535B] hover:text-[#0C535B]"
                        >
                          <IconEye />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-4 py-3 text-sm text-[#6e7379]">
          <span>
            Mostrando {filteredOrders.length === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, filteredOrders.length)} de {filteredOrders.length} pedidos
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40"
            >
              ‹
            </button>
            {getPageNumbers(page, pageCount).map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className="px-1 text-[#8b8d91]">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors duration-200 ${p === page ? "bg-[#0C535B] text-white" : "border border-black/10 text-[#5d6167] hover:bg-[#ececea]"}`}
                >
                  {p}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40"
            >
              ›
            </button>
          </div>
          <SimpleSelect
            value={String(perPage)}
            options={[{ value: "10", label: "10 por página" }, { value: "20", label: "20 por página" }, { value: "50", label: "50 por página" }]}
            onChange={(v) => setPerPage(Number(v))}
            className="w-40"
            openUp
          />
        </div>
      </div>
    </div>
  );
}
