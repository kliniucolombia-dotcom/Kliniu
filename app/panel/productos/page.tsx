"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SimpleSelect } from "../_components/simple-select";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type Product = {
  id: string; slug: string; sku: string | null; name: string; brand: string; category: string;
  price: number; previousPrice: number; stock: number; minimumStock: number; image: string; active: boolean; updatedAt: string;
  priceHistory: { oldPrice: number; newPrice: number; createdAt: string; user: { fullName: string } }[];
};

const fmt = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = Array.from(pages).filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const result: (number | "...")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) result.push("...");
    result.push(p);
  });
  return result;
}

const SORT_OPTIONS = [
  { value: "recent", label: "Más recientes" },
  { value: "price-asc", label: "Precio: menor a mayor" },
  { value: "price-desc", label: "Precio: mayor a menor" },
  { value: "stock-asc", label: "Stock: menor a mayor" },
  { value: "name", label: "Nombre A-Z" },
] as const;

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export default function ProductosPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [selected, setSelected] = useState<Product | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const router = useRouter();

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/panel/products");
    if (r.status === 401) { router.push("/login"); return; }
    const data = await r.json();
    setProducts(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);
  useRealtimeRefresh(["products"], load);

  const categories = useMemo(() => {
    const map = new Map<string, { count: number; image: string }>();
    for (const p of products) {
      const entry = map.get(p.category);
      if (entry) entry.count += 1;
      else map.set(p.category, { count: 1, image: p.image });
    }
    return Array.from(map.entries())
      .map(([name, v]) => ({ name, count: v.count, image: v.image }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? p.active : !p.active);
      const matchesStock = stockFilter === "all"
        || (stockFilter === "in-stock" && p.stock > p.minimumStock)
        || (stockFilter === "low-stock" && p.stock > 0 && p.stock <= p.minimumStock)
        || (stockFilter === "no-stock" && p.stock === 0);
      return matchesSearch && matchesCategory && matchesStatus && matchesStock;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      if (sortBy === "stock-asc") return a.stock - b.stock;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return list;
  }, [products, search, categoryFilter, statusFilter, stockFilter, sortBy]);

  useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter, stockFilter, sortBy, perPage]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const kpis = useMemo(() => ({
    total: products.length,
    inStock: products.filter((p) => p.stock > p.minimumStock).length,
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= p.minimumStock).length,
    noStock: products.filter((p) => p.stock === 0).length,
    inactive: products.filter((p) => !p.active).length,
  }), [products]);

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

  const hasActiveFilters = search || categoryFilter !== "all" || statusFilter !== "all" || stockFilter !== "all" || sortBy !== "recent";
  const clearFilters = () => { setSearch(""); setCategoryFilter("all"); setStatusFilter("all"); setStockFilter("all"); setSortBy("recent"); };

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">Panel Comercial</p>
          <h1 className="text-3xl font-black text-[#1A1A1A]">Productos</h1>
          <p className="mt-1 text-sm text-[#6e7379]">Consulta precios, stock y estado del catálogo.</p>
        </div>
        <a
          href="/admin?tab=edit"
          className="shrink-0 rounded-full bg-[#0C535B] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43]"
        >
          Edición completa
        </a>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando productos…</div>
      ) : (
        <>
          {/* Search + filters */}
          <div className="rounded-[1.75rem] border border-black/8 bg-white p-6 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr_0.8fr_0.8fr_1fr_auto]">
              <label className="space-y-2">
                <span className="text-sm font-medium text-[#4f545a]">Buscar</span>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b8d91]"><IconSearch /></span>
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre, marca o SKU..."
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] py-3 pl-10 pr-4 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </div>
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#4f545a]">Categoría</span>
                <SimpleSelect
                  value={categoryFilter}
                  options={[{ value: "all", label: "Todas las categorías" }, ...categories.map((c) => ({ value: c.name, label: c.name }))]}
                  onChange={setCategoryFilter}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#4f545a]">Estado</span>
                <SimpleSelect
                  value={statusFilter}
                  options={[{ value: "all", label: "Todos" }, { value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]}
                  onChange={setStatusFilter}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#4f545a]">Stock</span>
                <SimpleSelect
                  value={stockFilter}
                  options={[{ value: "all", label: "Todos" }, { value: "in-stock", label: "Con stock" }, { value: "low-stock", label: "Stock bajo" }, { value: "no-stock", label: "Sin stock" }]}
                  onChange={setStockFilter}
                />
              </label>

              <label className="space-y-2">
                <span className="text-sm font-medium text-[#4f545a]">Ordenar por</span>
                <SimpleSelect
                  value={sortBy}
                  options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  onChange={setSortBy}
                />
              </label>

              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-3 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:bg-[#ececea]"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>

            {/* Category chips */}
            <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`flex shrink-0 items-center gap-3 rounded-[1.2rem] border px-4 py-3 text-left transition-colors duration-200 ${categoryFilter === "all" ? "border-[#27B1B8] bg-[#EAF8F6]" : "border-black/8 bg-white hover:bg-[#fafaf9]"}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0C535B] text-xs font-bold text-white">{products.length}</div>
                <div>
                  <p className="text-sm font-semibold text-[#1f2328]">Todos los productos</p>
                  <p className="text-xs text-[#8b8d91]">{products.length} productos</p>
                </div>
              </button>
              {categories.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === c.name ? "all" : c.name)}
                  className={`flex shrink-0 items-center gap-3 rounded-[1.2rem] border px-4 py-3 text-left transition-colors duration-200 ${categoryFilter === c.name ? "border-[#27B1B8] bg-[#EAF8F6]" : "border-black/8 bg-white hover:bg-[#fafaf9]"}`}
                >
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full border border-black/8 bg-[#fafaf9]">
                    <Image src={c.image} alt="" fill className="object-cover" sizes="36px" />
                  </div>
                  <div className="min-w-0">
                    <p className="max-w-[160px] truncate text-sm font-semibold text-[#1f2328]">{c.name}</p>
                    <p className="text-xs text-[#8b8d91]">{c.count} productos</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <div className="rounded-[1.2rem] border border-black/8 bg-[#EAF8F6] px-4 py-4">
              <p className="text-2xl font-bold text-[#27B1B8]">{kpis.total}</p>
              <p className="mt-1 text-xs font-semibold text-[#5d6167]">Productos totales</p>
            </div>
            <div className="rounded-[1.2rem] border border-black/8 bg-[#F0FDF4] px-4 py-4">
              <p className="text-2xl font-bold text-[#15803D]">{kpis.inStock}</p>
              <p className="mt-1 text-xs font-semibold text-[#5d6167]">Con stock disponible</p>
            </div>
            <div className="rounded-[1.2rem] border border-black/8 bg-[#FFF7ED] px-4 py-4">
              <p className="text-2xl font-bold text-[#C2410C]">{kpis.lowStock}</p>
              <p className="mt-1 text-xs font-semibold text-[#5d6167]">Stock bajo</p>
            </div>
            <div className="rounded-[1.2rem] border border-black/8 bg-[#FEF2F2] px-4 py-4">
              <p className="text-2xl font-bold text-[#DC2626]">{kpis.noStock}</p>
              <p className="mt-1 text-xs font-semibold text-[#5d6167]">Sin stock</p>
            </div>
            <div className="rounded-[1.2rem] border border-black/8 bg-[#F8FAFC] px-4 py-4">
              <p className="text-2xl font-bold text-[#64748B]">{kpis.inactive}</p>
              <p className="mt-1 text-xs font-semibold text-[#5d6167]">Inactivos</p>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                    <th className="p-4">Producto</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Precio actual</th>
                    <th className="p-4">Precio ant.</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Últ. cambio</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-sm text-[#6e7379]">Ningún producto coincide con los filtros.</td>
                    </tr>
                  ) : (
                    paged.map((p) => {
                      const priceDiff = p.previousPrice ? ((p.price - p.previousPrice) / p.previousPrice) * 100 : 0;
                      return (
                        <tr key={p.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-black/8 bg-[#fafaf9]">
                                <Image src={p.image} alt={p.name} fill className="object-cover" sizes="40px" />
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[220px] truncate text-sm font-semibold text-[#1f2328]">{p.name}</p>
                                <p className="text-xs text-[#8b8d91]">{p.sku ?? "—"} · {p.brand}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="rounded-full bg-[#EAF8F6] px-2.5 py-0.5 text-xs font-semibold text-[#0C535B]">{p.category}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-[#1f2328]">{fmt(p.price)}</span>
                            {priceDiff !== 0 && (
                              <span className={`ml-1.5 text-xs font-bold ${priceDiff > 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                                {priceDiff > 0 ? "▲" : "▼"}{Math.abs(priceDiff).toFixed(0)}%
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-xs text-[#8b8d91]">{p.previousPrice ? fmt(p.previousPrice) : "—"}</td>
                          <td className="p-4">
                            <span className={`text-sm font-semibold ${p.stock === 0 ? "text-[#DC2626]" : p.stock <= p.minimumStock ? "text-[#D97706]" : "text-[#16A34A]"}`}>
                              {p.stock}
                            </span>
                          </td>
                          <td className="p-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.active ? "bg-[#DCFCE7] text-[#16A34A]" : p.stock === 0 ? "bg-[#FEE2E2] text-[#DC2626]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                              {p.active ? "Activo" : p.stock === 0 ? "Sin stock" : "Inactivo"}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-[#8b8d91]">
                            {p.priceHistory[0]
                              ? `${new Date(p.priceHistory[0].createdAt).toLocaleDateString("es-CO")}`
                              : "—"}
                          </td>
                          <td className="p-4 text-right">
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-[#5d6167] transition-colors duration-200 hover:border-[#0C535B] hover:text-[#0C535B]"
                            >
                              <IconEye /> Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-4 py-3 text-sm text-[#6e7379]">
              <span>
                Mostrando {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de {filtered.length} productos
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40"
                >
                  ‹
                </button>
                {getPageNumbers(page, pageCount).map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-1 text-[#8b8d91]">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPage(p)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors duration-200 ${p === page ? "bg-[#0C535B] text-white" : "border border-black/10 text-[#5d6167] hover:bg-[#ececea]"}`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40"
                >
                  ›
                </button>
              </div>
              <SimpleSelect
                value={String(perPage)}
                options={[{ value: "10", label: "10 por página" }, { value: "20", label: "20 por página" }, { value: "50", label: "50 por página" }]}
                onChange={(v) => setPerPage(Number(v))}
                className="w-40"
                openUp
              />
            </div>
          </div>
        </>
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
