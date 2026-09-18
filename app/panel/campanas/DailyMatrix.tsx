"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  MdInfoOutline, MdDeleteOutline, MdAdd, MdCalendarToday, MdClose,
} from "react-icons/md";
import {
  buildCampaignDailyRows,
  calcCampaignDailyTotals,
  type CampaignDailyInput,
} from "@/lib/panel-utils";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";
import { useConfirm } from "@/app/components/confirm-dialog";

const fmtUSD = (n: number) => `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtCOP = (n: number) => `$${Math.round(n || 0).toLocaleString("es-CO")}`;
const fmtPct = (n: number) => `${((n || 0) * 100).toFixed(2)}%`;
const fmtX = (n: number) => `${(n || 0).toFixed(2)}x`;

const MAX_NUM = 999_999_999;

function sanitize(value: string): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n > MAX_NUM) return MAX_NUM;
  return n;
}

// Colores de semáforo para los KPIs.
function kpiMensajesColor(ratio: number) {
  if (ratio >= 0.6) return { bg: "#DCFCE7", color: "#16A34A", bar: "#16A34A" };
  if (ratio >= 0.4) return { bg: "#FEF3C7", color: "#B45309", bar: "#EAB308" };
  return { bg: "#FEE2E2", color: "#DC2626", bar: "#DC2626" };
}
function kpiConversionColor(x: number) {
  if (x >= 8) return "#16A34A";
  if (x >= 5) return "#EAB308";
  return "#DC2626";
}

// Input numérico no controlado: muestra el valor (escalado por TRM cuando aplica)
// y vuelca cada tecla al borrador sin tocar el servidor.
function NumCell({
  value, integer, scale, onChange, className = "",
}: {
  value: number;
  integer?: boolean;
  scale?: number;
  onChange: (value: number) => void;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const toDisplay = (v: number) => (scale && scale > 0 ? Number((v / scale).toFixed(2)) : v);
  const toStore = (v: number) => (scale && scale > 0 ? v * scale : v);
  const shown = toDisplay(Number.isFinite(value) ? value : 0);
  return (
    <input
      ref={ref}
      type="number"
      min={0}
      max={scale && scale > 0 ? MAX_NUM / scale : MAX_NUM}
      defaultValue={String(Number.isFinite(shown) ? shown : 0)}
      onChange={(e) => {
        const n = sanitize(e.target.value);
        onChange(integer ? Math.round(toStore(n)) : toStore(n));
      }}
      className={`no-spinner w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-right text-sm font-semibold text-[#1A1A1A] outline-none transition-colors focus:border-[#27B1B8] focus:ring-2 focus:ring-[#27B1B8]/15 ${className}`}
    />
  );
}

const HEADERS: { label: string; hint: string; right?: boolean }[] = [
  { label: "Fecha", hint: "Día del seguimiento" },
  { label: "Mensajes", hint: "Mensajes recibidos ese día" },
  { label: "KPI Mensajes", hint: "Transacciones / mensajes" },
  { label: "Transacciones", hint: "Ventas cerradas ese día" },
  { label: "Presupuesto (USD)", hint: "Inversión publicitaria del día en USD" },
  { label: "Presupuesto (COP)", hint: "Inversión convertida a pesos con la TRM del día" },
  { label: "KPI Conversión", hint: "Venta del día / presupuesto del día" },
  { label: "Venta del día (COP)", hint: "Venta registrada ese día" },
  { label: "Meta diaria (COP)", hint: "Presupuesto × 10" },
  { label: "Venta acumulada (COP)", hint: "Venta acumulada hasta ese día" },
  { label: "Acciones", hint: "Eliminar el día", right: true },
];

export default function DailyMatrix({ campaignId, campaignName, onClose }: { campaignId: string; campaignName: string; onClose: () => void }) {
  const confirm = useConfirm();
  const [entries, setEntries] = useState<CampaignDailyInput[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Borrador local: se envía al servidor solo al pulsar "Guardar cambios".
  const [draft, setDraft] = useState<Record<string, Partial<CampaignDailyInput>>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const loadEntries = useCallback(async () => {
    const r = await fetch(`/api/panel/campaigns/${campaignId}/days`);
    const d = await r.json();
    setEntries(d.rows ?? []);
  }, [campaignId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/panel/campaigns/${campaignId}/days`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setEntries(d.rows ?? []); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [campaignId]);

  const { markLocalWrite } = useRealtimeRefresh(["campaigns"], loadEntries);

  // Filas visibles = servidor + borrador − eliminadas.
  const viewEntries = useMemo(
    () => entries
      .filter((e) => !deletedIds.has(e.id))
      .map((e) => ({ ...e, ...draft[e.id] })),
    [entries, draft, deletedIds],
  );

  const rows = useMemo(() => buildCampaignDailyRows(viewEntries), [viewEntries]);
  const totals = useMemo(() => calcCampaignDailyTotals(viewEntries), [viewEntries]);
  const ventasUsd = useMemo(
    () => viewEntries.reduce((s, e) => s + (e.trm > 0 ? (e.ventaDelDia || 0) / e.trm : 0), 0),
    [viewEntries],
  );

  const hasPendingEdits = Object.keys(draft).length > 0 || deletedIds.size > 0 || addedIds.size > 0;

  const patch = (id: string, field: keyof CampaignDailyInput, value: number | string) => {
    setDraft((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const removeRow = async (id: string) => {
    const ok = await confirm({
      title: "Eliminar día",
      message: "¿Seguro que quieres eliminar este día de la matriz? Se quitará cuando guardes los cambios.",
      confirmLabel: "Eliminar día",
    });
    if (!ok) return;
    if (addedIds.has(id)) {
      setAddedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      setDraft((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      fetch(`/api/panel/campaign-days/${id}`, { method: "DELETE" }).catch(() => {});
      return;
    }
    setDeletedIds((prev) => new Set(prev).add(id));
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
      setAddedIds((prev) => new Set(prev).add(d.id));
      setEntries((prev) => [...prev, {
        id: d.id, fecha: d.fecha, mensajes: d.mensajes, transacciones: d.transacciones,
        presupuestoPublicidad: d.presupuestoPublicidad, ventaDelDia: d.ventaDelDia, trm: d.trm,
      }]);
      markLocalWrite();
    } finally {
      setAdding(false);
    }
  };

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const id of deletedIds) {
        await fetch(`/api/panel/campaign-days/${id}`, { method: "DELETE" });
      }
      for (const [id, fields] of Object.entries(draft)) {
        if (deletedIds.has(id) || Object.keys(fields).length === 0) continue;
        const r = await fetch(`/api/panel/campaign-days/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(fields),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setError(d.error ?? "No se pudieron guardar los cambios");
          return;
        }
      }
      setDraft({});
      setDeletedIds(new Set());
      setAddedIds(new Set());
      markLocalWrite();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const cancel = async () => {
    // Deshace los días creados en esta sesión para que "Cancelar" sea real.
    for (const id of addedIds) {
      fetch(`/api/panel/campaign-days/${id}`, { method: "DELETE" }).catch(() => {});
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[92vh] w-[96vw] max-w-[1400px] flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-8 pt-7 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#94A3B8]">Matriz diaria</p>
            <h2 className="mt-1 text-2xl font-black text-[#1A1A1A]">{campaignName}</h2>
            <p className="mt-1 text-sm text-[#94A3B8]">Seguimiento diario de la campaña</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#1A1A1A]" aria-label="Cerrar">
            <MdClose size={20} />
          </button>
        </div>

        {error && (
          <div className="mx-8 mb-3 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-6 sm:px-8">
              <div className="overflow-x-auto pb-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-[#F1F5F9] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#CBD5E1] [&::-webkit-scrollbar-thumb:hover]:bg-[#94A3B8]">
              <table className="w-full border-separate border-spacing-y-2 text-sm" style={{ minWidth: 1000 }}>
                <thead>
                  <tr>
                    {HEADERS.map((h) => (
                      <th key={h.label} className={`whitespace-nowrap px-2 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8] ${h.right ? "text-right" : "text-left"}`}>
                        <span className="inline-flex items-center gap-1">
                          {h.label}
                          <span className="text-[#CBD5E1]" title={h.hint}><MdInfoOutline size={12} /></span>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const msg = kpiMensajesColor(row.kpiMensajes);
                    const convColor = kpiConversionColor(row.kpiConversion);
                    const convPct = Math.min(100, ((row.kpiConversion || 0) / 10) * 100);
                    return (
                      <tr key={row.id} className="bg-white">
                        <td className="rounded-l-2xl border border-r-0 border-[#E2E8F0] py-2 pl-3 pr-2 align-middle">
                          <div className="relative">
                            <input
                              type="date"
                              value={String(row.fecha).slice(0, 10)}
                              onChange={(e) => patch(row.id, "fecha", new Date(`${e.target.value}T00:00:00`).toISOString())}
                              className="w-[138px] rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm text-[#1A1A1A] outline-none transition-colors focus:border-[#27B1B8] focus:ring-2 focus:ring-[#27B1B8]/15 [&::-webkit-calendar-picker-indicator]:opacity-0"
                            />
                            <MdCalendarToday size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                          </div>
                        </td>
                        <td className="border-y border-[#E2E8F0] px-2 py-2 align-middle">
                          <NumCell value={row.mensajes} integer onChange={(v) => patch(row.id, "mensajes", v)} className="w-[92px]" />
                        </td>
                        <td className="border-y border-[#E2E8F0] px-2 py-2 align-middle">
                          <span className="inline-flex w-[110px] items-center justify-center rounded-xl px-3 py-2 text-sm font-bold" style={{ background: msg.bg, color: msg.color }}>
                            {fmtPct(row.kpiMensajes)}
                          </span>
                        </td>
                        <td className="border-y border-[#E2E8F0] px-2 py-2 align-middle">
                          <NumCell value={row.transacciones} integer onChange={(v) => patch(row.id, "transacciones", v)} className="w-[120px]" />
                        </td>
                        <td className="border-y border-[#E2E8F0] px-2 py-2 align-middle">
                          <NumCell value={row.presupuestoPublicidad} onChange={(v) => patch(row.id, "presupuestoPublicidad", v)} className="w-[110px]" />
                        </td>
                        <td className="border-y border-[#E2E8F0] px-2 py-2 align-middle text-right font-semibold text-[#1A1A1A] whitespace-nowrap" title={`TRM $${Math.round(row.trm).toLocaleString("es-CO")}`}>
                          {fmtCOP(row.presupuestoCOP)}
                        </td>
                        <td className="border-y border-[#E2E8F0] px-2 py-2 align-middle">
                          <span className="block font-black text-[#1A1A1A]">{fmtX(row.kpiConversion)}</span>
                          <span className="mt-1 block h-1.5 w-[110px] overflow-hidden rounded-full bg-[#EEF2F6]">
                            <span className="block h-full rounded-full transition-all" style={{ width: `${convPct}%`, background: convColor }} />
                          </span>
                        </td>
                        <td className="border-y border-[#E2E8F0] px-2 py-2 align-middle">
                          <NumCell value={row.ventaDelDia} scale={row.trm} onChange={(v) => patch(row.id, "ventaDelDia", v)} className="w-[120px]" />
                        </td>
                        <td className="border-y border-[#E2E8F0] px-2 py-2 align-middle text-right font-semibold text-[#1A1A1A] whitespace-nowrap">
                          {fmtCOP(row.metaDiaria)}
                        </td>
                        <td className="border-y border-[#E2E8F0] px-2 py-2 align-middle text-right font-semibold text-[#1A1A1A] whitespace-nowrap">
                          {fmtCOP(row.ventaAcumulada)}
                        </td>
                        <td className="rounded-r-2xl border border-l-0 border-[#E2E8F0] px-3 py-2 text-right align-middle">
                          <button onClick={() => removeRow(row.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#DC2626] transition-colors hover:bg-[#FEE2E2]" aria-label="Eliminar día">
                            <MdDeleteOutline size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={11} className="rounded-2xl border border-dashed border-[#E2E8F0] px-4 py-10 text-center text-sm text-[#94A3B8]">
                        Sin días registrados todavía
                      </td>
                    </tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="font-black text-[#0C6060]">
                      <td className="rounded-l-2xl bg-[#E9F7F7] px-4 py-3.5">Totales</td>
                      <td className="bg-[#E9F7F7] px-2 py-3.5 text-right">{totals.totalMensajes}</td>
                      <td className="bg-[#E9F7F7] px-2 py-3.5 text-right">{fmtPct(totals.conversionGeneral)}</td>
                      <td className="bg-[#E9F7F7] px-2 py-3.5 text-right">{totals.totalTransacciones}</td>
                      <td className="bg-[#E9F7F7] px-2 py-3.5 text-right">{fmtUSD(totals.totalInversionUSD)}</td>
                      <td className="bg-[#E9F7F7] px-2 py-3.5 text-right">{fmtCOP(totals.totalInversion)}</td>
                      <td className="bg-[#E9F7F7] px-2 py-3.5 text-right">{fmtX(totals.kpiGeneral)}</td>
                      <td className="bg-[#E9F7F7] px-2 py-3.5 text-right">{fmtUSD(ventasUsd)}</td>
                      <td className="bg-[#E9F7F7] px-2 py-3.5 text-right">{fmtCOP(rows.reduce((s, r) => s + r.metaDiaria, 0))}</td>
                      <td className="bg-[#E9F7F7] px-2 py-3.5 text-right">{fmtCOP(totals.totalVentas)}</td>
                      <td className="rounded-r-2xl bg-[#E9F7F7] px-4 py-3.5 text-right">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E2E8F0] px-8 py-5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-[168px] rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm outline-none focus:border-[#27B1B8] focus:ring-2 focus:ring-[#27B1B8]/15 [&::-webkit-calendar-picker-indicator]:opacity-0"
                  />
                  <MdCalendarToday size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                </div>
                <button
                  onClick={addRow}
                  disabled={adding}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#27B1B8] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(39,177,184,0.3)] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <MdAdd size={17} /> {adding ? "Agregando…" : "Agregar día"}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={cancel} className="rounded-xl border border-[#E2E8F0] px-6 py-2.5 text-sm font-bold text-[#64748B] transition-colors hover:bg-[#F8FAFC]">
                  Cancelar
                </button>
                <button
                  onClick={saveAll}
                  disabled={saving || !hasPendingEdits}
                  className="rounded-xl bg-[#27B1B8] px-6 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
