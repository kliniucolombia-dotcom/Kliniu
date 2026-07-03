"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type CalculatorListItem = {
  id: string;
  name: string;
  updatedAt: string;
  summary: { precioFinal: number };
};

export default function CalculadoraPrecioListPage() {
  const router = useRouter();
  const [calculators, setCalculators] = useState<CalculatorListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/panel/sale-calculators");
      const d = await r.json();
      setCalculators(d.calculators ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    setCreating(true);
    setError(null);
    try {
      const r = await fetch("/api/panel/sale-calculators", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo crear"); return; }
      router.push(`/panel/calculadora-precio/${d.id}`);
    } finally {
      setCreating(false);
    }
  };

  const duplicate = async (id: string) => {
    const r = await fetch(`/api/panel/sale-calculators/${id}/duplicate`, { method: "POST" });
    if (r.ok) load();
  };

  const confirmRemove = async () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    setPendingDeleteId(null);
    const r = await fetch(`/api/panel/sale-calculators/${id}`, { method: "DELETE" });
    if (r.ok) setCalculators((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Calculadora de Precio de Venta</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Arma combos de productos y calcula el precio de venta final</p>
        </div>
        <button
          onClick={create}
          disabled={creating}
          className="rounded-xl bg-[#27B1B8] px-4 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition hover:bg-[#1F9AA0] disabled:opacity-60"
        >
          {creating ? "Creando…" : "+ Nueva calculadora"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
        </div>
      ) : calculators.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E2E8F0] bg-white p-10 text-center text-sm text-[#94A3B8]">
          Sin calculadoras todavía. Crea la primera para armar un combo.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {calculators.map((c) => (
            <div
              key={c.id}
              onClick={() => router.push(`/panel/calculadora-precio/${c.id}`)}
              className="cursor-pointer rounded-2xl border border-[#E2E8F0] bg-white p-5 transition-all duration-200 hover:scale-[1.02] hover:border-[#27B1B8] hover:shadow-lg"
            >
              <h3 className="truncate font-black text-[#1A1A1A]">{c.name}</h3>
              <p className="mt-0.5 text-xs text-[#94A3B8]">
                Actualizado {new Date(c.updatedAt).toLocaleDateString("es-CO")}
              </p>
              <p className="mt-3 text-xl font-black text-[#27B1B8]">{fmt(c.summary.precioFinal)}</p>
              <p className="text-[10px] uppercase tracking-widest text-[#94A3B8]">Precio de venta final</p>
              <div className="mt-4 flex gap-2 border-t border-[#F1F5F9] pt-3">
                <button onClick={(e) => { e.stopPropagation(); duplicate(c.id); }} className="text-xs font-bold text-[#27B1B8] hover:opacity-70">Duplicar</button>
                <button onClick={(e) => { e.stopPropagation(); setPendingDeleteId(c.id); }} className="text-xs font-bold text-[#DC2626] hover:opacity-70">Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="font-black text-[#1A1A1A]">Eliminar calculadora</h3>
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
