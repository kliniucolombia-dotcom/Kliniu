"use client";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Product = {
  id: string; slug: string; name: string; brand: string; category: string;
  price: number; previousPrice: number; stock: number; image: string; active: boolean; updatedAt: string;
  priceHistory: { oldPrice: number; newPrice: number; createdAt: string; user: { fullName: string } }[];
};

const fmt = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export default function ProductosPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filtered, setFiltered]  = useState<Product[]>([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [selected, setSelected]   = useState<Product | null>(null);
  const [newPrice, setNewPrice]   = useState("");
  const [note, setNote]           = useState("");
  const [saving, setSaving]       = useState(false);
  const [alert, setAlert]         = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/panel/products");
    if (r.status === 401) { router.push("/login"); return; }
    const data = await r.json();
    setProducts(data);
    setFiltered(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(products.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
  }, [search, products]);

  const openEdit = (p: Product) => {
    setSelected(p);
    setNewPrice(String(p.price));
    setNote("");
    setAlert(null);
  };

  const savePrice = async () => {
    if (!selected) return;
    const np = parseInt(newPrice.replace(/\D/g, ""), 10);
    if (isNaN(np) || np <= 0) { setAlert({ type: "err", msg: "Precio inválido" }); return; }
    const diff = Math.abs(np - selected.price) / selected.price;
    if (diff > 0.5) {
      if (!confirm(`⚠️ El precio cambia un ${(diff * 100).toFixed(0)}%. ¿Confirmar?`)) return;
    }
    setSaving(true);
    const r = await fetch("/api/panel/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selected.id, newPrice: np, note }),
    });
    setSaving(false);
    if (r.ok) {
      setAlert({ type: "ok", msg: "Precio actualizado" });
      load();
      setSelected(null);
    } else {
      const d = await r.json();
      setAlert({ type: "err", msg: d.error ?? "Error al guardar" });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Productos</h1>
        </div>
        <a
          href="/admin?tab=edit"
          className="shrink-0 rounded-xl bg-[#1A1A1A] px-4 py-2.5 text-xs font-bold text-white hover:opacity-80"
        >
          Edición completa
        </a>
      </div>

      {/* Buscador */}
      <div className="mb-5 flex gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, marca o categoría…"
          className="flex-1 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
        />
        <div className="flex items-center rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm text-[#94A3B8]">
          {filtered.length} productos
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando productos…</div>
      ) : (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <tr>
                {["Producto","Categoría","Precio actual","Precio ant.","Stock","Estado","Últ. cambio",""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {filtered.map((p) => {
                const priceDiff = p.previousPrice ? ((p.price - p.previousPrice) / p.previousPrice) * 100 : 0;
                return (
                  <tr key={p.id} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F1F5F9]">
                          <Image src={p.image} alt={p.name} fill className="object-cover" sizes="40px" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#1A1A1A] leading-tight">{p.name}</p>
                          <p className="text-[10px] text-[#94A3B8]">{p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{p.category}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-[#1A1A1A]">{fmt(p.price)}</span>
                      {priceDiff !== 0 && (
                        <span className={`ml-1.5 text-[10px] font-bold ${priceDiff > 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                          {priceDiff > 0 ? "▲" : "▼"}{Math.abs(priceDiff).toFixed(0)}%
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-[#94A3B8]">{p.previousPrice ? fmt(p.previousPrice) : "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${p.stock <= 3 ? "text-[#DC2626]" : p.stock <= 10 ? "text-[#D97706]" : "text-[#16A34A]"}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${p.active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                        {p.active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[10px] text-[#94A3B8]">
                      {p.priceHistory[0]
                        ? `${new Date(p.priceHistory[0].createdAt).toLocaleDateString("es-CO")} · ${p.priceHistory[0].user.fullName}`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(p)}
                        className="rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white hover:opacity-80"
                      >
                        Precio
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal editar precio */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-black text-[#1A1A1A]">Editar precio</h3>
                <p className="mt-0.5 text-sm text-[#64748B]">{selected.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
            </div>

            <div className="mb-3 rounded-xl bg-[#F8FAFC] p-3">
              <p className="text-xs text-[#94A3B8]">Precio actual</p>
              <p className="text-xl font-black text-[#1A1A1A]">{fmt(selected.price)}</p>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Nuevo precio (COP)</label>
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-bold outline-none focus:border-[#27B1B8]"
                placeholder="0"
              />
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Nota (opcional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
                placeholder="Ej: Ajuste por campaña Q2"
              />
            </div>

            {/* Historial */}
            {selected.priceHistory.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-bold text-[#64748B]">Historial reciente</p>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {selected.priceHistory.map((h, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-[#F8FAFC] px-3 py-1.5 text-xs">
                      <span className="text-[#94A3B8]">{new Date(h.createdAt).toLocaleDateString("es-CO")}</span>
                      <span className="font-semibold text-[#1A1A1A]">{fmt(h.oldPrice)} → {fmt(h.newPrice)}</span>
                      <span className="text-[#94A3B8]">{h.user.fullName}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {alert && (
              <div className={`mb-3 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                {alert.msg}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={savePrice} disabled={saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : "Actualizar precio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
