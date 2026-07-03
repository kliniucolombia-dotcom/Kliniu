"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

type ProductionOrderStatus = "DRAFT" | "APPROVED" | "IN_PRODUCTION" | "COMPLETED" | "CANCELLED";

const STATUS_META: Record<ProductionOrderStatus, { label: string; color: string; bg: string }> = {
  DRAFT:         { label: "Borrador",      color: "#64748B", bg: "#F1F5F9" },
  APPROVED:      { label: "Aprobada",      color: "#D97706", bg: "#FEF3C7" },
  IN_PRODUCTION: { label: "En producción", color: "#2563EB", bg: "#DBEAFE" },
  COMPLETED:     { label: "Completada",    color: "#16A34A", bg: "#DCFCE7" },
  CANCELLED:     { label: "Cancelada",     color: "#DC2626", bg: "#FEE2E2" },
};

type ProductionOrderListItem = {
  id: string;
  number: string;
  status: ProductionOrderStatus;
  productionDate: string;
  createdByName: string;
  summary: { totalReferences: number; totalUnits: number; status: string };
};

export default function ProductionOrdersListPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<ProductionOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/panel/production-orders");
      const d = await r.json();
      setOrders(d.orders ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!newDate) { setError("Selecciona una fecha"); return; }
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/panel/production-orders", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productionDate: newDate }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo crear"); return; }
      router.push(`/panel/produccion/ordenes/${d.id}`);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Planta</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Órdenes de Producción</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Planificación de fabricación: qué productos deben producirse</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition hover:bg-[#1F9AA0]"
        >
          + Nueva orden
        </button>
      </div>

      {error && !showNewModal && (
        <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#94A3B8]">
          Sin órdenes de producción todavía. Crea la primera.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {["Número", "Fecha", "Responsable", "Estado", "Referencias", "Unidades"].map((h) => (
                  <th key={h} className="border-b border-[#E2E8F0] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const meta = STATUS_META[o.status];
                return (
                  <tr key={o.id} className="hover:bg-[#F8FAFC]">
                    <td className="border-b border-[#F1F5F9] px-4 py-3">
                      <button onClick={() => router.push(`/panel/produccion/ordenes/${o.id}`)} className="font-bold text-[#27B1B8] hover:underline">
                        {o.number}
                      </button>
                    </td>
                    <td className="border-b border-[#F1F5F9] px-4 py-3 text-[#64748B]">{new Date(o.productionDate).toLocaleDateString("es-CO")}</td>
                    <td className="border-b border-[#F1F5F9] px-4 py-3 text-[#1A1A1A]">{o.createdByName}</td>
                    <td className="border-b border-[#F1F5F9] px-4 py-3">
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest" style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="border-b border-[#F1F5F9] px-4 py-3 font-bold text-[#1A1A1A]">{o.summary.totalReferences}</td>
                    <td className="border-b border-[#F1F5F9] px-4 py-3 font-bold text-[#1A1A1A]">{o.summary.totalUnits}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">Nueva orden de producción</h3>
            <p className="mt-2 text-sm text-[#64748B]">Selecciona la fecha de producción.</p>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-4 w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
            />
            {error && <p className="mt-2 text-xs font-semibold text-[#DC2626]">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => { setShowNewModal(false); setError(null); }}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancelar
              </button>
              <button
                onClick={create}
                disabled={creating}
                className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0] disabled:opacity-60"
              >
                {creating ? "Creando…" : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
