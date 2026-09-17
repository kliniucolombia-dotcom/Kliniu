"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  MdInfo,
  MdPrecisionManufacturing,
  MdBarChart,
  MdLink,
  MdNotes,
  MdCheckCircle,
  MdCancel,
  MdSearch,
  MdClose,
  MdAdd,
  MdHistory,
  MdFilterList,
  MdRefresh,
  MdPictureAsPdf,
  MdChevronLeft,
  MdChevronRight,
  MdInfoOutline,
  MdStar,
  MdLocalOffer,
  MdPersonOutline,
  MdAccessTime,
  MdInventory2,
  MdSettings,
  MdVerifiedUser,
  MdChatBubbleOutline,
} from "react-icons/md";
import { buildProductionSummary, calcProductionEfficiency, type ProductionRunInput } from "@/lib/production-calculator";
import {
  createEmptyProductionRunFilters,
  filterProductionRuns,
  type ProductionRunFilters,
} from "@/lib/production-filters";
import { fmtDateOnly, fmtTimeOnly } from "@/lib/date";
import { SimpleSelect } from "../_components/simple-select";

const MAX_NUM = 999_999_999;
const MANUAL_PRODUCT = "__manual__";
const PAGE_SIZE = 10;

type CycleUnit = "seconds" | "minutes";
type TemperatureType = "simple" | "zones";
type CouplingStatus = "completed" | "na";
type Zone = { label: string; value: string };

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
  pigment: string | null;
  pigmentQuantity: number | null;
  pigmentColor: string | null;
  injectionWeight: number;
  pieceWeight: number;
  cycle: number;
  cycleUnit: string;
  temperature: number;
  temperatureType: string;
  temperatureZones: Zone[] | null;
  manualProductName: string | null;
  produced: number;
  damaged: number;
  nonConforming: number;
  couplingTest: string | null;
  couplingStatus: string | null;
  couplingTime: string | null;
  observations: string | null;
  summary: { goodPieces: number; qualityPercentage: number };
};

type FormState = {
  machineId: string;
  operatorId: string;
  productId: string;
  manualProductName: string;
  orderNumber: string;
  productionDate: string;
  startTime: string;
  endTime: string;
  material: string;
  injectionWeight: string;
  pieceWeight: string;
  cycleValue: string;
  cycleUnit: CycleUnit;
  temperatureType: TemperatureType;
  temperature: string;
  zones: Zone[];
  pigmentQuantity: string;
  pigmentColor: string;
  produced: string;
  damaged: string;
  nonConforming: string;
  couplingStatus: "" | CouplingStatus;
  couplingTime: string;
  observations: string;
};

function todayBogota() {
  return new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

const emptyForm = (): FormState => ({
  machineId: "",
  operatorId: "",
  productId: "",
  manualProductName: "",
  orderNumber: "",
  productionDate: todayBogota(),
  startTime: "",
  endTime: "",
  material: "",
  injectionWeight: "",
  pieceWeight: "",
  cycleValue: "",
  cycleUnit: "seconds",
  temperatureType: "simple",
  temperature: "",
  zones: [
    { label: "A", value: "" },
    { label: "B", value: "" },
  ],
  pigmentQuantity: "",
  pigmentColor: "",
  produced: "",
  damaged: "",
  nonConforming: "",
  couplingStatus: "",
  couplingTime: "",
  observations: "",
});

function parseNum(value: string): number {
  if (value.trim() === "") return NaN;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function sanitize(value: string, integer = false): number {
  const n = parseNum(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const clamped = n > MAX_NUM ? MAX_NUM : n;
  return integer ? Math.round(clamped) : clamped;
}

function zoneTemp(value: string): number {
  const n = parseNum(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

const fmtPct = (n: number) => `${(n || 0).toFixed(2)}%`;

// Clasificación de eficiencia (producidas vs. esperadas por ciclo).
// Verde = meta alcanzada; ámbar = cerca de la meta; naranja = por debajo.
const efficiencyTone = (pct: number | null) => {
  if (pct === null) {
    return {
      label: "Sin ciclo",
      cardBg: "bg-white",
      border: "border-l-[#CBD5E1]",
      iconBg: "bg-[#F1F5F9]",
      iconFg: "text-[#64748B]",
      chip: "bg-[#F1F5F9] text-[#64748B]",
      bar: "bg-[#CBD5E1]",
    };
  }
  if (pct >= 100) {
    return {
      label: "Óptima",
      cardBg: "bg-[#F5FCF7]",
      border: "border-l-[#16A34A]",
      iconBg: "bg-[#DCFCE7]",
      iconFg: "text-[#15803D]",
      chip: "bg-[#DCFCE7] text-[#15803D]",
      bar: "bg-[#16A34A]",
    };
  }
  if (pct >= 90) {
    return {
      label: "Aceptable",
      cardBg: "bg-[#FFFBF2]",
      border: "border-l-[#F0A73C]",
      iconBg: "bg-[#FDEBCD]",
      iconFg: "text-[#B45309]",
      chip: "bg-[#FEF3C7] text-[#B45309]",
      bar: "bg-[#F0A73C]",
    };
  }
  return {
    label: "Baja",
    cardBg: "bg-[#FFF7F1]",
    border: "border-l-[#EA580C]",
    iconBg: "bg-[#FFEDD5]",
    iconFg: "text-[#C2410C]",
    chip: "bg-[#FFEDD5] text-[#C2410C]",
    bar: "bg-[#EA580C]",
  };
};

const cycleUnitLabel = (unit: string) => (unit === "minutes" ? "minutos" : "segundos");

const productLabel = (run: RunListItem) =>
  run.product?.name ?? run.manualProductName ?? "—";

const temperatureLabel = (run: RunListItem) => {
  if (run.temperatureType === "zones" && run.temperatureZones?.length) {
    return run.temperatureZones.map((z) => `${z.label} ${z.value}°C`).join(" · ");
  }
  return `${run.temperature} °C`;
};

const pigmentLabel = (run: RunListItem) => {
  const parts: string[] = [];
  if (run.pigmentQuantity != null) parts.push(`${run.pigmentQuantity} g`);
  if (run.pigmentColor) parts.push(run.pigmentColor);
  if (parts.length) return parts.join(" · ");
  return run.pigment ?? "—";
};

const couplingLabel = (run: RunListItem) => {
  if (run.couplingStatus === "completed") return run.couplingTime ? `Realizada · ${run.couplingTime}` : "Realizada";
  if (run.couplingStatus === "na") return "N/A";
  return run.couplingTest ?? "—";
};

const inputClass =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#27B1B8]";
const inputErrClass =
  "w-full rounded-lg border border-[#F87171] bg-white px-3 py-2 text-sm text-[#1A1A1A] outline-none focus:border-[#DC2626]";
const labelClass = "mb-1 block text-xs font-semibold text-[#64748B]";
const errorClass = "mt-1 text-[11px] font-semibold text-[#DC2626]";

export default function ProduccionPage() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [runs, setRuns] = useState<RunListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [detail, setDetail] = useState<RunListItem | null>(null);

  const [filters, setFilters] = useState<ProductionRunFilters>(createEmptyProductionRunFilters);
  const [draft, setDraft] = useState<ProductionRunFilters>(createEmptyProductionRunFilters);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [role, setRole] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const loadRuns = useCallback(async () => {
    const r = await fetch("/api/panel/production-runs");
    const d = await r.json();
    setRuns(d.runs ?? []);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setNow(new Date());
    Promise.all([
      fetch("/api/panel/machines").then((r) => r.json()),
      fetch("/api/panel/production-operators").then((r) => r.json()),
      fetch("/api/panel/products?minimal=1").then((r) => r.json()),
      fetch("/api/panel/permissions").then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ])
      .then(([m, ops, prods, perms]) => {
        if (cancelled) return;
        setMachines(Array.isArray(m.machines) ? m.machines : []);
        setOperators(Array.isArray(ops) ? ops : []);
        setProducts(Array.isArray(prods) ? prods : []);
        setRole(perms?.role ?? "");
      })
      .finally(() => {
        if (!cancelled) loadRuns().finally(() => setLoading(false));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedMachine = machines.find((m) => m.id === form.machineId);

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const setZone = (index: number, value: string) =>
    setForm((f) => ({ ...f, zones: f.zones.map((z, i) => (i === index ? { ...z, value } : z)) }));

  const addZone = () =>
    setForm((f) => {
      if (f.zones.length >= 6) return f;
      const labels = ["A", "B", "C", "D", "E", "F"];
      return { ...f, zones: [...f.zones, { label: labels[f.zones.length] ?? String(f.zones.length + 1), value: "" }] };
    });

  const removeZone = (index: number) =>
    setForm((f) => {
      if (f.zones.length <= 1) return f;
      return { ...f, zones: f.zones.filter((_, i) => i !== index) };
    });

  const summaryInput: ProductionRunInput = useMemo(
    () => ({
      produced: sanitize(form.produced, true),
      damaged: sanitize(form.damaged, true),
      nonConforming: sanitize(form.nonConforming, true),
    }),
    [form.produced, form.damaged, form.nonConforming],
  );

  const summary = useMemo(() => buildProductionSummary(summaryInput), [summaryInput]);

  const isManualProduct = form.productId === MANUAL_PRODUCT;

  const timesInvalid = Boolean(
    form.startTime && form.endTime && `${form.productionDate}T${form.endTime}` <= `${form.productionDate}T${form.startTime}`,
  );
  const damagedExceeds = summaryInput.damaged > summaryInput.produced;
  const ncExceeds = summaryInput.nonConforming > summaryInput.produced;
  const sumExceeds = summaryInput.damaged + summaryInput.nonConforming > summaryInput.produced;
  const weightInvalid = (parseNum(form.injectionWeight) < 0) || (parseNum(form.pieceWeight) < 0);
  const zonesInvalid =
    form.temperatureType === "zones" && form.zones.every((z) => parseNum(z.value) < 0 || Number.isNaN(parseNum(z.value)));

  const show = (condition: boolean) => submitted && condition;

  const canSubmit =
    Boolean(form.machineId) &&
    Boolean(form.operatorId) &&
    Boolean(form.orderNumber.trim()) &&
    Boolean(form.productionDate) &&
    Boolean(form.startTime) &&
    Boolean(form.endTime) &&
    Boolean(form.material.trim()) &&
    Boolean(isManualProduct ? form.manualProductName.trim() : form.productId) &&
    form.injectionWeight !== "" &&
    form.pieceWeight !== "" &&
    form.cycleValue !== "" &&
    (form.temperatureType === "simple" ? form.temperature !== "" : form.zones.some((z) => parseNum(z.value) >= 0 && !Number.isNaN(parseNum(z.value)))) &&
    form.produced !== "" &&
    !timesInvalid &&
    !damagedExceeds &&
    !ncExceeds &&
    !sumExceeds &&
    !weightInvalid &&
    (form.couplingStatus !== "completed" || Boolean(form.couplingTime));

  const submit = async () => {
    if (saving) return;
    if (!canSubmit) {
      setSubmitted(true);
      setAlert({ type: "err", msg: "Revisa los campos marcados antes de continuar." });
      return;
    }
    setSaving(true);
    setAlert(null);
    try {
      const r = await fetch("/api/panel/production-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          machineId: form.machineId,
          operatorId: form.operatorId,
          productId: isManualProduct ? null : form.productId || null,
          manualProductName: isManualProduct ? form.manualProductName.trim() : null,
          orderNumber: form.orderNumber,
          productionDate: form.productionDate,
          startTime: `${form.productionDate}T${form.startTime}:00.000Z`,
          endTime: `${form.productionDate}T${form.endTime}:00.000Z`,
          material: form.material,
          pigment: [form.pigmentQuantity, form.pigmentColor].filter(Boolean).join(" g · ") || null,
          pigmentQuantity: form.pigmentQuantity === "" ? null : sanitize(form.pigmentQuantity),
          pigmentColor: form.pigmentColor || null,
          injectionWeight: sanitize(form.injectionWeight),
          pieceWeight: sanitize(form.pieceWeight),
          cycle: sanitize(form.cycleValue),
          cycleUnit: form.cycleUnit,
          temperature: form.temperatureType === "simple" ? sanitize(form.temperature) : 0,
          temperatureType: form.temperatureType,
          temperatureZones:
            form.temperatureType === "zones"
              ? form.zones.filter((z) => z.value.trim() !== "").map((z) => ({ label: z.label, value: zoneTemp(z.value) }))
              : [],
          produced: sanitize(form.produced, true),
          damaged: sanitize(form.damaged, true),
          nonConforming: sanitize(form.nonConforming, true),
          couplingStatus: form.couplingStatus || null,
          couplingTime: form.couplingStatus === "completed" ? form.couplingTime : null,
          couplingTest:
            form.couplingStatus === "completed"
              ? form.couplingTime || "Realizada"
              : form.couplingStatus === "na"
                ? "N/A"
                : null,
          observations: form.observations || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setAlert({ type: "err", msg: d.error ?? "No se pudo registrar la corrida" });
        return;
      }
      setForm(emptyForm());
      setSubmitted(false);
      setAlert({ type: "ok", msg: "Producción registrada correctamente." });
      await loadRuns();
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setForm(emptyForm());
    setSubmitted(false);
    setAlert(null);
  };

  const manualProducts = useMemo(
    () => [...new Set(runs.map((run) => run.manualProductName).filter((name): name is string => Boolean(name)))].sort((a, b) => a.localeCompare(b)),
    [runs],
  );
  const brands = useMemo(
    () => [...new Set(machines.map((m) => m.brand))].sort((a, b) => a.localeCompare(b)),
    [machines],
  );

  const filteredRuns = useMemo(() => filterProductionRuns(runs, filters), [runs, filters]);

  const activeFilterCount = useMemo(
    () => Object.values(filters).filter((value) => value.trim() !== "").length,
    [filters],
  );

  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / PAGE_SIZE));
  const pageRuns = filteredRuns.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // El jefe de operaciones supervisa la planta: solo necesita consultar el
  // historial de recorridas y exportarlo, no registrar corridas.
  const isOpsJefe = role === "JEFE_OPERACIONES";

  const historyStats = useMemo(() => {
    const produced = filteredRuns.reduce((s, r) => s + r.produced, 0);
    const good = filteredRuns.reduce((s, r) => s + r.summary.goodPieces, 0);
    const damaged = filteredRuns.reduce((s, r) => s + r.damaged, 0);
    return { count: filteredRuns.length, produced, good, damaged, quality: produced > 0 ? (good / produced) * 100 : 0 };
  }, [filteredRuns]);

  const pageNumbers = useMemo(() => {
    const windowSize = 5;
    let start = Math.max(1, page - Math.floor(windowSize / 2));
    const end = Math.min(totalPages, start + windowSize - 1);
    start = Math.max(1, end - windowSize + 1);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [page, totalPages]);

  const setDraftField = <K extends keyof ProductionRunFilters>(field: K, value: ProductionRunFilters[K]) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const applyFilters = () => {
    setFilters(draft);
    setPage(1);
  };

  const clearFilters = () => {
    const empty = createEmptyProductionRunFilters();
    setDraft(empty);
    setFilters(empty);
    setPage(1);
  };

  const downloadPdf = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const r = await fetch("/api/panel/production-runs/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filters }),
      });
      if (!r.ok) {
        setAlert({ type: "err", msg: "No se pudo generar el PDF del historial." });
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `historial-recorridas-${todayBogota()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setAlert({ type: "err", msg: "No se pudo generar el PDF del historial." });
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading || role === null) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      {!isOpsJefe && (
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Planta</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Inyección</h1>
          <p className="mt-0.5 text-sm text-[#64748B]">Registro diario de corridas de inyección</p>
        </div>
      )}

      {alert && (
        <div
          className={`mb-5 rounded-xl px-4 py-3 text-sm font-semibold ${
            alert.type === "ok" ? "bg-[#DCFCE7] text-[#15803D]" : "bg-[#FEE2E2] text-[#B91C1C]"
          }`}
        >
          {alert.msg}
        </div>
      )}

      {!isOpsJefe && (
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* 1. Información general */}
          <Card
            icon={<MdInfo size={16} />}
            title="Información general"
            subtitle="Datos de la máquina, operario y horario de la corrida."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Máquina <Req /></label>
                <SimpleSelect
                  value={form.machineId}
                  options={[
                    { value: "", label: "— Seleccionar —" },
                    ...machines.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` })),
                  ]}
                  onChange={(v) => set("machineId", v)}
                />
                {show(!form.machineId) && <p className={errorClass}>Selecciona una máquina.</p>}
              </div>
              <div>
                <label className={labelClass}>Marca</label>
                <input
                  value={selectedMachine?.brand ?? ""}
                  readOnly
                  disabled
                  placeholder="Automática"
                  className={`${inputClass} cursor-not-allowed border-[#EEF2F7] bg-[#F8FAFC] font-semibold text-[#475569]`}
                />
              </div>
              <div>
                <label className={labelClass}>Operario <Req /></label>
                <SimpleSelect
                  value={form.operatorId}
                  options={[
                    { value: "", label: "— Seleccionar —" },
                    ...operators.map((o) => ({ value: o.id, label: o.fullName })),
                  ]}
                  onChange={(v) => set("operatorId", v)}
                />
                {show(!form.operatorId) && <p className={errorClass}>Selecciona un operario.</p>}
              </div>
              <div>
                <label className={labelClass}>Fecha <Req /></label>
                <input type="date" value={form.productionDate} onChange={(e) => set("productionDate", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Hora inicio <Req /></label>
                <input type="time" value={form.startTime} onChange={(e) => set("startTime", e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Hora final <Req /></label>
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                  className={timesInvalid ? inputErrClass : inputClass}
                />
              </div>
              <div className="col-span-full">
                <label className={labelClass}>N° Orden de inyección <Req /></label>
                <input
                  value={form.orderNumber}
                  onChange={(e) => set("orderNumber", e.target.value)}
                  placeholder="Ej. OI-2026-0917-01"
                  className={show(!form.orderNumber.trim()) ? inputErrClass : inputClass}
                />
                {show(!form.orderNumber.trim()) && <p className={errorClass}>Ingresa el N° de orden de inyección.</p>}
              </div>
              {timesInvalid && (
                <p className="col-span-full text-xs font-semibold text-[#DC2626]">
                  La hora final debe ser posterior a la hora inicial.
                </p>
              )}
            </div>
          </Card>

          {/* 2. Parámetros de producción */}
          <Card
            icon={<MdPrecisionManufacturing size={16} />}
            title="Parámetros de producción"
            subtitle="Características del producto y condiciones de proceso."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-full">
                <label className={labelClass}>Pieza de inyección / Producto <Req /></label>
                <SimpleSelect
                  value={form.productId}
                  options={[
                    { value: "", label: "— Seleccionar producto —" },
                    ...products.map((p) => ({ value: p.id, label: `${p.name}${p.sku ? ` (${p.sku})` : ""}` })),
                    { value: MANUAL_PRODUCT, label: "Producto manual" },
                  ]}
                  onChange={(v) => set("productId", v)}
                />
                {show(!form.productId) && <p className={errorClass}>Selecciona un producto o elige “Producto manual”.</p>}
              </div>
              {isManualProduct && (
                <div className="col-span-full">
                  <label className={labelClass}>Nombre / referencia del producto <Req /></label>
                  <input
                    value={form.manualProductName}
                    onChange={(e) => set("manualProductName", e.target.value)}
                    placeholder="Ej. Tapa dispensador 500 ml"
                    className={show(!form.manualProductName.trim()) ? inputErrClass : inputClass}
                  />
                  {show(!form.manualProductName.trim()) && <p className={errorClass}>Escribe el nombre del producto.</p>}
                </div>
              )}
              <div className="col-span-full">
                <label className={labelClass}>Material <Req /></label>
                <input
                  value={form.material}
                  onChange={(e) => set("material", e.target.value)}
                  placeholder="Referencia, tipo y cantidad entregada (ej. PP Negro – 25 kg)"
                  className={show(!form.material.trim()) ? inputErrClass : inputClass}
                />
                {show(!form.material.trim()) && <p className={errorClass}>Indica el material y la cantidad entregada.</p>}
              </div>
              <div>
                <label className={labelClass}>Peso de inyección (g) <Req /></label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.injectionWeight}
                  onChange={(e) => set("injectionWeight", e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="35.5"
                  className={`no-spinner ${show(form.injectionWeight === "" || parseNum(form.injectionWeight) < 0) ? inputErrClass : inputClass}`}
                />
                {show(form.injectionWeight === "" ? true : parseNum(form.injectionWeight) < 0) && (
                  <p className={errorClass}>{form.injectionWeight === "" ? "Ingresa el peso de inyección." : "El peso debe ser mayor o igual a cero."}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Peso de la vela (g) <Req /></label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.pieceWeight}
                  onChange={(e) => set("pieceWeight", e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="5.2"
                  className={`no-spinner ${show(form.pieceWeight === "" || parseNum(form.pieceWeight) < 0) ? inputErrClass : inputClass}`}
                />
                {show(form.pieceWeight === "" ? true : parseNum(form.pieceWeight) < 0) && (
                  <p className={errorClass}>{form.pieceWeight === "" ? "Ingresa el peso de la vela." : "El peso debe ser mayor o igual a cero."}</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Ciclo <Req /></label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={form.cycleValue}
                    onChange={(e) => set("cycleValue", e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="35"
                    className={`no-spinner ${show(form.cycleValue === "") ? inputErrClass : inputClass}`}
                  />
                  <select
                    value={form.cycleUnit}
                    onChange={(e) => set("cycleUnit", e.target.value as CycleUnit)}
                    className={`${inputClass} w-32 shrink-0`}
                  >
                    <option value="seconds">segundos</option>
                    <option value="minutes">minutos</option>
                  </select>
                </div>
                {show(form.cycleValue === "") && <p className={errorClass}>Ingresa el ciclo.</p>}
              </div>
              <div className="col-span-full sm:col-span-2">
                <label className={labelClass}>Tipo de temperatura <Req /></label>
                <SimpleSelect
                  value={form.temperatureType}
                  options={[
                    { value: "simple", label: "Simple" },
                    { value: "zones", label: "Por zonas" },
                  ]}
                  onChange={(v) => set("temperatureType", v as TemperatureType)}
                />
              </div>
              {form.temperatureType === "simple" ? (
                <div>
                  <label className={labelClass}>Temperatura (°C) <Req /></label>
                  <input
                    type="number"
                    min={0}
                    value={form.temperature}
                    onChange={(e) => set("temperature", e.target.value)}
                    onWheel={(e) => e.currentTarget.blur()}
                    placeholder="190"
                    className={`no-spinner ${show(form.temperature === "") ? inputErrClass : inputClass}`}
                  />
                  {show(form.temperature === "") && <p className={errorClass}>Ingresa la temperatura.</p>}
                </div>
              ) : (
                <div className="col-span-full">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {form.zones.map((zone, index) => (
                      <div key={zone.label}>
                        <label className={labelClass}>Zona {zone.label} (°C)</label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min={0}
                            value={zone.value}
                            onChange={(e) => setZone(index, e.target.value)}
                            onWheel={(e) => e.currentTarget.blur()}
                            placeholder={index === 0 ? "165" : "185"}
                            className={`no-spinner ${inputClass}`}
                          />
                          {form.zones.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeZone(index)}
                              className="shrink-0 rounded-lg border border-[#E2E8F0] px-2 text-[#94A3B8] hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                              aria-label={`Quitar zona ${zone.label}`}
                            >
                              <MdClose size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={addZone}
                    disabled={form.zones.length >= 6}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-40"
                  >
                    <MdAdd size={14} /> Agregar zona
                  </button>
                  {show(zonesInvalid) && <p className={errorClass}>Ingresa al menos una temperatura de zona.</p>}
                </div>
              )}
              <div className="col-span-full">
                <label className={labelClass}>Pigmento (opcional)</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <input
                      type="number"
                      min={0}
                      value={form.pigmentQuantity}
                      onChange={(e) => set("pigmentQuantity", e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="Cantidad (g)"
                      className={`no-spinner ${inputClass}`}
                    />
                  </div>
                  <div>
                    <input
                      value={form.pigmentColor}
                      onChange={(e) => set("pigmentColor", e.target.value)}
                      placeholder="Color"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* 3. Producción */}
          <Card
            icon={<MdBarChart size={16} />}
            title="Producción"
            subtitle="Registra los resultados de la corrida."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className={labelClass}>Cantidad producida <Req /></label>
                <input
                  type="number"
                  min={0}
                  value={form.produced}
                  onChange={(e) => set("produced", e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="390"
                  className={`no-spinner ${show(form.produced === "") ? inputErrClass : inputClass}`}
                />
                {show(form.produced === "") && <p className={errorClass}>Ingresa la cantidad producida.</p>}
              </div>
              <div>
                <label className={labelClass}>Cantidad dañada <Req /></label>
                <input
                  type="number"
                  min={0}
                  value={form.damaged}
                  onChange={(e) => set("damaged", e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  className={`no-spinner ${show(damagedExceeds || sumExceeds) ? inputErrClass : inputClass}`}
                />
                {show(damagedExceeds) && <p className={errorClass}>La cantidad dañada no puede superar la cantidad producida.</p>}
              </div>
              <div>
                <label className={labelClass}>No conformes <Req /></label>
                <input
                  type="number"
                  min={0}
                  value={form.nonConforming}
                  onChange={(e) => set("nonConforming", e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0"
                  className={`no-spinner ${show(ncExceeds) ? inputErrClass : inputClass}`}
                />
                {show(ncExceeds) && <p className={errorClass}>Los no conformes no pueden superar la cantidad producida.</p>}
              </div>
              {show(sumExceeds && !damagedExceeds && !ncExceeds) && (
                <p className="col-span-full text-xs font-semibold text-[#DC2626]">
                  La suma de dañadas y no conformes no puede superar la cantidad producida.
                </p>
              )}
            </div>
          </Card>

          {/* 4. Prueba de acople */}
          <Card
            icon={<MdLink size={16} />}
            title="Prueba de acople"
            subtitle="Indica si se realizó la prueba de acople."
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="col-span-full flex items-center gap-6 sm:col-span-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
                  <input
                    type="radio"
                    name="couplingStatus"
                    checked={form.couplingStatus === "completed"}
                    onChange={() => set("couplingStatus", "completed")}
                    className="h-4 w-4 accent-[#27B1B8]"
                  />
                  Realizada
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#1A1A1A]">
                  <input
                    type="radio"
                    name="couplingStatus"
                    checked={form.couplingStatus === "na"}
                    onChange={() => set("couplingStatus", "na")}
                    className="h-4 w-4 accent-[#27B1B8]"
                  />
                  N/A
                </label>
              </div>
              {form.couplingStatus === "completed" && (
                <div className="col-span-full sm:col-span-1">
                  <label className={labelClass}>Hora de prueba <Req /></label>
                  <input
                    type="time"
                    value={form.couplingTime}
                    onChange={(e) => set("couplingTime", e.target.value)}
                    className={show(!form.couplingTime) ? inputErrClass : inputClass}
                  />
                  {show(!form.couplingTime) && <p className={errorClass}>Indica la hora de la prueba.</p>}
                </div>
              )}
            </div>
          </Card>

          {/* 5. Observaciones */}
          <Card
            icon={<MdNotes size={16} />}
            title="Observaciones"
            subtitle="Registra novedades de la corrida (opcional)."
          >
            <textarea
              value={form.observations}
              onChange={(e) => set("observations", e.target.value.slice(0, 500))}
              rows={3}
              placeholder="Ej. Ajuste de molde, cambio de material, variación en el proceso…"
              className={inputClass}
            />
            <p className="mt-1 text-right text-[11px] text-[#94A3B8]">{form.observations.length}/500</p>
          </Card>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={submit}
              disabled={saving}
              className="rounded-xl bg-[#27B1B8] px-5 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition-all hover:bg-[#1F9AA0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Registrando…" : "Registrar producción"}
            </button>
            <button
              onClick={reset}
              disabled={saving}
              className="rounded-xl border border-[#E2E8F0] bg-white px-5 py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC] disabled:opacity-50"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Columna lateral: resumen, fórmulas y validaciones */}
        <div className="space-y-6">
          <div className="h-fit rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F7F7] text-[#0F9AA1]">
                <MdBarChart size={16} />
              </span>
              <div>
                <h2 className="text-sm font-black uppercase tracking-widest text-[#64748B]">Resumen en tiempo real</h2>
                <p className="text-[11px] text-[#94A3B8]">Se actualiza automáticamente.</p>
              </div>
            </div>
            <div className="space-y-2">
              <SummaryRow label="Cantidad producida" value={summaryInput.produced} />
              <SummaryRow label="Dañadas" value={summaryInput.damaged} />
              <SummaryRow label="No conformes" value={summaryInput.nonConforming} />
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

          <div className="h-fit rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1D4ED8]">
                <MdNotes size={16} />
              </span>
              <h2 className="text-sm font-black uppercase tracking-widest text-[#64748B]">Fórmulas</h2>
            </div>
            <div className="space-y-3 text-xs text-[#475569]">
              <div>
                <p className="font-bold text-[#1A1A1A]">Piezas buenas:</p>
                <p>Producidas − Dañadas − No conformes</p>
              </div>
              <div>
                <p className="font-bold text-[#1A1A1A]">% Calidad:</p>
                <p>(Piezas buenas / Producidas) × 100</p>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-[#F8FAFC] px-3 py-2 text-[11px] text-[#64748B]">
                <MdCheckCircle size={13} className="text-[#27B1B8]" /> Los valores se calculan automáticamente.
              </div>
            </div>
          </div>

          <div className="h-fit rounded-2xl border border-[#E2E8F0] bg-white p-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFF6FF] text-[#1D4ED8]">
                <MdCheckCircle size={16} />
              </span>
              <h2 className="text-sm font-black uppercase tracking-widest text-[#64748B]">Validaciones</h2>
            </div>
            <ul className="space-y-2 text-xs">
              <Rule ok={!damagedExceeds} label="Cantidad dañada ≤ producida" />
              <Rule ok={!ncExceeds} label="No conformes ≤ producida" />
              <Rule ok={!sumExceeds} label="Dañadas + No conformes ≤ producida" />
              <Rule ok={!timesInvalid} label="Hora final > Hora inicio" />
              <Rule ok={!weightInvalid} label="Pesos ≥ 0" />
            </ul>
          </div>
        </div>
      </div>
      )}

      {/* Historial de recorridas */}
      <div className={`rounded-2xl border border-[#E2E8F0] bg-white p-6 ${isOpsJefe ? "" : "mt-8"}`}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#E0F7F7] text-[#0F9AA1]">
              <MdHistory size={22} />
            </span>
            <div>
              <h2 className="text-xl font-black text-[#1A1A1A]">Historial de recorridas</h2>
              <p className="mt-0.5 text-sm text-[#64748B]">
                Visualiza y consulta el detalle de todas las recorridas realizadas en las máquinas.
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold capitalize text-[#475569]">
              {now?.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
            <p className="text-xs text-[#94A3B8]">
              {now?.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <div className="relative">
              <MdSearch size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <input
                value={draft.search}
                onChange={(e) => setDraftField("search", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
                placeholder="Buscar por producto, operario, orden, marca o material…"
                className={`${inputClass} pl-9`}
              />
            </div>
          </div>
          <div className="w-full sm:w-36">
            <label className={labelClass}>N° Orden</label>
            <input
              value={draft.orderNumber}
              onChange={(e) => setDraftField("orderNumber", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="Ej. 1664"
              className={inputClass}
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className={labelClass}>Desde</label>
            <input type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => setDraftField("from", e.target.value)} className={inputClass} />
          </div>
          <div className="w-full sm:w-auto">
            <label className={labelClass}>Hasta</label>
            <input type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraftField("to", e.target.value)} className={inputClass} />
          </div>
          <button
            type="button"
            onClick={applyFilters}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0F9AA1] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#0C7F86]"
          >
            <MdFilterList size={16} /> Filtrar
          </button>
        </div>

        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={labelClass}>Máquina</label>
            <SimpleSelect
              value={draft.machineId}
              options={[
                { value: "", label: "Todas las máquinas" },
                ...machines.map((m) => ({ value: m.id, label: `${m.code} · ${m.name}` })),
              ]}
              onChange={(v) => setDraftField("machineId", v)}
            />
          </div>
          <div>
            <label className={labelClass}>Marca</label>
            <SimpleSelect
              value={draft.brand}
              options={[
                { value: "", label: "Todas las marcas" },
                ...brands.map((b) => ({ value: b, label: b })),
              ]}
              onChange={(v) => setDraftField("brand", v)}
            />
          </div>
          <div>
            <label className={labelClass}>Operario</label>
            <SimpleSelect
              value={draft.operatorId}
              options={[
                { value: "", label: "Todos los operarios" },
                ...operators.map((o) => ({ value: o.id, label: o.fullName })),
              ]}
              onChange={(v) => setDraftField("operatorId", v)}
            />
          </div>
          <div>
            <label className={labelClass}>Producto</label>
            <SimpleSelect
              value={draft.product}
              options={[
                { value: "", label: "Todos los productos" },
                ...products.map((p) => ({ value: `p:${p.id}`, label: p.name })),
                ...manualProducts.map((name) => ({ value: `m:${name}`, label: name })),
              ]}
              onChange={(v) => setDraftField("product", v)}
            />
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setShowMoreFilters((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3.5 py-2 text-sm font-bold text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
          >
            <MdFilterList size={15} /> {showMoreFilters ? "Ocultar rangos" : "Más filtros (rangos)"}
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#E2E8F0] px-3.5 py-2 text-sm font-bold text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
            >
              <MdRefresh size={16} /> Limpiar filtros
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-[#27B1B8] px-1.5 py-0.5 text-[10px] font-black text-white">{activeFilterCount}</span>
              )}
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#27B1B8] bg-[#F0FAFA] px-3.5 py-2 text-sm font-bold text-[#0C6060] transition-colors hover:bg-[#E0F7F7] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <MdPictureAsPdf size={16} /> {pdfLoading ? "Generando…" : "Descargar PDF"}
            </button>
          </div>
        </div>

        {showMoreFilters && (
          <div className="mb-4 grid gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:grid-cols-2 lg:grid-cols-3">
            <RangeFilter label="Producidas" min={draft.producedMin} max={draft.producedMax} onMin={(v) => setDraftField("producedMin", v)} onMax={(v) => setDraftField("producedMax", v)} />
            <RangeFilter label="Dañadas" min={draft.damagedMin} max={draft.damagedMax} onMin={(v) => setDraftField("damagedMin", v)} onMax={(v) => setDraftField("damagedMax", v)} />
            <RangeFilter label="No conformes" min={draft.nonConformingMin} max={draft.nonConformingMax} onMin={(v) => setDraftField("nonConformingMin", v)} onMax={(v) => setDraftField("nonConformingMax", v)} />
            <RangeFilter label="Buenas" min={draft.goodMin} max={draft.goodMax} onMin={(v) => setDraftField("goodMin", v)} onMax={(v) => setDraftField("goodMax", v)} />
            <RangeFilter label="% Calidad" min={draft.qualityMin} max={draft.qualityMax} onMin={(v) => setDraftField("qualityMin", v)} onMax={(v) => setDraftField("qualityMax", v)} step="0.01" />
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <HistoryStat label="Recorridas" value={String(historyStats.count)} />
          <HistoryStat label="Piezas producidas" value={historyStats.produced.toLocaleString("es-CO")} />
          <HistoryStat label="Piezas buenas" value={historyStats.good.toLocaleString("es-CO")} />
          <HistoryStat label="% Calidad promedio" value={fmtPct(historyStats.quality)} accent />
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
          <table className="w-full min-w-[980px] border-collapse text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                {["Fecha", "N° Orden", "Máquina", "Marca", "Operario", "Producto", "Producidas", "Dañadas", "No conf.", "Buenas", "% Calidad", "Acciones"].map((h) => (
                  <th key={h} className="border border-[#E2E8F0] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRuns.map((run) => (
                <tr key={run.id} className="hover:bg-[#F8FAFC]">
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{fmtDateOnly(run.productionDate)}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 font-semibold">{run.orderNumber}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{run.machine.code} · {run.machine.name}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{run.machine.brand}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{run.operator.fullName}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5">{productLabel(run)}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{run.produced}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{run.damaged}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right">{run.nonConforming}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right font-bold text-[#0C6060]">{run.summary.goodPieces}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5 text-right font-bold text-[#27B1B8]">{fmtPct(run.summary.qualityPercentage)}</td>
                  <td className="border border-[#E2E8F0] px-2 py-1.5">
                    <button
                      onClick={() => setDetail(run)}
                      className="rounded-lg border border-[#E2E8F0] px-2.5 py-1 text-xs font-bold text-[#475569] hover:bg-[#F1F5F9]"
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))}
              {filteredRuns.length === 0 && (
                <tr>
                  <td colSpan={12} className="border border-[#E2E8F0] px-2 py-6 text-center text-sm text-[#94A3B8]">
                    Sin recorridas registradas todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredRuns.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <span className="text-[#64748B]">
              Mostrando {(page - 1) * PAGE_SIZE + 1} a {Math.min(page * PAGE_SIZE, filteredRuns.length)} de {filteredRuns.length} registros
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Página anterior"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] disabled:opacity-40"
              >
                <MdChevronLeft size={18} />
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-8 min-w-8 rounded-lg px-2 text-sm font-bold transition-colors ${
                    n === page
                      ? "bg-[#0F9AA1] text-white"
                      : "border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC]"
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Página siguiente"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E2E8F0] text-[#64748B] disabled:opacity-40"
              >
                <MdChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {detail && <DetailModal run={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

function Card({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#E0F7F7] text-[#0F9AA1]">{icon}</span>
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest text-[#64748B]">{title}</h2>
          <p className="text-[11px] text-[#94A3B8]">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function Req() {
  return <span className="text-[#DC2626]">*</span>;
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className="text-sm font-bold text-[#1A1A1A]">{value.toLocaleString("es-CO")}</span>
    </div>
  );
}

function HistoryStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-[#94A3B8]">{label}</p>
      <p className={`mt-0.5 text-lg font-black ${accent ? "text-[#27B1B8]" : "text-[#1A1A1A]"}`}>{value}</p>
    </div>
  );
}

function RangeFilter({
  label,
  min,
  max,
  onMin,
  onMax,
  step,
}: {
  label: string;
  min: string;
  max: string;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  step?: string;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-2">
        <input type="number" min={0} step={step} value={min} onChange={(e) => onMin(e.target.value)} placeholder="Mín" className={`no-spinner ${inputClass}`} />
        <span className="text-[#94A3B8]">–</span>
        <input type="number" min={0} step={step} value={max} onChange={(e) => onMax(e.target.value)} placeholder="Máx" className={`no-spinner ${inputClass}`} />
      </div>
    </div>
  );
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? "text-[#475569]" : "font-semibold text-[#DC2626]"}`}>
      {ok ? <MdCheckCircle size={15} className="shrink-0 text-[#27B1B8]" /> : <MdCancel size={15} className="shrink-0" />}
      {label}
    </li>
  );
}

function DetailModal({ run, onClose }: { run: RunListItem; onClose: () => void }) {
  const efficiency = calcProductionEfficiency(run);
  const tone = efficiencyTone(efficiency.efficiencyPercentage);
  const cycleLabel = `${run.cycle} ${cycleUnitLabel(run.cycleUnit)}`;
  const metaPct = efficiency.efficiencyPercentage;
  const barWidth = metaPct === null ? 0 : Math.min(Math.max(metaPct, 0), 100);
  const rejectionPct = run.produced > 0 ? (run.damaged / run.produced) * 100 : 0;
  const acopleOk = run.couplingStatus === "completed";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" onClick={onClose}>
      <div
        className="w-full max-w-5xl rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Encabezado */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-2xl font-black text-[#1A1A1A]">Detalle de corrida</h2>
            <p className="mt-1 text-sm font-semibold text-[#64748B]">
              Orden #{run.orderNumber} · {fmtDateOnly(run.productionDate, { day: "numeric", month: "short", year: "numeric" })}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              <HeaderMeta icon={<MdPrecisionManufacturing size={16} />} text={`${run.machine.code} · ${run.machine.name}`} />
              <MetaDivider />
              <HeaderMeta icon={<MdLocalOffer size={16} />} text={run.machine.brand} />
              <MetaDivider />
              <HeaderMeta icon={<MdPersonOutline size={16} />} text={run.operator.fullName} />
              <MetaDivider />
              <HeaderMeta icon={<MdAccessTime size={16} />} text={`${fmtTimeOnly(run.startTime)} — ${fmtTimeOnly(run.endTime)}`} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-[#94A3B8] transition-colors hover:bg-[#F1F5F9] hover:text-[#1A1A1A]"
            aria-label="Cerrar"
          >
            <MdClose size={22} />
          </button>
        </div>

        {/* 2. Resumen principal */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`rounded-xl border border-[#EEF2F7] border-l-4 p-4 ${tone.cardBg} ${tone.border}`}>
            <div className="flex items-center gap-2">
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${tone.iconBg} ${tone.iconFg}`}>
                <MdBarChart size={17} />
              </span>
              <span className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#64748B]">
                Producción
                <MdInfoOutline
                  size={13}
                  className="text-[#94A3B8]"
                  title="Piezas producidas frente a las esperadas según el ciclo y el tiempo entre hora inicio y hora final."
                />
              </span>
            </div>
            <div className="mt-3 flex items-end justify-between gap-2">
              <p className="text-2xl font-black leading-none text-[#1A1A1A]">
                {run.produced.toLocaleString("es-CO")}
                <span className="ml-1 text-base font-bold text-[#94A3B8]">/ {efficiency.expectedPieces.toLocaleString("es-CO")}</span>
              </p>
              {metaPct !== null && (
                <span className={`rounded-full px-2 py-0.5 text-xs font-black ${tone.chip}`}>{metaPct.toFixed(1)}%</span>
              )}
            </div>
            <p className="mt-1 text-xs text-[#64748B]">
              {metaPct === null ? "Sin ciclo definido" : `${Math.round(metaPct)}% de la meta`}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#E9EDF2]">
              <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${barWidth}%` }} />
            </div>
          </div>

          <KpiCard
            label="Piezas buenas"
            value={run.summary.goodPieces.toLocaleString("es-CO")}
            icon={<MdCheckCircle size={17} />}
            iconBg="bg-[#DCFCE7]"
            iconFg="text-[#15803D]"
            border="border-l-[#16A34A]"
          />
          <KpiCard
            label="Rechazo"
            value={run.damaged.toLocaleString("es-CO")}
            sub={`${rejectionPct.toFixed(2)}%`}
            icon={<MdCancel size={17} />}
            iconBg="bg-[#FEE2E2]"
            iconFg="text-[#DC2626]"
            border="border-l-[#DC2626]"
          />
          <KpiCard
            label="Calidad"
            value={fmtPct(run.summary.qualityPercentage)}
            icon={<MdStar size={17} />}
            iconBg="bg-[#DCFCE7]"
            iconFg="text-[#15803D]"
            border="border-l-[#16A34A]"
          />
        </div>

        {/* 3-6. Detalle en dos columnas */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SectionCard icon={<MdInventory2 size={16} />} title="Información de producción">
            <InfoRow label="Producto">{productLabel(run)}</InfoRow>
            <InfoRow label="Material">{run.material}</InfoRow>
            <InfoRow label="Ciclo">{cycleLabel}</InfoRow>
            <InfoRow label="Producción esperada">{efficiency.expectedPieces.toLocaleString("es-CO")} piezas</InfoRow>
          </SectionCard>

          <SectionCard icon={<MdSettings size={16} />} title="Parámetros de proceso">
            <InfoRow label="Peso de inyección">{`${run.injectionWeight} g`}</InfoRow>
            <InfoRow label="Peso de la vela">{`${run.pieceWeight} g`}</InfoRow>
            <InfoRow label="Temperatura">{temperatureLabel(run)}</InfoRow>
            <InfoRow label="Pigmento / Color">{pigmentLabel(run)}</InfoRow>
          </SectionCard>

          <SectionCard icon={<MdVerifiedUser size={16} />} title="Control de calidad">
            <InfoRow label="Cantidad dañada">{run.damaged.toLocaleString("es-CO")}</InfoRow>
            <InfoRow label="No conformes">{run.nonConforming.toLocaleString("es-CO")}</InfoRow>
            <InfoRow label="Prueba de acople">
              <span className={`inline-flex items-center gap-2 ${acopleOk ? "text-[#15803D]" : "text-[#1A1A1A]"}`}>
                {acopleOk && <MdCheckCircle size={16} />}
                {couplingLabel(run)}
              </span>
            </InfoRow>
            <InfoRow label="% Calidad">{fmtPct(run.summary.qualityPercentage)}</InfoRow>
          </SectionCard>

          <SectionCard icon={<MdChatBubbleOutline size={16} />} title="Observaciones">
            {run.observations ? (
              <div className="border-t border-[#F1F5F9] px-4 py-3">
                <p className="whitespace-pre-wrap text-sm text-[#1A1A1A]">{run.observations}</p>
              </div>
            ) : (
              <div className="border-t border-[#F1F5F9] p-3">
                <div className="flex flex-col items-center justify-center rounded-lg bg-[#F8FAFC] py-8 text-center">
                  <MdChatBubbleOutline size={22} className="text-[#94A3B8]" />
                  <p className="mt-2 text-sm font-semibold text-[#64748B]">Sin observaciones</p>
                  <p className="mt-0.5 text-xs text-[#94A3B8]">No se registraron observaciones en esta corrida.</p>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function HeaderMeta({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-[#94A3B8]">{icon}</span>
      <span className="font-medium text-[#475569]">{text}</span>
    </span>
  );
}

function MetaDivider() {
  return <span className="hidden h-4 w-px bg-[#E2E8F0] sm:block" />;
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  iconBg,
  iconFg,
  border,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  iconFg: string;
  border: string;
}) {
  return (
    <div className={`rounded-xl border border-[#EEF2F7] border-l-4 bg-white p-4 ${border}`}>
      <div className="flex items-center gap-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${iconBg} ${iconFg}`}>{icon}</span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-[#64748B]">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-black leading-none text-[#1A1A1A]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[#64748B]">{sub}</p>}
    </div>
  );
}

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
      <div className="flex items-center gap-2.5 bg-[#F8FAFC] px-4 py-3">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[#475569] shadow-sm">{icon}</span>
        <h3 className="text-[11px] font-black uppercase tracking-widest text-[#64748B]">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#F1F5F9] px-4 py-2.5">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className="text-right text-sm font-semibold text-[#1A1A1A]">{children}</span>
    </div>
  );
}
