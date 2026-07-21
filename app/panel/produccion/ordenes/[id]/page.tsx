"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { SimpleSelect } from "../../../_components/simple-select";
import { fmtDateOnly } from "@/lib/date";

type ProductionOrderStatus = "DRAFT" | "APPROVED" | "IN_PRODUCTION" | "COMPLETED" | "CANCELLED";

const STATUS_META: Record<ProductionOrderStatus, { label: string; color: string; bg: string }> = {
  DRAFT:         { label: "Borrador",      color: "#64748B", bg: "#F1F5F9" },
  APPROVED:      { label: "Aprobada",      color: "#D97706", bg: "#FEF3C7" },
  IN_PRODUCTION: { label: "En producción", color: "#2563EB", bg: "#DBEAFE" },
  COMPLETED:     { label: "Completada",    color: "#16A34A", bg: "#DCFCE7" },
  CANCELLED:     { label: "Cancelada",     color: "#DC2626", bg: "#FEE2E2" },
};

const inputClass =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#27B1B8]";
const labelClass = "mb-1 block text-xs font-semibold text-[#64748B]";

type Product = { id: string; name: string; price: number; image: string; sku: string | null };

type OrderItem = {
  id: string;
  productId: string;
  product: { id: string; name: string; sku: string | null; image: string } | null;
  quantity: number;
  destination: string | null;
  notes: string | null;
  order: number;
};

type OrderDetail = {
  id: string;
  number: string;
  status: ProductionOrderStatus;
  productionDate: string;
  notes: string | null;
  createdBy: { id: string; fullName: string };
  approvedBy: { id: string; fullName: string } | null;
  approvedAt: string | null;
  items: OrderItem[];
  summary: { totalReferences: number; totalUnits: number; status: string };
};

export default function ProductionOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [newItem, setNewItem] = useState({ productId: "", quantity: "1", destination: "", notes: "" });
  const [addingItem, setAddingItem] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/panel/production-orders/${params.id}`);
    const d = await r.json();
    if (!r.ok) { setError(d.error ?? "No se pudo cargar la orden"); return; }
    setOrder(d);
    setNotesDraft(d.notes ?? "");
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/panel/production-orders/${params.id}`).then((r) => r.json()),
      fetch("/api/panel/products?minimal=1").then((r) => r.json()),
    ]).then(([o, prods]) => {
      if (cancelled) return;
      if (o.error) { setError(o.error); return; }
      setOrder(o);
      setNotesDraft(o.notes ?? "");
      setProducts(prods ?? []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  const isDraft = order?.status === "DRAFT";

  const summary = useMemo(() => {
    if (!order) return { totalReferences: 0, totalUnits: 0 };
    return {
      totalReferences: order.items.length,
      totalUnits: order.items.reduce((sum, i) => sum + i.quantity, 0),
    };
  }, [order]);

  const runTransition = async (action: "approve" | "start" | "complete" | "cancel") => {
    setTransitioning(true);
    setError(null);
    try {
      const r = await fetch(`/api/panel/production-orders/${params.id}/${action}`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo cambiar el estado"); return; }
      await load();
    } finally {
      setTransitioning(false);
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    setError(null);
    try {
      const r = await fetch(`/api/panel/production-orders/${params.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notes: notesDraft }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo guardar"); return; }
      await load();
    } finally {
      setSavingNotes(false);
    }
  };

  const addItem = async () => {
    if (!newItem.productId || !newItem.quantity) return;
    setAddingItem(true);
    setError(null);
    try {
      const r = await fetch(`/api/panel/production-orders/${params.id}/items`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: newItem.productId,
          quantity: parseInt(newItem.quantity, 10),
          destination: newItem.destination || null,
          notes: newItem.notes || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo agregar el producto"); return; }
      setNewItem({ productId: "", quantity: "1", destination: "", notes: "" });
      await load();
    } finally {
      setAddingItem(false);
    }
  };

  const removeItem = async (itemId: string) => {
    const r = await fetch(`/api/panel/production-orders/items/${itemId}`, { method: "DELETE" });
    if (r.ok) await load();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 lg:p-8">
        <div className="rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error ?? "Orden no encontrada"}</div>
      </div>
    );
  }

  const meta = STATUS_META[order.status];

  return (
    <div className="p-6 lg:p-8">
      <button onClick={() => router.push("/panel/produccion/ordenes")} className="mb-4 text-xs font-bold text-[#64748B] hover:text-[#27B1B8]">
        ← Volver a órdenes
      </button>

      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Orden de Producción</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">{order.number}</h1>
        </div>
        <span className="rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-widest" style={{ color: meta.color, background: meta.bg }}>
          {meta.label}
        </span>
      </div>

      {error && <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Bloque 1: Información general */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Información general</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Fecha de producción</label>
                <input value={fmtDateOnly(order.productionDate)} disabled className={`${inputClass} bg-[#F8FAFC] text-[#94A3B8]`} />
              </div>
              <div>
                <label className={labelClass}>Responsable</label>
                <input value={order.createdBy.fullName} disabled className={`${inputClass} bg-[#F8FAFC] text-[#94A3B8]`} />
              </div>
              {order.approvedBy && (
                <div>
                  <label className={labelClass}>Aprobado por</label>
                  <input value={order.approvedBy.fullName} disabled className={`${inputClass} bg-[#F8FAFC] text-[#94A3B8]`} />
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {order.status === "DRAFT" && (
                <button onClick={() => runTransition("approve")} disabled={transitioning} className="rounded-xl bg-[#D97706] px-4 py-2 text-xs font-black text-white hover:bg-[#B45309] disabled:opacity-60">
                  Aprobar
                </button>
              )}
              {order.status === "APPROVED" && (
                <button onClick={() => runTransition("start")} disabled={transitioning} className="rounded-xl bg-[#2563EB] px-4 py-2 text-xs font-black text-white hover:bg-[#1D4ED8] disabled:opacity-60">
                  Iniciar producción
                </button>
              )}
              {order.status === "IN_PRODUCTION" && (
                <button onClick={() => runTransition("complete")} disabled={transitioning} className="rounded-xl bg-[#16A34A] px-4 py-2 text-xs font-black text-white hover:bg-[#15803D] disabled:opacity-60">
                  Completar
                </button>
              )}
              {(order.status === "DRAFT" || order.status === "APPROVED") && (
                <button onClick={() => runTransition("cancel")} disabled={transitioning} className="rounded-xl border border-[#DC2626] px-4 py-2 text-xs font-black text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-60">
                  Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Bloque 2: Productos a fabricar */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Productos a fabricar</h2>
            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {["Producto", "Cantidad", "Destino", "Nota", ""].map((h) => (
                      <th key={h} className="border border-[#E2E8F0] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="border border-[#E2E8F0] px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          {item.product?.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.product.image} alt={item.product.name} className="h-8 w-8 shrink-0 rounded-lg border border-[#E2E8F0] object-cover" />
                          )}
                          <span>{item.product?.name}{item.product?.sku ? ` (${item.product.sku})` : ""}</span>
                        </div>
                      </td>
                      <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{item.quantity}</td>
                      <td className="border border-[#E2E8F0] px-2 py-1.5">{item.destination ?? "—"}</td>
                      <td className="border border-[#E2E8F0] px-2 py-1.5">{item.notes ?? "—"}</td>
                      <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">
                        {isDraft && (
                          <button onClick={() => removeItem(item.id)} className="text-xs font-bold text-[#DC2626] hover:opacity-70">Eliminar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {order.items.length === 0 && (
                    <tr><td colSpan={5} className="border border-[#E2E8F0] px-2 py-6 text-center text-sm text-[#94A3B8]">Sin productos agregados todavía</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {isDraft && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="col-span-2">
                  <label className={labelClass}>Producto</label>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const selected = products.find((p) => p.id === newItem.productId);
                      return selected ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={selected.image} alt={selected.name} className="h-9 w-9 shrink-0 rounded-lg border border-[#E2E8F0] object-cover" />
                      ) : null;
                    })()}
                    <div className="flex-1">
                      <SimpleSelect
                        value={newItem.productId}
                        options={[
                          { value: "", label: "— Seleccionar —" },
                          ...products.map((p) => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ""}` })),
                        ]}
                        onChange={(v) => setNewItem((f) => ({ ...f, productId: v }))}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Cantidad</label>
                  <input type="number" min={1} value={newItem.quantity} onChange={(e) => setNewItem((f) => ({ ...f, quantity: e.target.value }))} className={`no-spinner ${inputClass}`} />
                </div>
                <div>
                  <label className={labelClass}>Destino</label>
                  <input value={newItem.destination} onChange={(e) => setNewItem((f) => ({ ...f, destination: e.target.value }))} placeholder="Opcional" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Nota</label>
                  <input value={newItem.notes} onChange={(e) => setNewItem((f) => ({ ...f, notes: e.target.value }))} placeholder="Opcional" className={inputClass} />
                </div>
                <div className="col-span-2 sm:col-span-5">
                  <button
                    onClick={addItem}
                    disabled={!newItem.productId || !newItem.quantity || addingItem}
                    className="rounded-xl bg-[#27B1B8] px-4 py-2 text-xs font-black text-white hover:bg-[#1F9AA0] disabled:opacity-60"
                  >
                    {addingItem ? "Agregando…" : "+ Agregar producto"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bloque 3: Instrucciones de Producción */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Instrucciones de Producción</h2>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value)}
              disabled={!isDraft}
              rows={4}
              placeholder="Prioridades, cambios, notas especiales para planta…"
              className={`${inputClass} ${!isDraft ? "bg-[#F8FAFC] text-[#94A3B8]" : ""}`}
            />
            {isDraft && (
              <button
                onClick={saveNotes}
                disabled={savingNotes || notesDraft === (order.notes ?? "")}
                className="mt-3 rounded-xl bg-[#27B1B8] px-4 py-2 text-xs font-black text-white hover:bg-[#1F9AA0] disabled:opacity-60"
              >
                {savingNotes ? "Guardando…" : "Guardar instrucciones"}
              </button>
            )}
          </div>
        </div>

        {/* Bloque 4: Resumen */}
        <div className="h-fit rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Resumen</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
              <span className="text-sm text-[#64748B]">Total de referencias</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{summary.totalReferences}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
              <span className="text-sm text-[#64748B]">Total de unidades</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{summary.totalUnits}</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-[#27B1B8] bg-[#F0FAFA] px-3 py-3">
              <span className="text-sm font-black text-[#0C6060]">Estado actual</span>
              <span className="text-sm font-black" style={{ color: meta.color }}>{meta.label}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
