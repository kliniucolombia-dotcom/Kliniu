"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildCampaignDailyRows,
  calcCampaignDailyTotals,
  type CampaignDailyInput,
} from "@/lib/panel-utils";

const fmtUSD = (n: number) => `$${Math.round(n || 0).toLocaleString("en-US")}`;
const fmtPct = (n: number) => `${((n || 0) * 100).toFixed(2)}%`;
const fmtX = (n: number) => (n || 0).toFixed(2);

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

const MAX_NUM = 999_999_999;

function sanitize(value: string): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > MAX_NUM) return MAX_NUM;
  return n;
}

function NumCell({
  id,
  field,
  value,
  integer,
  patchField,
  commitField,
}: {
  id: string;
  field: keyof CampaignDailyInput;
  value: number;
  integer?: boolean;
  patchField: (id: string, field: keyof CampaignDailyInput, value: number | string) => void;
  commitField: (id: string, field: keyof CampaignDailyInput, value: number | string) => void;
}) {
  const [local, setLocal] = useState(String(Number.isFinite(value) ? value : 0));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setLocal(String(Number.isFinite(value) ? value : 0));
  }, [value]);

  return (
    <input
      type="number"
      min={0}
      max={MAX_NUM}
      value={local}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => {
        setLocal(e.target.value);
        const n = sanitize(e.target.value);
        patchField(id, field, integer ? Math.round(n) : n);
      }}
      onBlur={(e) => {
        focused.current = false;
        commitField(id, field, integer ? Math.round(sanitize(e.target.value)) : sanitize(e.target.value));
      }}
      className="no-spinner w-full rounded-lg border border-[#E2E8F0] px-2 py-1.5 text-sm text-right outline-none focus:border-[#27B1B8]"
    />
  );
}

export default function DailyMatrix({ campaignId, campaignName, onClose }: { campaignId: string; campaignName: string; onClose: () => void }) {
  const [entries, setEntries] = useState<CampaignDailyInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/panel/campaigns/${campaignId}/days`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setEntries(d.rows ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId]);

  const rows = useMemo(() => buildCampaignDailyRows(entries), [entries]);
  const totals = useMemo(() => calcCampaignDailyTotals(entries), [entries]);

  const pendingTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Refresca desde el servidor para resincronizar frontend/backend tras un fallo.
  const resync = async () => {
    const r = await fetch(`/api/panel/campaigns/${campaignId}/days`);
    const d = await r.json();
    setEntries(d.rows ?? []);
  };

  const saveField = async (id: string, field: keyof CampaignDailyInput, value: number | string) => {
    try {
      const r = await fetch(`/api/panel/campaign-days/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? "No se pudo guardar el cambio");
        await resync();
      }
    } catch {
      setError("No se pudo guardar el cambio");
      await resync();
    }
  };

  // Guarda con debounce mientras se escribe, sin recalcular la tabla todavía (evita que
  // venta acumulada / KPIs salten en cada tecla).
  const patchField = (id: string, field: keyof CampaignDailyInput, value: number | string) => {
    const key = `${id}:${field}`;
    const existing = pendingTimers.current.get(key);
    if (existing) clearTimeout(existing);
    pendingTimers.current.set(key, setTimeout(() => {
      pendingTimers.current.delete(key);
      saveField(id, field, value);
    }, 500));
  };

  // Recalcula la tabla (venta acumulada, KPIs) y guarda de inmediato al salir del campo.
  const commitField = (id: string, field: keyof CampaignDailyInput, value: number | string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
    flushField(id, field, value);
  };

  useEffect(() => {
    const timers = pendingTimers.current;
    return () => { timers.forEach((t) => clearTimeout(t)); };
  }, []);

  // Guarda de inmediato (blur) y cancela el debounce pendiente para esa celda.
  const flushField = (id: string, field: keyof CampaignDailyInput, value: number | string) => {
    const key = `${id}:${field}`;
    const existing = pendingTimers.current.get(key);
    if (existing) { clearTimeout(existing); pendingTimers.current.delete(key); }
    saveField(id, field, value);
  };

  const removeRow = async (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      const r = await fetch(`/api/panel/campaign-days/${id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? "No se pudo eliminar la fila");
        await resync();
      }
    } catch {
      setError("No se pudo eliminar la fila");
      await resync();
    }
  };

  const addRow = async () => {
    setAdding(true);
    setError(null);
    try {
      const r = await fetch(`/api/panel/campaigns/${campaignId}/days`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: newDate, mensajes: 0, transacciones: 0, presupuestoPublicidad: 0, ventaDelDia: 0 }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "Error al crear día"); return; }
      setEntries((prev) => [...prev, {
        id: d.id, fecha: d.fecha, mensajes: d.mensajes, transacciones: d.transacciones,
        presupuestoPublicidad: d.presupuestoPublicidad, ventaDelDia: d.ventaDelDia,
      }]);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Matriz diaria</p>
            <h3 className="font-black text-[#1A1A1A]">{campaignName}</h3>
          </div>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
        </div>

        {error && (
          <div className="mb-3 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
        )}

        {loading ? (
          <div className="flex h-32 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
              <table className="w-full table-fixed border-collapse text-sm" style={{ minWidth: 900 }}>
                <colgroup>
                  <col style={{ width: 130 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 90 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 100 }} />
                  <col style={{ width: 110 }} />
                  <col style={{ width: 70 }} />
                </colgroup>
                <thead className="bg-[#F8FAFC]">
                  <tr>
                    {["Fecha", "Mensajes", "KPI Mensajes", "Transacciones", "Presupuesto", "KPI Conversión", "Venta del día", "Meta diaria", "Venta acumulada", ""].map((h) => (
                      <th key={h} className="truncate border border-[#E2E8F0] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F8FAFC]">
                      <td className="border border-[#E2E8F0] px-2 py-1.5">
                        <input
                          type="date"
                          value={toDateInputValue(row.fecha)}
                          onChange={(e) => patchField(row.id, "fecha", new Date(e.target.value).toISOString())}
                          onBlur={(e) => flushField(row.id, "fecha", new Date(e.target.value).toISOString())}
                          className="w-full rounded-lg border border-[#E2E8F0] px-2 py-1 text-sm outline-none focus:border-[#27B1B8]"
                        />
                      </td>
                      <td className="border border-[#E2E8F0] px-2 py-1.5"><NumCell id={row.id} field="mensajes" value={row.mensajes} integer patchField={patchField} commitField={commitField} /></td>
                      <td className="truncate border border-[#E2E8F0] px-2 py-1.5 text-right font-semibold text-[#1A1A1A]">{fmtPct(row.kpiMensajes)}</td>
                      <td className="border border-[#E2E8F0] px-2 py-1.5"><NumCell id={row.id} field="transacciones" value={row.transacciones} integer patchField={patchField} commitField={commitField} /></td>
                      <td className="border border-[#E2E8F0] px-2 py-1.5"><NumCell id={row.id} field="presupuestoPublicidad" value={row.presupuestoPublicidad} patchField={patchField} commitField={commitField} /></td>
                      <td className="truncate border border-[#E2E8F0] px-2 py-1.5 text-right font-semibold text-[#1A1A1A]">{fmtPct(row.kpiConversion)}</td>
                      <td className="border border-[#E2E8F0] px-2 py-1.5"><NumCell id={row.id} field="ventaDelDia" value={row.ventaDelDia} patchField={patchField} commitField={commitField} /></td>
                      <td className="truncate border border-[#E2E8F0] px-2 py-1.5 text-right font-semibold text-[#1A1A1A]">{fmtUSD(row.metaDiaria)}</td>
                      <td className="truncate border border-[#E2E8F0] px-2 py-1.5 text-right font-semibold text-[#1A1A1A]">{fmtUSD(row.ventaAcumulada)}</td>
                      <td className="border border-[#E2E8F0] px-2 py-1.5 text-center">
                        <button onClick={() => removeRow(row.id)} className="text-xs font-bold text-[#DC2626] hover:opacity-70">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={10} className="border border-[#E2E8F0] px-2 py-6 text-center text-sm text-[#94A3B8]">Sin días registrados todavía</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-[#F0F9F8]">
                  <tr className="font-black text-[#0C6060]">
                    <td className="border border-[#E2E8F0] px-2 py-2">Totales</td>
                    <td className="truncate border border-[#E2E8F0] px-2 py-2 text-right">{totals.totalMensajes}</td>
                    <td className="truncate border border-[#E2E8F0] px-2 py-2 text-right">{fmtPct(totals.conversionGeneral)}</td>
                    <td className="truncate border border-[#E2E8F0] px-2 py-2 text-right">{totals.totalTransacciones}</td>
                    <td className="truncate border border-[#E2E8F0] px-2 py-2 text-right">{fmtUSD(totals.totalInversion)}</td>
                    <td className="truncate border border-[#E2E8F0] px-2 py-2 text-right">{fmtX(totals.roasPromedio)}</td>
                    <td className="truncate border border-[#E2E8F0] px-2 py-2 text-right">{fmtUSD(totals.totalVentas)}</td>
                    <td className="border border-[#E2E8F0] px-2 py-2" colSpan={2} />
                    <td className="border border-[#E2E8F0] px-2 py-2" />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm outline-none focus:border-[#27B1B8]"
              />
              <button onClick={addRow} disabled={adding} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
                {adding ? "Agregando…" : "+ Agregar día"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
