"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MdInventory2, MdVerified, MdGroups, MdReportProblem, MdDelete, MdSettings } from "react-icons/md";
import { SimpleSelect } from "../_components/simple-select";
import { useConfirm } from "@/app/components/confirm-dialog";
import { buildAssemblySummary } from "@/lib/assembly-calculator";
import { fmtDateOnly } from "@/lib/date";

type Station = { id: string; code: number; name: string; location: string | null };
type Leader = { id: string; fullName: string };
type Product = { id: string; name: string; sku: string | null };
type Order = { id: string; number: string; status: string };

type Run = {
  id: string;
  station: { id: string; name: string; code: number };
  leader: { id: string; fullName: string };
  product: { id: string; name: string; sku: string | null };
  productionOrder: { id: string; number: string } | null;
  orderNumber: string;
  productionDate: string;
  startTime: string;
  endTime: string;
  assembled: number;
  defective: number;
  nonConforming: number;
  reworked: number;
  workerCount: number;
  laborHours: number;
  summary: { goodUnits: number; qualityPercentage: number; unitsPerLaborHour: number };
};

const inputCls = "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#27B1B8]";
const labelCls = "mb-1 block text-xs font-semibold text-[#64748B]";
const PAGE_SIZE = 10;

function todayBogota() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

const emptyForm = () => ({
  stationId: "",
  leaderId: "",
  productId: "",
  productionOrderId: "",
  orderNumber: "",
  productionDate: todayBogota(),
  startTime: "",
  endTime: "",
  assembled: "",
  defective: "",
  nonConforming: "",
  reworked: "",
  workerCount: "",
  laborHours: "",
  defectReason: "",
  observations: "",
});

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

export default function EnsamblePanel() {
  const confirm = useConfirm();
  const [stations, setStations] = useState<Station[]>([]);
  const [leaders, setLeaders] = useState<Leader[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [filterStation, setFilterStation] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const set = (key: keyof ReturnType<typeof emptyForm>, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const loadRuns = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterStation) params.set("stationId", filterStation);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/panel/assembly-runs?${params}`);
    if (r.ok) setRuns((await r.json()).runs ?? []);
    setLoading(false);
  }, [filterStation, from, to]);

  useEffect(() => {
    fetch("/api/panel/assembly-runs/options")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setStations(d.stations ?? []);
        setLeaders(d.leaders ?? []);
        setProducts(d.products ?? []);
        setOrders(d.orders ?? []);
      });
  }, []);

  useEffect(() => {
    setPage(1);
    loadRuns();
  }, [loadRuns]);

  const preview = useMemo(
    () =>
      buildAssemblySummary({
        assembled: num(form.assembled),
        defective: num(form.defective),
        nonConforming: num(form.nonConforming),
        workerCount: num(form.workerCount),
        laborHours: num(form.laborHours),
      }),
    [form.assembled, form.defective, form.nonConforming, form.workerCount, form.laborHours],
  );

  const kpis = useMemo(() => {
    const assembled = runs.reduce((t, r) => t + r.assembled, 0);
    const good = runs.reduce((t, r) => t + r.summary.goodUnits, 0);
    const defective = runs.reduce((t, r) => t + r.defective + r.nonConforming, 0);
    const laborHours = runs.reduce((t, r) => t + r.workerCount * r.laborHours, 0);
    return {
      assembled,
      good,
      defective,
      quality: assembled > 0 ? (good / assembled) * 100 : 0,
      rate: laborHours > 0 ? good / laborHours : 0,
    };
  }, [runs]);

  const totalPages = Math.max(1, Math.ceil(runs.length / PAGE_SIZE));
  const pageRuns = runs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const submit = async () => {
    if (!form.stationId || !form.leaderId || !form.productId || !form.orderNumber.trim()) {
      setAlert({ type: "err", msg: "Puesto, líder, producto y número de orden son obligatorios" });
      return;
    }
    if (!form.startTime || !form.endTime) {
      setAlert({ type: "err", msg: "Indica la hora de inicio y la hora final" });
      return;
    }
    setSaving(true);
    const r = await fetch("/api/panel/assembly-runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stationId: form.stationId,
        leaderId: form.leaderId,
        productId: form.productId,
        productionOrderId: form.productionOrderId || null,
        orderNumber: form.orderNumber,
        productionDate: `${form.productionDate}T12:00:00.000Z`,
        startTime: `${form.productionDate}T${form.startTime}:00.000Z`,
        endTime: `${form.productionDate}T${form.endTime}:00.000Z`,
        assembled: num(form.assembled),
        defective: num(form.defective),
        nonConforming: num(form.nonConforming),
        reworked: num(form.reworked),
        workerCount: num(form.workerCount),
        laborHours: num(form.laborHours),
        defectReason: form.defectReason || null,
        observations: form.observations || null,
      }),
    });
    setSaving(false);
    if (r.ok) {
      setForm(emptyForm());
      setAlert({ type: "ok", msg: "Corrida registrada y sumada a producto terminado" });
      loadRuns();
    } else {
      const d = await r.json().catch(() => ({}));
      setAlert({ type: "err", msg: d.error ?? "No fue posible registrar la corrida" });
    }
  };

  const remove = async (run: Run) => {
    const ok = await confirm({
      title: "Eliminar corrida",
      message: `Se descontarán ${run.summary.goodUnits} unidades de producto terminado. ¿Eliminar la corrida ${run.orderNumber}?`,
    });
    if (!ok) return;
    const r = await fetch(`/api/panel/assembly-runs/${run.id}`, { method: "DELETE" });
    if (r.ok) {
      setAlert({ type: "ok", msg: "Corrida eliminada y stock revertido" });
      loadRuns();
    } else {
      const d = await r.json().catch(() => ({}));
      setAlert({ type: "err", msg: d.error ?? "No fue posible eliminar la corrida" });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Planta</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Ensamble</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Registro diario de ensamble; las unidades buenas entran a producto terminado</p>
        </div>
        <Link href="/panel/ensamble/puestos" className="inline-flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] px-3.5 py-2 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
          <MdSettings size={16} /> Puestos
        </Link>
      </div>

      {alert && (
        <div className={`mb-5 rounded-xl px-4 py-3 text-sm font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"}`}>
          {alert.msg}
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi icon={<MdInventory2 size={16} />} label="Unidades ensambladas" value={kpis.assembled.toLocaleString("es-CO")} color="#6D28D9" />
        <Kpi icon={<MdVerified size={16} />} label="% de calidad" value={`${kpis.quality.toFixed(1)}%`} color="#15803D" />
        <Kpi icon={<MdGroups size={16} />} label="Und / hora-hombre" value={kpis.rate.toFixed(1)} color="#0369A1" />
        <Kpi icon={<MdReportProblem size={16} />} label="Defectuosas" value={kpis.defective.toLocaleString("es-CO")} color="#C2410C" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Información general</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Puesto</label>
                <SimpleSelect
                  value={form.stationId}
                  options={[{ value: "", label: "— Seleccionar —" }, ...stations.map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))]}
                  onChange={(v) => set("stationId", v)}
                />
              </div>
              <div>
                <label className={labelCls}>Líder</label>
                <SimpleSelect
                  value={form.leaderId}
                  options={[{ value: "", label: "— Seleccionar —" }, ...leaders.map((l) => ({ value: l.id, label: l.fullName }))]}
                  onChange={(v) => set("leaderId", v)}
                />
              </div>
              <div>
                <label className={labelCls}>Fecha</label>
                <input type="date" value={form.productionDate} onChange={(e) => set("productionDate", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Hora inicio</label>
                <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Hora final</label>
                <input type="time" value={form.endTime} onChange={(e) => set("endTime", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>N° de orden</label>
                <input value={form.orderNumber} onChange={(e) => set("orderNumber", e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2 sm:col-span-2">
                <label className={labelCls}>Producto ensamblado</label>
                <SimpleSelect
                  value={form.productId}
                  options={[{ value: "", label: "— Seleccionar —" }, ...products.map((p) => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ""}` }))]}
                  onChange={(v) => set("productId", v)}
                />
              </div>
              <div>
                <label className={labelCls}>Orden de producción</label>
                <SimpleSelect
                  value={form.productionOrderId}
                  options={[{ value: "", label: "— Sin orden —" }, ...orders.map((o) => ({ value: o.id, label: o.number }))]}
                  onChange={(v) => set("productionOrderId", v)}
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Producción y calidad</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelCls}>Unidades ensambladas</label>
                <input type="number" min={0} value={form.assembled} onChange={(e) => set("assembled", e.target.value)} className={`no-spinner ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>Defectuosas</label>
                <input type="number" min={0} value={form.defective} onChange={(e) => set("defective", e.target.value)} className={`no-spinner ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>No conformes</label>
                <input type="number" min={0} value={form.nonConforming} onChange={(e) => set("nonConforming", e.target.value)} className={`no-spinner ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>Reprocesadas</label>
                <input type="number" min={0} value={form.reworked} onChange={(e) => set("reworked", e.target.value)} className={`no-spinner ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>N° de operarios</label>
                <input type="number" min={1} value={form.workerCount} onChange={(e) => set("workerCount", e.target.value)} className={`no-spinner ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>Horas trabajadas</label>
                <input type="number" min={0} step="0.5" value={form.laborHours} onChange={(e) => set("laborHours", e.target.value)} className={`no-spinner ${inputCls}`} />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className={labelCls}>Motivo del defecto</label>
                <input value={form.defectReason} onChange={(e) => set("defectReason", e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className={labelCls}>Observaciones</label>
                <textarea value={form.observations} onChange={(e) => set("observations", e.target.value)} rows={2} className={inputCls} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Resumen</h2>
            <dl className="space-y-3 text-sm">
              <Row label="Unidades buenas" value={preview.goodUnits.toLocaleString("es-CO")} />
              <Row label="% de calidad" value={`${preview.qualityPercentage.toFixed(2)}%`} />
              <Row label="Und / hora-hombre" value={preview.unitsPerLaborHour.toFixed(2)} />
            </dl>
            <p className="mt-4 text-xs text-[#94A3B8]">Las unidades buenas entran automáticamente a la bodega de producto terminado.</p>
            <button onClick={submit} disabled={saving} className="mt-4 w-full rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
              {saving ? "Guardando…" : "Registrar corrida"}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <h2 className="mr-auto text-base font-black text-[#1A1A1A]">Corridas registradas</h2>
          <div className="min-w-[180px]">
            <label className={labelCls}>Puesto</label>
            <SimpleSelect
              value={filterStation}
              options={[{ value: "", label: "Todos" }, ...stations.map((s) => ({ value: s.id, label: s.name }))]}
              onChange={setFilterStation}
            />
          </div>
          <div>
            <label className={labelCls}>Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
          </div>
        </div>

        <div className="min-w-0 overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Orden</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Puesto</th>
                <th className="px-4 py-3">Ensambladas</th>
                <th className="px-4 py-3">Buenas</th>
                <th className="px-4 py-3">Calidad</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pageRuns.map((run) => (
                <tr key={run.id} className="border-b border-[#F1F5F9]">
                  <td className="px-4 py-3 text-[#1A1A1A]">{fmtDateOnly(run.productionDate)}</td>
                  <td className="px-4 py-3 font-semibold text-[#1A1A1A]">{run.orderNumber}</td>
                  <td className="px-4 py-3 text-[#64748B]">{run.product.name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{run.station.name}</td>
                  <td className="px-4 py-3 text-[#1A1A1A]">{run.assembled.toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3 font-bold text-[#15803D]">{run.summary.goodUnits.toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3 text-[#64748B]">{run.summary.qualityPercentage.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => remove(run)} className="rounded-lg p-1.5 text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]" aria-label="Eliminar corrida">
                      <MdDelete size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && runs.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-[#94A3B8]">Sin corridas registradas todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-[#64748B]">Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, runs.length)} de {runs.length}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#64748B] disabled:opacity-40">‹</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 font-bold text-[#64748B] disabled:opacity-40">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white" style={{ background: color }}>{icon}</span>
      <p className="mt-3 text-xl font-black text-[#1A1A1A]">{value}</p>
      <p className="text-xs text-[#64748B]">{label}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#64748B]">{label}</dt>
      <dd className="font-black text-[#1A1A1A]">{value}</dd>
    </div>
  );
}
