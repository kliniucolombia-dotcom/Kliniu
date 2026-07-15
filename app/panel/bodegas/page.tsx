"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

type Warehouse = { id: string; key: string; name: string; order: number };
type Product = {
  id: string;
  name: string;
  sku: string | null;
  minimumStock: number;
  stock: number;
  stocksByWarehouseId: Record<string, number>;
};

type MovementModal = {
  product: Product;
  mode: "ajuste" | "transferir";
};

export default function BodegasPanel() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel maestro</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Bodegas y stock por ubicación</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Materia prima/moldes, piezas importadas y producto terminado. El stock total del
          producto es la suma de las 3 bodegas.
        </p>
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

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-left text-xs font-bold uppercase tracking-wide text-[#94A3B8]">
              <tr>
                <th className="px-4 py-3">Producto</th>
                {warehouses.map((w) => (
                  <th key={w.id} className="px-4 py-3">{w.name}</th>
                ))}
                <th className="px-4 py-3">Total</th>
                {canEdit && <th className="px-4 py-3">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={`border-b border-[#F1F5F9] ${p.stock <= p.minimumStock ? "bg-[#FEF2F2]" : ""}`}>
                  <td className="px-4 py-3 font-semibold text-[#1A1A1A]">
                    {p.name}
                    <div className="text-xs font-normal text-[#94A3B8]">{p.sku}</div>
                  </td>
                  {warehouses.map((w) => (
                    <td key={w.id} className="px-4 py-3">{p.stocksByWarehouseId[w.id] ?? 0}</td>
                  ))}
                  <td className="px-4 py-3 font-bold">{p.stock}</td>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <MovementModalView
          modal={modal}
          warehouses={warehouses}
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
  onClose,
  onDone,
  onError,
}: {
  modal: MovementModal;
  warehouses: Warehouse[];
  onClose: () => void;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
  const [toWarehouseId, setToWarehouseId] = useState(warehouses[1]?.id ?? "");
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
