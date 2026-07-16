"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildQuotationSummary, calcLineTotal, type QuotationTaxConfigInput } from "@/lib/quotation-calculator";
import { SimpleSelect } from "../../_components/simple-select";

const fmt = (n: number) =>
  (n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type QuotationStatus = "DRAFT" | "SENT" | "APPROVED" | "REJECTED" | "EXPIRED";

const STATUS_META: Record<QuotationStatus, { label: string; color: string; bg: string }> = {
  DRAFT:    { label: "Borrador", color: "#64748B", bg: "#F1F5F9" },
  SENT:     { label: "Enviada",  color: "#D97706", bg: "#FEF3C7" },
  APPROVED: { label: "Aprobada", color: "#16A34A", bg: "#DCFCE7" },
  REJECTED: { label: "Rechazada", color: "#DC2626", bg: "#FEE2E2" },
  EXPIRED:  { label: "Vencida",  color: "#94A3B8", bg: "#F1F5F9" },
};

type Item = {
  id: string; productId: string | null; name: string; reference: string | null;
  imageUrl: string; quantity: number; unitPrice: number; order: number;
};
type Product = { id: string; name: string; price: number };
type Quotation = {
  id: string; number: string; status: QuotationStatus;
  clientId: string; client: { id: string; fullName: string; company: string | null };
  seller: { id: string; fullName: string };
  paymentTerms: string | null; notes: string | null; validUntil: string | null;
  convertedOrderId: string | null;
  items: Item[];
};

const inputClass =
  "w-full rounded-lg border border-[#E2E8F0] bg-white px-2 py-1.5 text-sm text-[#1A1A1A] outline-none focus:border-[#27B1B8]";

function Cell({ value, onCommit, integer }: { value: number; onCommit: (n: number) => void; integer?: boolean }) {
  const [local, setLocal] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  const [focused, setFocused] = useState(false);

  if (value !== prevValue && !focused) {
    setPrevValue(value);
    setLocal(String(value));
  }

  const sanitize = (v: string) => {
    const n = parseFloat(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return integer ? Math.round(n) : n;
  };

  return (
    <input
      type="number"
      min={0}
      value={local}
      onFocus={() => setFocused(true)}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={(e) => { setFocused(false); onCommit(sanitize(e.target.value)); }}
      className={`no-spinner ${inputClass} text-right`}
    />
  );
}

export default function QuotationEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [quotation, setQuotation] = useState<Quotation | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [taxConfig, setTaxConfig] = useState<QuotationTaxConfigInput>({ reteIcaPct: 1.104, reteFuentePct: 2.5, ivaPct: 19 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback(async () => {
    const [detail, prods, cfg] = await Promise.all([
      fetch(`/api/panel/quotations/${id}`).then((r) => r.json()),
      fetch("/api/panel/products?minimal=1").then((r) => r.json()),
      fetch("/api/panel/quotation-tax-config").then((r) => r.json()),
    ]);
    if (detail) setQuotation(detail);
    setProducts(prods ?? []);
    if (cfg && !cfg.error) setTaxConfig({ reteIcaPct: cfg.reteIcaPct, reteFuentePct: cfg.reteFuentePct, ivaPct: cfg.ivaPct });
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    if (!quotation) return { subtotal: 0, reteIca: 0, reteFuente: 0, iva: 0, total: 0 };
    return buildQuotationSummary(quotation.items.map((i) => ({ quantity: i.quantity, unitPrice: i.unitPrice })), taxConfig);
  }, [quotation, taxConfig]);

  const isDraft = quotation?.status === "DRAFT";

  const patchQuotation = async (data: Partial<Pick<Quotation, "paymentTerms" | "notes" | "validUntil">>) => {
    const r = await fetch(`/api/panel/quotations/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!r.ok) setError("No se pudo guardar el cambio");
  };

  const updateHeader = (data: Partial<Quotation>) => {
    setQuotation((prev) => (prev ? { ...prev, ...data } : prev));
    patchQuotation(data);
  };

  const patchItem = async (itemId: string, data: Partial<Item>) => {
    const r = await fetch(`/api/panel/quotations/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
    });
    if (!r.ok) setError("No se pudo guardar el ítem");
  };

  const updateItem = (itemId: string, data: Partial<Item>) => {
    setQuotation((prev) => prev ? { ...prev, items: prev.items.map((i) => i.id === itemId ? { ...i, ...data } : i) } : prev);
    patchItem(itemId, data);
  };

  const reloadQuotation = async () => {
    const detail = await fetch(`/api/panel/quotations/${id}`).then((r) => r.json());
    if (detail) setQuotation(detail);
  };

  const addItem = async (fromCatalog: boolean) => {
    const body = fromCatalog
      ? { productId: products[0]?.id ?? null }
      : { name: "Producto nuevo", quantity: 1, unitPrice: 0 };
    const r = await fetch(`/api/panel/quotations/${id}/items`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const d = await r.json();
    if (r.ok) await reloadQuotation();
    else setError(d.error ?? "No se pudo agregar el ítem");
  };

  const removeItem = async (itemId: string) => {
    setQuotation((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== itemId) } : prev);
    await fetch(`/api/panel/quotations/items/${itemId}`, { method: "DELETE" });
  };

  const selectProduct = async (itemId: string, productId: string) => {
    await fetch(`/api/panel/quotations/items/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ productId: productId || null }),
    });
    await reloadQuotation();
  };

  const downloadPdf = async () => {
    setPdfLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/panel/quotations/${id}/pdf`, { method: "POST" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? "No se pudo generar el PDF");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${quotation?.number ?? "cotizacion"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  };

  const runAction = async (action: "send" | "approve" | "reject" | "convert") => {
    setActionLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/panel/quotations/${id}/${action}`, { method: "POST" });
      const d = await r.json();
      if (!r.ok) { setError(d.error ?? "No se pudo completar la acción"); return; }
      if (action === "convert") { router.push("/panel/pedidos"); return; }
      await load();
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !quotation) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#27B1B8] border-t-transparent" />
      </div>
    );
  }

  const meta = STATUS_META[quotation.status];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button onClick={() => router.push("/panel/cotizaciones")} className="text-xs font-bold text-[#94A3B8] hover:text-[#1A1A1A]">← Cotizaciones</button>
          <div className="mt-1 flex items-center gap-3">
            <h1 className="text-2xl font-black text-[#1A1A1A]">{quotation.number}</h1>
            <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest" style={{ color: meta.color, background: meta.bg }}>
              {meta.label}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-[#64748B]">{quotation.client.company || quotation.client.fullName}</p>
        </div>
        <div className="flex gap-2">
          {quotation.status !== "DRAFT" && (
            <a
              href={`/imprimir-cotizacion/${id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="cursor-pointer rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm font-bold text-[#1A1A1A] hover:bg-[#F8FAFC]"
            >
              Ver / Imprimir
            </a>
          )}
          {quotation.status !== "DRAFT" && (
            <button
              onClick={downloadPdf}
              disabled={pdfLoading}
              className="rounded-xl border border-[#27B1B8] px-4 py-2 text-sm font-bold text-[#27B1B8] hover:bg-[#F0FAFA] disabled:opacity-60"
            >
              {pdfLoading ? "Generando…" : "Descargar PDF"}
            </button>
          )}
          {quotation.status === "DRAFT" && (
            <button onClick={() => runAction("send")} disabled={actionLoading} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0] disabled:opacity-60">Enviar</button>
          )}
          {quotation.status === "SENT" && (
            <>
              <button onClick={() => runAction("approve")} disabled={actionLoading} className="rounded-xl bg-[#16A34A] px-4 py-2 text-sm font-bold text-white hover:bg-[#15803D] disabled:opacity-60">Aprobar</button>
              <button onClick={() => runAction("reject")} disabled={actionLoading} className="rounded-xl bg-[#DC2626] px-4 py-2 text-sm font-bold text-white hover:bg-[#B91C1C] disabled:opacity-60">Rechazar</button>
            </>
          )}
          {quotation.status === "APPROVED" && !quotation.convertedOrderId && (
            <button onClick={() => runAction("convert")} disabled={actionLoading} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0] disabled:opacity-60">Convertir a pedido</button>
          )}
          {quotation.convertedOrderId && (
            <span className="rounded-xl bg-[#F0FAFA] px-4 py-2 text-sm font-bold text-[#0C6060]">Convertida a pedido</span>
          )}
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl bg-[#FEE2E2] px-3 py-2 text-xs font-semibold text-[#DC2626]">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-[#E2E8F0] bg-white p-6 lg:col-span-2">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Ítems</h2>
          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0]">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead className="bg-[#F8FAFC]">
                <tr>
                  {["Producto", "Cantidad", "Vr. Unit", "Total", ""].map((h) => (
                    <th key={h} className="border border-[#E2E8F0] px-2 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {quotation.items.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F8FAFC]">
                    <td className="border border-[#E2E8F0] px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        {item.imageUrl && <img src={item.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                        <div className="flex flex-1 flex-col gap-1">
                          {isDraft ? (
                            <SimpleSelect
                              value={item.productId ?? ""}
                              options={[
                                { value: "", label: "— Ítem manual —" },
                                ...products.map((p) => ({ value: p.id, label: p.name })),
                              ]}
                              onChange={(v) => selectProduct(item.id, v)}
                              className="text-xs"
                            />
                          ) : (
                            <span className="text-sm font-semibold text-[#1A1A1A]">{item.name}</span>
                          )}
                          {isDraft && !item.productId && (
                            <input
                              value={item.name}
                              onChange={(e) => setQuotation((prev) => prev ? { ...prev, items: prev.items.map((i) => i.id === item.id ? { ...i, name: e.target.value } : i) } : prev)}
                              onBlur={() => patchItem(item.id, { name: item.name })}
                              placeholder="Nombre del producto"
                              className={inputClass}
                            />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="w-24 border border-[#E2E8F0] px-2 py-1.5">
                      {isDraft ? (
                        <Cell value={item.quantity} integer onCommit={(n) => updateItem(item.id, { quantity: Math.max(1, n) })} />
                      ) : (
                        <span className="block text-right">{item.quantity}</span>
                      )}
                    </td>
                    <td className="w-36 border border-[#E2E8F0] px-2 py-1.5">
                      {isDraft ? (
                        <Cell value={item.unitPrice} onCommit={(n) => updateItem(item.id, { unitPrice: n })} />
                      ) : (
                        <span className="block text-right">{fmt(item.unitPrice)}</span>
                      )}
                    </td>
                    <td className="w-32 truncate border border-[#E2E8F0] px-2 py-1.5 text-right font-semibold text-[#1A1A1A]">
                      {fmt(calcLineTotal(item))}
                    </td>
                    <td className="w-20 border border-[#E2E8F0] px-2 py-1.5 text-center">
                      {isDraft && (
                        <button onClick={() => removeItem(item.id)} className="text-xs font-bold text-[#DC2626] hover:opacity-70">Eliminar</button>
                      )}
                    </td>
                  </tr>
                ))}
                {quotation.items.length === 0 && (
                  <tr><td colSpan={5} className="border border-[#E2E8F0] px-2 py-6 text-center text-sm text-[#94A3B8]">Sin ítems todavía</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {isDraft && (
            <div className="mt-4 flex gap-2">
              <button onClick={() => addItem(true)} className="rounded-xl bg-[#27B1B8] px-4 py-2 text-sm font-bold text-white hover:bg-[#1F9AA0]">+ Producto del catálogo</button>
              <button onClick={() => addItem(false)} className="rounded-xl border border-[#27B1B8] px-4 py-2 text-sm font-bold text-[#27B1B8] hover:bg-[#F0FAFA]">+ Ítem manual</button>
            </div>
          )}

          <h2 className="mb-4 mt-8 text-sm font-black uppercase tracking-widest text-[#64748B]">Condiciones</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#64748B]">Condiciones de pago</label>
              <input
                disabled={!isDraft}
                value={quotation.paymentTerms ?? ""}
                onChange={(e) => setQuotation((prev) => prev ? { ...prev, paymentTerms: e.target.value } : prev)}
                onBlur={() => patchQuotation({ paymentTerms: quotation.paymentTerms })}
                className={`${inputClass} disabled:opacity-60`}
                placeholder="Ej. Crédito 8 días calendario"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#64748B]">Válida hasta</label>
              <input
                type="date"
                disabled={!isDraft}
                value={quotation.validUntil ? quotation.validUntil.slice(0, 10) : ""}
                onChange={(e) => updateHeader({ validUntil: e.target.value || null })}
                className={`${inputClass} disabled:opacity-60`}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-[#64748B]">Notas</label>
              <textarea
                disabled={!isDraft}
                value={quotation.notes ?? ""}
                onChange={(e) => setQuotation((prev) => prev ? { ...prev, notes: e.target.value } : prev)}
                onBlur={() => patchQuotation({ notes: quotation.notes })}
                className={`${inputClass} disabled:opacity-60`}
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <h2 className="mb-4 text-sm font-black uppercase tracking-widest text-[#64748B]">Resumen</h2>
          <div className="space-y-2">
            {[
              { label: "Subtotal", value: summary.subtotal },
              { label: `ReteICA ${taxConfig.reteIcaPct}%`, value: -summary.reteIca },
              { label: `ReteFuente ${taxConfig.reteFuentePct}%`, value: -summary.reteFuente },
              { label: `IVA ${taxConfig.ivaPct}%`, value: summary.iva },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between rounded-lg px-2 py-1.5">
                <span className="text-sm text-[#64748B]">{row.label}</span>
                <span className="text-sm font-bold text-[#1A1A1A]">{fmt(row.value)}</span>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between rounded-xl border-2 border-[#27B1B8] bg-[#F0FAFA] px-3 py-3">
              <span className="text-sm font-black text-[#0C6060]">Total</span>
              <span className="text-xl font-black text-[#0C6060]">{fmt(summary.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
