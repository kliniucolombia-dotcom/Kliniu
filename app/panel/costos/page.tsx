"use client";
import { useState, useEffect, useCallback } from "react";

const fmt = (n: number) =>
  n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type CostConfig = {
  costoProd: number;
  publicidad: number;
  transporte: number;
  packing: number;
  recaudo: number;
  imprevistos: number;
  gastosFijos: number;
  devolucionesPct: number;
};

const DEFAULTS: CostConfig = {
  costoProd: 0,
  publicidad: 0,
  transporte: 0,
  packing: 0,
  recaudo: 0,
  imprevistos: 5,
  gastosFijos: 0,
  devolucionesPct: 0,
};

export default function CostosPanel() {
  const [form, setForm] = useState<CostConfig>(DEFAULTS);
  const [monthOrders, setMonthOrders] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/panel/costos")
      .then((r) => r.json())
      .then((d) => {
        if (d?.config) {
          setForm({
            costoProd: d.config.costoProd,
            publicidad: d.config.publicidad,
            transporte: d.config.transporte,
            packing: d.config.packing,
            recaudo: d.config.recaudo,
            imprevistos: d.config.imprevistos,
            gastosFijos: d.config.gastosFijos,
            devolucionesPct: d.config.devolucionesPct,
          });
        }
        setMonthOrders(d?.monthOrderCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof CostConfig) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [key]: parseFloat(e.target.value) || 0 }));
    setSaved(false);
  };

  const imprevistosVal = (form.recaudo * form.imprevistos) / 100;
  const margenUnidad = form.recaudo - form.costoProd - form.publicidad - form.transporte - form.packing - imprevistosVal;
  const puntoEquilibrio = form.gastosFijos > 0 && margenUnidad > 0 ? Math.ceil(form.gastosFijos / margenUnidad) : 0;
  const margenTotal = margenUnidad * monthOrders;
  const utilidad = margenTotal - form.gastosFijos;
  const kpiDevoluciones = form.devolucionesPct;

  const save = useCallback(async () => {
    setSaving(true);
    await fetch("/api/panel/costos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setSaved(true);
  }, [form]);

  const inputClass =
    "w-full rounded-xl border border-[#E2E8F0] bg-white px-3 py-2.5 text-sm font-semibold text-[#1A1A1A] focus:border-[#27B1B8] focus:outline-none focus:ring-2 focus:ring-[#27B1B8]/20";

  const fields: { key: keyof CostConfig; label: string; suffix?: string }[] = [
    { key: "recaudo",       label: "Recaudo promedio (precio venta/unidad)" },
    { key: "costoProd",     label: "Costo del Producto" },
    { key: "publicidad",    label: "Publicidad / Conversión" },
    { key: "transporte",    label: "Transporte" },
    { key: "packing",       label: "Packing" },
    { key: "imprevistos",   label: "Imprevistos", suffix: "%" },
    { key: "gastosFijos",   label: "Gastos Fijos del Mes" },
    { key: "devolucionesPct", label: "Tasa de devoluciones", suffix: "%" },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Reporte de Costos</h1>
        <p className="mt-0.5 text-sm text-[#64748B]">Ingresa tus costos por unidad para calcular tu rentabilidad</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Formulario */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Costos por unidad</h2>
          <div className="space-y-3">
            {fields.map(({ key, label, suffix }) => (
              <div key={key}>
                <label className="mb-1 block text-xs font-semibold text-[#64748B]">{label}</label>
                <div className="relative">
                  {!suffix && (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94A3B8]">$</span>
                  )}
                  <input
                    type="number"
                    min={0}
                    value={form[key] || ""}
                    onChange={set(key)}
                    className={`${inputClass} ${!suffix ? "pl-7" : ""}`}
                    placeholder="0"
                  />
                  {suffix && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94A3B8]">{suffix}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="mt-5 w-full rounded-xl bg-[#27B1B8] py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition hover:bg-[#1F9AA0] disabled:opacity-60"
          >
            {saving ? "Guardando…" : saved ? "¡Guardado ✓" : "Guardar costos"}
          </button>
        </div>

        {/* Resultados */}
        <div className="space-y-4">
          {/* Por unidad */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Estructura por unidad</h2>
            <table className="w-full text-sm">
              <tbody className="divide-y divide-[#F1F5F9]">
                {[
                  { label: "Costo del Producto",     value: fmt(form.costoProd) },
                  { label: "Publicidad / Conversión", value: fmt(form.publicidad) },
                  { label: "Transporte",              value: fmt(form.transporte) },
                  { label: "Packing",                 value: fmt(form.packing) },
                  { label: `Imprevistos ${form.imprevistos}%`, value: fmt(imprevistosVal) },
                  { label: "Recaudo Promedio",        value: fmt(form.recaudo), highlight: true },
                ].map(({ label, value, highlight }) => (
                  <tr key={label} className={highlight ? "bg-[#F0FAFA]" : ""}>
                    <td className="py-2 text-[#64748B]">{label}</td>
                    <td className="py-2 text-right font-bold text-[#1A1A1A]">{value}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-[#27B1B8]">
                  <td className="py-2.5 font-black text-[#1A1A1A]">Margen por unidad</td>
                  <td className={`py-2.5 text-right text-lg font-black ${margenUnidad >= 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                    {fmt(margenUnidad)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* KPIs del mes */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-semibold text-[#94A3B8]">Punto de equilibrio</p>
              <p className="mt-1 text-2xl font-black text-[#FF6B00]">
                {puntoEquilibrio > 0 ? puntoEquilibrio.toLocaleString("es-CO") : "—"}
              </p>
              <p className="text-[10px] text-[#94A3B8]">unidades / mes</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
              <p className="text-xs font-semibold text-[#94A3B8]">KPI devoluciones</p>
              <p className={`mt-1 text-2xl font-black ${kpiDevoluciones > 5 ? "text-[#DC2626]" : "text-[#64748B]"}`}>
                {kpiDevoluciones.toFixed(2)}%
              </p>
              <p className="text-[10px] text-[#94A3B8]">tasa configurada</p>
            </div>
          </div>

          {/* Ejercicio del mes */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">
              Ejercicio del mes
            </h2>
            <div className="space-y-3">
              {[
                { label: "Unidades vendidas reales", value: monthOrders.toLocaleString("es-CO"), color: "#27B1B8" },
                { label: "Unidades para equilibrio", value: puntoEquilibrio > 0 ? puntoEquilibrio.toLocaleString("es-CO") : "—", color: "#FF6B00" },
                { label: "Gastos fijos mes",          value: fmt(form.gastosFijos),  color: "#64748B" },
                { label: "Margen total ejercicio",    value: fmt(margenTotal),        color: margenTotal >= 0 ? "#16A34A" : "#DC2626" },
                { label: "Utilidad del ejercicio",    value: fmt(utilidad),           color: utilidad >= 0 ? "#16A34A" : "#DC2626", big: true },
              ].map(({ label, value, color, big }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-[#64748B]">{label}</span>
                  <span className={`font-black ${big ? "text-xl" : "text-sm"}`} style={{ color }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
            {monthOrders < puntoEquilibrio && puntoEquilibrio > 0 && (
              <div className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                Faltan {(puntoEquilibrio - monthOrders).toLocaleString("es-CO")} unidades para alcanzar el punto de equilibrio
              </div>
            )}
            {monthOrders >= puntoEquilibrio && puntoEquilibrio > 0 && (
              <div className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-xs font-semibold text-green-700">
                Punto de equilibrio superado — {(monthOrders - puntoEquilibrio).toLocaleString("es-CO")} unidades en zona de utilidad
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
