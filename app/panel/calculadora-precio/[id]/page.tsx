"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildSaleCalculatorSummary, type SaleCalcConfig, type SaleCalcItemInput } from "@/lib/sale-calculator";

const fmt = (n: number) =>
  (n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const fmtPct = (n: number) => `${(n || 0).toFixed(2)}%`;

const MAX_NUM = 999_999_999;

function sanitize(value: string, integer = false): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  const clamped = n > MAX_NUM ? MAX_NUM : n;
  return integer ? Math.round(clamped) : clamped;
}

function sanitizePctInput(value: string): number {
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n > 99.99 ? 99.99 : n;
}

type Item = { id: string; productId: string | null; nombreProducto: string; cantidad: number; costoUnitario: number };
type Product = { id: string; name: string; price: number; image: string };

const inputClass =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 text-sm text-[#1A1A1A] outline-none focus:border-[#27B1B8]";

function Cell({ value, onCommit, integer, align = "right" }: {
  value: number; onCommit: (n: number) => void; integer?: boolean; align?: "left" | "right";
}) {
  const [local, setLocal] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  const [focused, setFocused] = useState(false);

  if (value !== prevValue && !focused) {
    setPrevValue(value);
    setLocal(String(value));
  }

  return (
    <input
      type="number"
      min={0}
      value={local}
      onFocus={() => setFocused(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => { setFocused(false); onCommit(sanitize(e.target.value, integer)); }}
      className={`no-spinner ${inputClass} ${align === "right" ? "text-right" : ""}`}
    />
  );
}

function PctCell({ value, onCommit }: { value: number; onCommit: (n: number) => void }) {
  const [local, setLocal] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  const [focused, setFocused] = useState(false);

  if (value !== prevValue && !focused) {
    setPrevValue(value);
    setLocal(String(value));
  }

  return (
    <div className="relative">
      <input
        type="number"
        min={0}
        max={99.99}
        value={local}
        onFocus={() => setFocused(true)}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={(e) => { setFocused(false); onCommit(sanitizePctInput(e.target.value)); }}
        className={`no-spinner ${inputClass} pr-6 text-right`}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-[#94A3B8]">%</span>
    </div>
  );
}

export default function SaleCalculatorEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [name, setName] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [config, setConfig] = useState<SaleCalcConfig>({ envio: 0, picking: 0, comisionPct: 2.5, margenPct: 25, campanaPct: 10 });
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/panel/sale-calculators/${id}`).then((r) => r.json()),
      fetch("/api/panel/products?minimal=1").then((r) => r.json()),
    ]).then(([detail, prods]) => {
      if (cancelled) return;
      if (detail) {
        setName(detail.name);
        setItems(detail.items);
        setConfig({ envio: detail.envio, picking: detail.picking, comisionPct: detail.comisionPct, margenPct: detail.margenPct, campanaPct: detail.campanaPct });
      }
      setProducts(prods ?? []);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  const summary = useMemo(() => {
    const calcItems: SaleCalcItemInput[] = items.map((i) => ({ id: i.id, cantidad: i.cantidad, costoUnitario: i.costoUnitario }));
    return buildSaleCalculatorSummary(calcItems, config);
  }, [items, config]);

  const patchCalculator = async (data: Partial<SaleCalcConfig> & { name?: string }) => {
    try {
      const r = await fetch(`/api/panel/sale-calculators/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!r.ok) setError("No se pudo guardar el cambio");
    } catch {
      setError("No se pudo guardar el cambio");
    }
  };

  const updateConfig = (field: keyof SaleCalcConfig, value: number) => {
    setConfig((c) => ({ ...c, [field]: value }));
    patchCalculator({ [field]: value });
  };

  const patchItem = async (itemId: string, data: Partial<Item>) => {
    try {
      const r = await fetch(`/api/panel/sale-calculator-items/${itemId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      });
      if (!r.ok) setError("No se pudo guardar el producto");
    } catch {
      setError("No se pudo guardar el producto");
    }
  };

  const updateItem = (itemId: string, data: Partial<Item>) => {
    setItems((prev) => prev.map((i) => (i.id === itemId ? { ...i, ...data } : i)));
    patchItem(itemId, data);
  };

  const addItem = async (manual: boolean) => {
    const body = manual
      ? { nombreProducto: "Producto nuevo", cantidad: 1, costoUnitario: 0 }
      : { productId: products[0]?.id ?? null, nombreProducto: products[0]?.name ?? "Producto", cantidad: 1, costoUnitario: products[0]?.price ?? 0 };
    const r = await fetch(`/api/panel/sale-calculators/${id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (r.ok) setItems((prev) => [...prev, d]);
  };

  const duplicateItem = async (item: Item) => {
    const r = await fetch(`/api/panel/sale-calculators/${id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: item.productId, nombreProducto: item.nombreProducto, cantidad: item.cantidad, costoUnitario: item.costoUnitario }),
    });
    const d = await r.json();
    if (r.ok) setItems((prev) => [...prev, d]);
  };

  const removeItem = async (itemId: string) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    await fetch(`/api/panel/sale-calculator-items/${itemId}`, { method: "DELETE" });
  };

  const selectProduct = (itemId: string, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    updateItem(itemId, { productId: product.id, nombreProducto: product.name, costoUnitario: product.price });
  };

  const saveCombo = async () => {
    setSaving(true);
    try {
      await Promise.all([
        patchCalculator({ name, envio: config.envio, picking: config.picking, comisionPct: config.comisionPct, margenPct: config.margenPct, campanaPct: config.campanaPct }),
        ...items.map((i) => patchItem(i.id, { productId: i.productId, nombreProducto: i.nombreProducto, cantidad: i.cantidad, costoUnitario: i.costoUnitario })),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
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

  const cascadeRows: { label: string; value: number; positive?: boolean }[] = [
    { label: "Subtotal productos", value: summary.subtotal },
    { label: `Margen ${fmtPct(config.margenPct)}` , value: summary.precioBase - summary.subtotal },
    { label: "Precio base", value: summary.precioBase, positive: true },
    { label: `Comisión ${fmtPct(config.comisionPct)}`, value: summary.comision },
    { label: `Campaña ${fmtPct(config.campanaPct)}`, value: summary.campana },
    { label: "Envío", value: summary.envio },
    { label: "Picking", value: summary.picking },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button onClick={() => router.push("/panel/calculadora-precio")} className="text-xs font-bold text-[#94A3B8] hover:text-[#1A1A1A]">← Calculadoras</button>
          <label className="mt-3 block text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">Nombre del combo</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => patchCalculator({ name })}
            className="mt-1 block w-full max-w-md rounded-lg border border-transparent bg-transparent text-2xl font-black text-[#1A1A1A] outline-none transition-all duration-200 hover:cursor-pointer hover:border-[#E2E8F0] hover:bg-[#F8FAFC] hover:px-2 hover:py-1 focus:border-[#E2E8F0] focus:bg-white focus:px-2 focus:py-1"
          />
        </div>
        <button
          onClick={saveCombo}
          disabled={saving}
          className="shrink-0 rounded-xl bg-[#27B1B8] px-5 py-2.5 text-sm font-black text-white shadow-[0_2px_8px_rgba(39,177,184,0.3)] transition-all hover:bg-[#1F9AA0] disabled:opacity-60"
        >
          {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar combo"}
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Bloque 1: Productos */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Productos</h2>
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  {["Cantidad", "Producto", "Costo unitario", "Costo total", ""].map((h) => (
                    <th key={h} className="border border-[#E2E8F0] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC]">
                    <td className="w-24 border border-[#E2E8F0] px-2 py-1.5">
                      <Cell value={item.cantidad} integer onCommit={(n) => updateItem(item.id, { cantidad: Math.max(1, n) })} />
                    </td>
                    <td className="border border-[#E2E8F0] px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        {item.productId && (
                          <img
                            src={products.find((p) => p.id === item.productId)?.image}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex flex-1 flex-col gap-1">
                          <select
                            value={item.productId ?? ""}
                            onChange={(e) => e.target.value ? selectProduct(item.id, e.target.value) : updateItem(item.id, { productId: null })}
                            className={`${inputClass} cursor-pointer transition-all duration-200 hover:border-[#27B1B8] hover:bg-[#F0FAFA] hover:shadow-sm text-xs`}
                          >
                            <option value="">— Producto manual —</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          {!item.productId && (
                            <input
                              value={item.nombreProducto}
                              onChange={(e) => setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, nombreProducto: e.target.value } : i)))}
                              onBlur={() => patchItem(item.id, { nombreProducto: item.nombreProducto })}
                              placeholder="Nombre del producto"
                              className={inputClass}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="w-36 border border-[#E2E8F0] px-2 py-1.5">
                      <Cell value={item.costoUnitario} onCommit={(n) => updateItem(item.id, { costoUnitario: n })} />
                    </td>
                    <td className="w-32 truncate border border-[#E2E8F0] px-2 py-1.5 text-right font-semibold text-[#1A1A1A]">
                      {fmt(item.cantidad * item.costoUnitario)}
                    </td>
                    <td className="w-24 border border-[#E2E8F0] px-2 py-1.5 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => duplicateItem(item)} className="text-xs font-bold text-[#27B1B8] hover:opacity-70">Duplicar</button>
                        <button onClick={() => removeItem(item.id)} className="text-xs font-bold text-[#DC2626] hover:opacity-70">Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="border border-[#E2E8F0] px-2 py-6 text-center text-sm text-[#94A3B8]">Sin productos todavía</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={() => addItem(false)} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0]">+ Producto del catálogo</button>
            <button onClick={() => addItem(true)} className="rounded-xl border border-[#27B1B8] px-4 py-2 text-sm font-bold text-[#27B1B8] hover:bg-[#F0FAFA]">+ Producto manual</button>
          </div>

          {/* Bloque 2: Configuración */}
          <h2 className="mb-4 mt-8 text-sm font-black uppercase tracking-widest text-[#64748B]">Configuración</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#64748B]">Margen</label>
              <PctCell value={config.margenPct} onCommit={(n) => updateConfig("margenPct", n)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#64748B]">Comisión</label>
              <PctCell value={config.comisionPct} onCommit={(n) => updateConfig("comisionPct", n)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#64748B]">Campaña</label>
              <PctCell value={config.campanaPct} onCommit={(n) => updateConfig("campanaPct", n)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#64748B]">Envío</label>
              <Cell value={config.envio} onCommit={(n) => updateConfig("envio", n)} align="left" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#64748B]">Picking</label>
              <Cell value={config.picking} onCommit={(n) => updateConfig("picking", n)} align="left" />
            </div>
          </div>
        </div>

        {/* Bloque 3: Resumen */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Resumen</h2>
          <div className="space-y-2">
            {cascadeRows.map((row) => (
              <div key={row.label} className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${row.positive ? "bg-[#F0FAFA]" : ""}`}>
                <span className={`text-sm ${row.positive ? "font-bold text-[#1A1A1A]" : "text-[#64748B]"}`}>{row.label}</span>
                <span className={`text-sm font-bold ${row.positive ? "text-[#27B1B8]" : "text-[#1A1A1A]"}`}>{fmt(row.value)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-[#27B1B8] bg-[#F0FAFA] px-3 py-3">
              <span className="text-sm font-black text-[#0C6060]">Precio de venta final</span>
              <span className="text-xl font-black text-[#0C6060]">{fmt(summary.precioFinal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
