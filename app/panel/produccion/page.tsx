"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { buildProductionSummary, type ProductionRunInput } from "@/lib/production-calculator";

const MAX_NUM = 999_999_999;

function sanitize(value: string, integer = false): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const clamped = n > MAX_NUM ? MAX_NUM : n;
  return integer ? Math.round(clamped) : clamped;
}

const fmtPct = (n: number) => `${(n || 0).toFixed(2)}%`;

const inputClass =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#27B1B8]";
const labelClass = "mb-1 block text-xs font-semibold text-[#64748B]";

type Machine = { id: string; code: number; name: string; brand: string; model: string | null; location: string | null; isActive: boolean };
type Operator = { id: string; fullName: string; role: string };
type Product = { id: string; name: string; price: number; image: string; sku: string | null };

type RunListItem = {
  id: string;
  machine: { id: string; name: string; brand: string; code: number };
  operator: { id: string; fullName: string };
  product: { id: string; name: string; sku: string | null } | null;
  orderNumber: string;
  productionDate: string;
  startTime: string;
  endTime: string;
  material: string;
  produced: number;
  damaged: number;
  nonConforming: number;
  summary: { goodPieces: number; qualityPercentage: number };
};

const emptyForm = () => ({
  machineId: "",
  operatorId: "",
  productId: "" as string,
  orderNumber: "",
  productionDate: new Date().toISOString().slice(0, 10),
  startTime: "",
  endTime: "",
  material: "",
  pigment: "",
  injectionWeight: "",
  pieceWeight: "",
  cycle: "",
  temperature: "",
  produced: "",
  damaged: "",
  nonConforming: "",
  couplingTest: "",
  observations: "",
});

export default function ProduccionPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const loadRuns = useCallback(async () => {
    const r = await fetch("/api/panel/production-runs");
    const d = await r.json();
    setRuns(d.runs ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/panel/machines").then((r) => r.json()),
      fetch("/api/panel/production-operators").then((r) => r.json()),
      fetch("/api/panel/products?minimal=1").then((r) => r.json()),
      fetch("/api/panel/production-runs").then((r) => r.json()),
    ]).then(([m, ops, prods, runsData]) => {
      if (cancelled) return;
      setMachines(m.machines ?? []);
      setOperators(ops ?? []);
      setProducts(prods ?? []);
      setRuns(runsData.runs ?? []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const selectedMachine = machines.find((m) => m.id === form.machineId);

  const summaryInput: ProductionRunInput = useMemo(() => ({
    produced: sanitize(form.produced, true),
    damaged: sanitize(form.damaged, true),
    nonConforming: sanitize(form.nonConforming, true),
  }), [form.produced, form.damaged, form.nonConforming]);

  const summary = useMemo(() => buildProductionSummary(summaryInput), [summaryInput]);

  const quantitiesInvalid =
    summaryInput.damaged > summaryInput.produced || summaryInput.nonConforming > summaryInput.produced;

  const set = (field: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const selectProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    setForm((f) => ({
      ...f,
      productId,
      material: product ? (f.material || product.name) : f.material,
    }));
  };

  const timesInvalid =
    form.startTime && form.endTime && `${form.productionDate}T${form.endTime}` <= `${form.productionDate}T${form.startTime}`;

  const canSubmit =
    form.machineId && form.operatorId && form.orderNumber.trim() && form.productionDate &&
    form.startTime && form.endTime && form.material.trim() &&
    form.injectionWeight !== "" && form.pieceWeight !== "" && form.cycle !== "" && form.temperature !== "" &&
    form.produced !== "" && !quantitiesInvalid && !timesInvalid;

  const submit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      const r = await fetch("/api/panel/production-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: form.machineId,
          operatorId: form.operatorId,
          productId: form.productId || null,
          orderNumber: form.orderNumber,
          productionDate: form.productionDate,
          startTime: `${form.productionDate}T${form.startTime}:00`,
          endTime: `${form.productionDate}T${form.endTime}:00`,
          material: form.material,
          pigment: form.pigment || null,
          injectionWeight: sanitize(form.injectionWeight),
          pieceWeight: sanitize(form.pieceWeight),
          cycle: sanitize(form.cycle),
          temperature: sanitize(form.temperature),
          produced: sanitize(form.produced, true),
          damaged: sanitize(form.damaged, true),
          nonConforming: sanitize(form.nonConforming, true),
          couplingTest: form.couplingTest || null,
          observations: form.observations || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo registrar la corrida"); return; }
      setForm(emptyForm());
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      loadRuns();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Planta</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Producción</h1>
        <p className="mt-0.5 text-sm text-[#64748B]">Registro diario de corridas de inyección</p>
      </div>

      {error && <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Bloque 1: Información general */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Información general</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Máquina</label>
                <select value={form.machineId} onChange={(e) => set("machineId", e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">— Seleccionar —</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.code} · {m.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Marca</label>
                <input value={selectedMachine?.brand ?? ""} disabled className={`${inputClass} bg-[#F8FAFC] text-[#94A3B8]`} />
              </div>
              <div>
                <label className={labelClass}>Operario</label>
                <select value={form.operatorId} onChange={(e) => set("operatorId", e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">— Seleccionar —</option>
                  {operators.map((o) => <option key={o.id} value={o.id}>{o.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" value={form.productionDate} onChange={(e) => set("productionDate", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Hora inicio</label>
                <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Hora final</label>
                <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} className={inputClass} />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className={labelClass}>N° Orden de inyección</label>
                <input value={form.orderNumber} onChange={(e) => set("orderNumber", e.target.value)} className={inputClass} />
              </div>
              {timesInvalid && (
                <p className="col-span-2 text-xs font-semibold text-[#DC2626] sm:col-span-3">La hora final debe ser posterior a la hora de inicio.</p>
              )}
            </div>
          </div>

          {/* Bloque 2: Parámetros de producción */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Parámetros de producción</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-3">
                <label className={labelClass}>Producto (catálogo, opcional)</label>
                <select value={form.productId} onChange={(e) => selectProduct(e.target.value)} className={`${inputClass} cursor-pointer`}>
                  <option value="">— Producto manual —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</option>)}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className={labelClass}>Material</label>
                <input value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="Referencia y cantidad entregada" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Peso de inyección (g)</label>
                <input type="number" min={0} value={form.injectionWeight} onChange={(e) => set("injectionWeight", e.target.value)} className={`no-spinner ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Peso de la vela (g)</label>
                <input type="number" min={0} value={form.pieceWeight} onChange={(e) => set("pieceWeight", e.target.value)} className={`no-spinner ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Ciclo (seg)</label>
                <input type="number" min={0} value={form.cycle} onChange={(e) => set("cycle", e.target.value)} className={`no-spinner ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Temperatura (°C)</label>
                <input type="number" min={0} value={form.temperature} onChange={(e) => set("temperature", e.target.value)} className={`no-spinner ${inputClass}`} />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Pigmento</label>
                <input value={form.pigment} onChange={(e) => set("pigment", e.target.value)} placeholder="Cantidad en gramos y color" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Bloque 3: Producción */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Producción</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Cantidad producida</label>
                <input type="number" min={0} value={form.produced} onChange={(e) => set("produced", e.target.value)} className={`no-spinner ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>Cantidad dañada</label>
                <input type="number" min={0} value={form.damaged} onChange={(e) => set("damaged", e.target.value)} className={`no-spinner ${inputClass}`} />
              </div>
              <div>
                <label className={labelClass}>No conformes</label>
                <input type="number" min={0} value={form.nonConforming} onChange={(e) => set("nonConforming", e.target.value)} className={`no-spinner ${inputClass}`} />
              </div>
              {quantitiesInvalid && (
                <p className="col-span-2 text-xs font-semibold text-[#DC2626] sm:col-span-3">
                  Dañadas y no conformes no pueden superar la cantidad producida.
                </p>
              )}
              <div className="col-span-2 sm:col-span-3">
                <label className={labelClass}>Prueba de acople</label>
                <input value={form.couplingTest} onChange={(e) => set("couplingTest", e.target.value)} placeholder="Hora o N/A" className={inputClass} />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className={labelClass}>Observaciones</label>
                <textarea value={form.observations} onChange={(e) => set("observations", e.target.value)} rows={2} className={inputClass} />
              </div>
            </div>
          </div>

          <button
            onClick={submit}
            disabled={!canSubmit || saving}
            className="rounded-xl bg-[#27B1B8] px-5 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition-all hover:bg-[#1F9AA0] disabled:opacity-60"
          >
            {saving ? "Guardando…" : saved ? "✓ Registrado" : "Registrar producción"}
          </button>
        </div>

        {/* Bloque 4: Resumen */}
        <div className="h-fit rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Resumen</h2>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
              <span className="text-sm text-[#64748B]">Cantidad producida</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{summaryInput.produced}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
              <span className="text-sm text-[#64748B]">Dañadas</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{summaryInput.damaged}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
              <span className="text-sm text-[#64748B]">No conformes</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{summaryInput.nonConforming}</span>
            </div>
            <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-[#27B1B8] bg-[#F0FAFA] px-3 py-3">
              <span className="text-sm font-black text-[#0C6060]">Piezas buenas</span>
              <span className="text-xl font-black text-[#0C6060]">{summary.goodPieces}</span>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] px-3 py-3">
              <span className="text-sm font-black text-[#1A1A1A]">% Calidad</span>
              <span className="text-lg font-black text-[#27B1B8]">{fmtPct(summary.qualityPercentage)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Historial */}
      <div className="mt-8 rounded-2xl border border-[#E2E8F0] bg-white p-6">
        <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Historial de corridas</h2>
        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {["Fecha", "Máquina", "Marca", "Operario", "Producto", "Producidas", "Dañadas", "No conf.", "Buenas", "% Calidad"].map((h) => (
                  <th key={h} className="border border-[#E2E8F0] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id} className="hover:bg-[#F8FAFC]">
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{new Date(run.productionDate).toLocaleDateString("es-CO")}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{run.machine.code} · {run.machine.name}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{run.machine.brand}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{run.operator.fullName}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{run.product?.name ?? run.material}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{run.produced}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{run.damaged}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{run.nonConforming}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right font-bold text-[#0C6060]">{run.summary.goodPieces}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right font-bold text-[#27B1B8]">{fmtPct(run.summary.qualityPercentage)}</td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr><td colSpan={10} className="border border-[#E2E8F0] px-2 py-6 text-center text-sm text-[#94A3B8]">Sin corridas registradas todavía</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
