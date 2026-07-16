"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type Warehouse = { id: string; key: string; name: string; order: number };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  image: string;
  minimumStock: number;
  stock: number;
  stocksByWarehouseId: Record<string, number>;
};

type MovementModal = {
  product: Product;
  mode: "ajuste" | "transferir";
};

const WAREHOUSE_META: Record<string, { icon: string; description: string; color: string }> = {
  MATERIA_PRIMA_MOLDES: {
    icon: "📦",
    description: "Materias primas y moldes utilizados en producción",
    color: "#27B1B8",
  },
  PIEZAS_IMPORTADAS: {
    icon: "🧩",
    description: "Piezas inyectadas e importadas para ensamblaje",
    color: "#F0A73C",
  },
  PRODUCTO_TERMINADO: {
    icon: "🎁",
    description: "Productos listos para venta",
    color: "#7C6CE0",
  },
};

function stockStatus(stock: number, minimumStock: number) {
  if (stock <= 0) return { label: "Agotado", dot: "#DC2626", text: "#DC2626" };
  if (stock <= minimumStock) return { label: "Crítico", dot: "#F59E0B", text: "#B45309" };
  return { label: "Disponible", dot: "#16A34A", text: "#16A34A" };
}

export default function BodegasPanel() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [modal, setModal] = useState<MovementModal | null>(null);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/panel/bodegas");
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    const data = await r.json();
    setWarehouses(data.warehouses);
    setProducts(data.products);
    setCanEdit(data.canEdit);
    setLoading(false);
    setSelectedWarehouseId((current) => current ?? data.warehouses[0]?.id ?? null);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const warehouseStats = useMemo(() => {
    const stats: Record<string, { skuCount: number; totalUnits: number }> = {};
    for (const w of warehouses) {
      let skuCount = 0;
      let totalUnits = 0;
      for (const p of products) {
        const qty = p.stocksByWarehouseId[w.id] ?? 0;
        if (qty > 0) skuCount += 1;
        totalUnits += qty;
      }
      stats[w.id] = { skuCount, totalUnits };
    }
    return stats;
  }, [warehouses, products]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  const selectedWarehouse = warehouses.find((w) => w.id === selectedWarehouseId) ?? null;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel maestro</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Bodegas y stock por ubicación</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Selecciona una bodega para ver el detalle de inventario. El stock total del producto es la suma de las 3 bodegas.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : (
        <>
          {/* Módulos de bodega */}
          <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
            {warehouses.map((w) => {
              const meta = WAREHOUSE_META[w.key] ?? { icon: "📦", description: "", color: "#27B1B8" };
              const stats = warehouseStats[w.id] ?? { skuCount: 0, totalUnits: 0 };
              const active = w.id === selectedWarehouseId;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => setSelectedWarehouseId(w.id)}
                  className={`relative flex flex-col gap-2 rounded-xl border bg-white p-3 text-left transition-all sm:gap-4 sm:rounded-2xl sm:p-5 ${
                    active ? "shadow-[0_0_0_2px_var(--wcolor)]" : "border-[#E2E8F0] hover:border-[#CBD5E1]"
                  }`}
                  style={active ? ({ "--wcolor": meta.color, borderColor: meta.color } as React.CSSProperties) : undefined}
                >
                  {active && (
                    <span
                      className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] text-white sm:right-4 sm:top-4 sm:h-6 sm:w-6 sm:text-sm"
                      style={{ background: meta.color }}
                    >
                      ✓
                    </span>
                  )}
                  <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base sm:h-12 sm:w-12 sm:rounded-xl sm:text-2xl"
                      style={{ background: `${meta.color}1A` }}
                    >
                      {meta.icon}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-[#94A3B8] sm:text-[10px]">Bodega {w.order}</p>
                      <p className="text-[13px] font-black leading-tight text-[#1A1A1A] sm:text-base">{w.name}</p>
                    </div>
                  </div>
                  <p className="hidden text-xs leading-snug text-[#64748B] sm:block">{meta.description}</p>
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between sm:gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#1A1A1A] sm:text-xl">{stats.skuCount.toLocaleString("es-CO")}</p>
                      <p className="text-[9px] text-[#94A3B8] sm:text-[11px]">SKU</p>
                    </div>
                    <div className="min-w-0 sm:text-right">
                      <p className="truncate text-sm font-black text-[#1A1A1A] sm:text-xl">{stats.totalUnits.toLocaleString("es-CO")}</p>
                      <p className="text-[9px] text-[#94A3B8] sm:text-[11px]">Unidades</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedWarehouse && (
            <>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-lg"
                    style={{ background: `${(WAREHOUSE_META[selectedWarehouse.key] ?? WAREHOUSE_META.MATERIA_PRIMA_MOLDES).color}1A` }}
                  >
                    {(WAREHOUSE_META[selectedWarehouse.key] ?? WAREHOUSE_META.MATERIA_PRIMA_MOLDES).icon}
                  </span>
                  <h2 className="text-base font-black text-[#1A1A1A] sm:text-lg">Inventario — {selectedWarehouse.name}</h2>
                </div>
              </div>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o SKU..."
                className="mb-5 w-full max-w-sm rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
              />

              {alert && (
                <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                  {alert.msg}
                </div>
              )}

              {/* Mobile: lista de tarjetas */}
              <div className="space-y-3 sm:hidden">
                {filtered.map((p) => {
                  const stockHere = p.stocksByWarehouseId[selectedWarehouse.id] ?? 0;
                  const status = stockStatus(stockHere, p.minimumStock);
                  return (
                    <div key={p.id} className="flex gap-3 rounded-2xl border border-[#E2E8F0] bg-white p-3">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#F1F5F9]">
                        <Image src={p.image} alt={p.name} fill className="object-cover" sizes="56px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold leading-tight text-[#1A1A1A]">{p.name}</p>
                        <p className="text-[11px] text-[#94A3B8]">{p.sku}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-base font-black text-[#1A1A1A]">{stockHere.toLocaleString("es-CO")}</p>
                            <div className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: status.text }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} />
                              {status.label}
                            </div>
                          </div>
                          <p className="text-xs text-[#94A3B8]">Mínimo <span className="font-semibold text-[#64748B]">{p.minimumStock.toLocaleString("es-CO")}</span></p>
                          {canEdit && (
                            <div className="flex flex-col gap-1.5">
                              <button
                                onClick={() => setModal({ product: p, mode: "ajuste" })}
                                className="rounded-lg bg-[#27B1B8] px-2.5 py-1 text-[11px] font-bold text-white"
                              >
                                Ajustar
                              </button>
                              <button
                                onClick={() => setModal({ product: p, mode: "transferir" })}
                                className="rounded-lg border border-[#27B1B8] px-2.5 py-1 text-[11px] font-bold text-[#27B1B8]"
                              >
                                Transferir
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-sm text-[#94A3B8]">Sin productos que coincidan.</p>
                )}
              </div>

              {/* Desktop: tabla */}
              <div className="hidden overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white sm:block">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
                    <tr>
                      <th className="px-4 py-3">Producto</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Stock actual</th>
                      <th className="px-4 py-3">Stock mínimo</th>
                      <th className="px-4 py-3">Total (3 bodegas)</th>
                      {canEdit && <th className="px-4 py-3">Acciones</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const stockHere = p.stocksByWarehouseId[selectedWarehouse.id] ?? 0;
                      const status = stockStatus(stockHere, p.minimumStock);
                      return (
                        <tr key={p.id} className="border-b border-[#F1F5F9]">
                          <td className="px-4 py-3 font-semibold text-[#1A1A1A]">{p.name}</td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{p.sku}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-[#1A1A1A]">{stockHere.toLocaleString("es-CO")}</span>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: status.text }}>
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: status.dot }} />
                              {status.label}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#94A3B8]">{p.minimumStock.toLocaleString("es-CO")}</td>
                          <td className="px-4 py-3 font-bold">{p.stock.toLocaleString("es-CO")}</td>
                          {canEdit && (
                            <td className="px-4 py-3">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setModal({ product: p, mode: "ajuste" })}
                                  className="rounded-lg bg-[#27B1B8] px-2.5 py-1.5 text-xs font-bold text-white hover:opacity-80"
                                >
                                  Ajustar
                                </button>
                                <button
                                  onClick={() => setModal({ product: p, mode: "transferir" })}
                                  className="rounded-lg border border-[#27B1B8] px-2.5 py-1.5 text-xs font-bold text-[#27B1B8] hover:bg-[#F0FDFE]"
                                >
                                  Transferir
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={canEdit ? 6 : 5} className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                          Sin productos que coincidan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}

      {modal && (
        <MovementModalView
          modal={modal}
          warehouses={warehouses}
          defaultWarehouseId={selectedWarehouseId}
          onClose={() => setModal(null)}
          onDone={(msg) => { setModal(null); setAlert({ type: "ok", msg }); load(); }}
          onError={(msg) => setAlert({ type: "err", msg })}
        />
      )}
    </div>
  );
}

function MovementModalView({
  modal,
  warehouses,
  defaultWarehouseId,
  onClose,
  onDone,
  onError,
}: {
  modal: MovementModal;
  warehouses: Warehouse[];
  defaultWarehouseId: string | null;
  onClose: () => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [warehouseId, setWarehouseId] = useState(defaultWarehouseId ?? warehouses[0]?.id ?? "");
  const [toWarehouseId, setToWarehouseId] = useState(
    warehouses.find((w) => w.id !== (defaultWarehouseId ?? warehouses[0]?.id))?.id ?? warehouses[1]?.id ?? "",
  );
  const [type, setType] = useState<"ENTRADA" | "SALIDA">("ENTRADA");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const url = modal.mode === "ajuste" ? "/api/panel/bodegas/ajuste" : "/api/panel/bodegas/transferir";
    const body =
      modal.mode === "ajuste"
        ? { productId: modal.product.id, warehouseId, type, quantity, note }
        : { productId: modal.product.id, fromWarehouseId: warehouseId, toWarehouseId, quantity, note };

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSubmitting(false);

    if (r.ok) {
      onDone(modal.mode === "ajuste" ? "Movimiento registrado" : "Transferencia registrada");
    } else {
      const d = await r.json();
      onError(d.error ?? "Error al registrar el movimiento");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <div className="my-8 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <h3 className="font-black text-[#1A1A1A]">
            {modal.mode === "ajuste" ? "Ajustar stock" : "Transferir stock"} — {modal.product.name}
          </h3>
          <button onClick={onClose} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-[#64748B]">
              {modal.mode === "ajuste" ? "Bodega" : "Bodega origen"}
            </label>
            <select
              value={warehouseId}
              onChange={(e) => {
                const nextWarehouseId = e.target.value;
                setWarehouseId(nextWarehouseId);
                if (modal.mode === "transferir" && nextWarehouseId === toWarehouseId) {
                  const fallback = warehouses.find((w) => w.id !== nextWarehouseId);
                  if (fallback) setToWarehouseId(fallback.id);
                }
              }}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
            >
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
          </div>

          {modal.mode === "ajuste" ? (
            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as "ENTRADA" | "SALIDA")}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
              >
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Bodega destino</label>
              <select
                value={toWarehouseId}
                onChange={(e) => setToWarehouseId(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
              >
                {warehouses.filter((w) => w.id !== warehouseId).map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-bold text-[#64748B]">Cantidad</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-[#64748B]">Nota (opcional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || quantity <= 0}
            className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
          >
            {submitting ? "Guardando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
