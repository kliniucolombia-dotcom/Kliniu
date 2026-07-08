"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type QuotationStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED";

const STATUS_META: Record<QuotationStatus, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: "Borrador", color: "#64748B", bg: "#F1F5F9" },
  SENT:     { label: "Enviada",  color: "#D97706", bg: "#FEF3C7" },
  APPROVED: { label: "Aprobada", color: "#16A34A", bg: "#DCFCE7" },
  REJECTED: { label: "Rechazada", color: "#DC2626", bg: "#FEE2E2" },
  EXPIRED:  { label: "Vencida",  color: "#94A3B8", bg: "#F1F5F9" },
};

type QuotationListItem = {
  id: string;
  number: string;
  status: QuotationStatus;
  clientName: string;
  createdAt: string;
  summary: { total: number };
};

type Client = { id: string; fullName: string; company: string | null };

export default function CotizacionesListPage() {
  const router = useRouter();
  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [qr, cr] = await Promise.all([
        fetch("/api/panel/quotations"),
        fetch("/api/panel/clients"),
      ]);
      const qd = await qr.json();
      const cd = await cr.json();
      setQuotations(qd.quotations ?? []);
      setClients(Array.isArray(cd) ? cd : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!selectedClientId) { setError("Selecciona un cliente"); return; }
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/panel/quotations", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: selectedClientId }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo crear"); return; }
      router.push(`/panel/cotizaciones/${d.id}`);
    } finally {
      setCreating(false);
    }
  };

  const confirmRemove = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const r = await fetch(`/api/panel/quotations/${id}`, { method: "DELETE" });
    if (r.ok) setQuotations((prev) => prev.filter((q) => q.id !== id));
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Cotizaciones Comerciales</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Genera y da seguimiento a cotizaciones para tus clientes</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition hover:bg-[#1F9AA0]"
        >
          + Nueva cotización
        </button>
      </div>

      {error && !showNewModal && (
        <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
        </div>
      ) : quotations.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#94A3B8]">
          Sin cotizaciones todavía. Crea la primera.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {["Número", "Cliente", "Estado", "Total", "Fecha"].map((h) => (
                  <th key={h} className="border-b border-[#E2E8F0] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                ))}
                <th className="sticky right-0 border-b border-l border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]"></th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((q) => {
                const meta = STATUS_META[q.status];
                return (
                  <tr key={q.id} className="hover:bg-[#F8FAFC]">
                    <td className="border-b border-[#F1F5F9] px-4 py-3">
                      <button onClick={() => router.push(`/panel/cotizaciones/${q.id}`)} className="font-bold text-[#27B1B8] hover:underline">
                        {q.number}
                      </button>
                    </td>
                    <td className="border-b border-[#F1F5F9] px-4 py-3 text-[#1A1A1A]">{q.clientName}</td>
                    <td className="border-b border-[#F1F5F9] px-4 py-3">
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest" style={{ color: meta.color, background: meta.bg }}>
                        {meta.label}
                      </span>
                    </td>
                    <td className="border-b border-[#F1F5F9] px-4 py-3 font-bold text-[#1A1A1A]">{fmt(q.summary.total)}</td>
                    <td className="border-b border-[#F1F5F9] px-4 py-3 text-[#64748B]">{new Date(q.createdAt).toLocaleDateString("es-CO")}</td>
                    <td className="sticky right-0 border-b border-l border-[#E2E8F0] bg-white px-4 py-3 text-right">
                      {q.status === "DRAFT" && (
                        <button onClick={() => setPendingDeleteId(q.id)} className="text-xs font-bold text-[#DC2626] hover:opacity-70">Eliminar</button>
                      )}
                    </td>
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
            <h3 className="font-black text-[#1A1A1A]">Nueva cotización</h3>
            <p className="mt-2 text-sm text-[#64748B]">Selecciona el cliente para esta cotización.</p>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="mt-4 w-full cursor-pointer rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm outline-none transition-all duration-200 hover:border-[#27B1B8] hover:shadow-sm focus:border-[#27B1B8]"
            >
              <option value="">— Selecciona un cliente —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.company || c.fullName}</option>
              ))}
            </select>
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

      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">Eliminar cotización</h3>
            <p className="mt-2 text-sm text-[#64748B]">Esta acción no se puede deshacer. ¿Deseas continuar?</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setPendingDeleteId(null)}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]"
              >
                Cancelar
              </button>
              <button
                onClick={confirmRemove}
                className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-bold text-white hover:bg-[#B91C1C]"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
