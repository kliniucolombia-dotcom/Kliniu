"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { SimpleSelect } from "../../_components/simple-select";
import SyncStockButton from "../sync-stock-button";
import { getOdooErrorMessage, OdooErrorPanel } from "../odoo-error-panel";

type OdooProduct = {
  id: number;
  name: string;
  default_code?: string | false;
  list_price?: number;
  qty_available?: number;
  virtual_available?: number;
  categ_id?: [number, string] | false;
  image_url: string;
};

const fmt = (value: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value);

function getCategoryName(category: [number, string] | false | undefined) {
  return Array.isArray(category) ? category[1] : "Sin categoría";
}

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

export default function OdooProductsPage() {
  const [products, setProducts] = useState<OdooProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [view, setView] = useState<"grid" | "list">("list");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/odoo/products")
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setError(data.error || "No fue posible cargar productos desde Odoo.");
          return;
        }
        setProducts(data.products);
        setLastSync(new Date());
      })
      .catch(() => {
        if (!cancelled) setError(getOdooErrorMessage(new Error("ODOO_UNKNOWN")));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(getCategoryName(p.categ_id)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const kpis = useMemo(() => {
    const total = products.length;
    const noStock = products.filter((p) => (p.qty_available ?? 0) <= 0).length;
    const lowStock = products.filter((p) => (p.qty_available ?? 0) > 0 && (p.qty_available ?? 0) <= 10).length;
    const inventoryValue = products.reduce((sum, p) => sum + (p.qty_available ?? 0) * (p.list_price ?? 0), 0);
    return { total, noStock, lowStock, inventoryValue };
  }, [products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = products.filter((p) => {
      const matchesSearch =
        !q || p.name.toLowerCase().includes(q) || String(p.default_code || "").toLowerCase().includes(q);
      const matchesCategory = categoryFilter === "all" || getCategoryName(p.categ_id) === categoryFilter;
      const qty = p.qty_available ?? 0;
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in-stock" && qty > 10) ||
        (stockFilter === "low-stock" && qty > 0 && qty <= 10) ||
        (stockFilter === "no-stock" && qty <= 0);
      return matchesSearch && matchesCategory && matchesStock;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "price-asc") return (a.list_price ?? 0) - (b.list_price ?? 0);
      if (sortBy === "price-desc") return (b.list_price ?? 0) - (a.list_price ?? 0);
      if (sortBy === "stock-asc") return (a.qty_available ?? 0) - (b.qty_available ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [products, search, categoryFilter, stockFilter, sortBy]);

  useEffect(() => setPage(1), [search, categoryFilter, stockFilter, sortBy, perPage]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const hasActiveFilters = search || categoryFilter !== "all" || stockFilter !== "all" || sortBy !== "recent";
  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStockFilter("all");
    setSortBy("recent");
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Odoo</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Productos</h1>
          <p className="mt-1 text-sm text-[#64748B]">Catálogo sincronizado desde Odoo.</p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          {!loading && !error && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#DCFCE7] px-4 py-2.5 text-sm font-bold text-[#16A34A]">
              Sincronizado con Odoo
            </span>
          )}
          <SyncStockButton />
          <Link
            href="/panel/odoo/inventario"
            className="rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-bold text-[#64748B] transition-colors hover:border-[#27B1B8] hover:text-[#0C535B]"
          >
            Ver inventario
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando productos…</div>
      ) : error ? (
        <OdooErrorPanel message={error} />
      ) : (
        <>
          {/* KPIs */}
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <p className="text-xs font-semibold text-[#94A3B8]">Total productos</p>
              <p className="mt-1 text-2xl font-black text-[#27B1B8]">{kpis.total.toLocaleString("es-CO")}</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <p className="text-xs font-semibold text-[#94A3B8]">Sin stock</p>
              <p className="mt-1 text-2xl font-black text-[#DC2626]">{kpis.noStock.toLocaleString("es-CO")}</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <p className="text-xs font-semibold text-[#94A3B8]">Stock bajo</p>
              <p className="mt-1 text-2xl font-black text-[#D97706]">{kpis.lowStock.toLocaleString("es-CO")}</p>
            </div>
            <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
              <p className="text-xs font-semibold text-[#94A3B8]">Valor inventario</p>
              <p className="mt-1 text-2xl font-black text-[#1A1A1A]">{fmt(kpis.inventoryValue)}</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-5 rounded-2xl border border-[#E2E8F0] bg-white p-5">
            <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_auto_auto]">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar productos, SKU o código de barras..."
                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
              />
              <SimpleSelect
                value={categoryFilter}
                options={[{ value: "all", label: "Todas las categorías" }, ...categories.map((c) => ({ value: c, label: c }))]}
                onChange={setCategoryFilter}
              />
              <SimpleSelect
                value={stockFilter}
                options={[
                  { value: "all", label: "Todos" },
                  { value: "in-stock", label: "En stock" },
                  { value: "low-stock", label: "Stock bajo" },
                  { value: "no-stock", label: "Sin stock" },
                ]}
                onChange={setStockFilter}
              />
              <SimpleSelect
                value={sortBy}
                options={SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                onChange={setSortBy}
              />
              <div className="flex overflow-hidden rounded-xl border border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setView("grid")}
                  className={`px-3 py-2.5 text-sm font-bold ${view === "grid" ? "bg-[#27B1B8] text-white" : "bg-white text-[#64748B]"}`}
                >
                  Grid
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={`px-3 py-2.5 text-sm font-bold ${view === "list" ? "bg-[#27B1B8] text-white" : "bg-white text-[#64748B]"}`}
                >
                  Lista
                </button>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-bold text-[#64748B] transition-colors hover:bg-[#F8FAFC]"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Grid o lista */}
          {view === "grid" ? (
            <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {paged.map((p) => {
                const qty = p.qty_available ?? 0;
                const tone =
                  qty <= 0 ? "bg-[#FEE2E2] text-[#DC2626]" : qty <= 10 ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#DCFCE7] text-[#16A34A]";
                const label = qty <= 0 ? "Sin stock" : qty <= 10 ? "Stock bajo" : "En stock";
                return (
                  <div key={p.id} className="rounded-2xl border border-[#E2E8F0] bg-white p-4">
                    <div className="mb-3 aspect-square overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                      <img
                        src={`/api/odoo/products/image/${p.id}`}
                        alt={p.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <p className="line-clamp-2 text-sm font-bold leading-tight text-[#1A1A1A]">{p.name}</p>
                    <p className="mt-1 text-[10px] font-semibold text-[#94A3B8]">{p.default_code || "—"}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-black text-[#1A1A1A]">{fmt(p.list_price ?? 0)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mb-5 overflow-x-auto rounded-2xl border border-[#E2E8F0] bg-white">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <tr>
                    {["Producto", "SKU", "Categoría", "Precio", "Stock", "Pronóstico", "Estado"].map((heading) => (
                      <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1F5F9]">
                  {paged.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-sm text-[#64748B]">
                        Ningún producto coincide con los filtros.
                      </td>
                    </tr>
                  ) : (
                    paged.map((p) => {
                      const qty = p.qty_available ?? 0;
                      const tone =
                        qty <= 0 ? "bg-[#FEE2E2] text-[#DC2626]" : qty <= 10 ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#DCFCE7] text-[#16A34A]";
                      const label = qty <= 0 ? "Sin stock" : qty <= 10 ? "Stock bajo" : "En stock";
                      return (
                        <tr key={p.id} className="transition-colors hover:bg-[#F8FAFC]">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#F8FAFC]">
                                <img
                                  src={`/api/odoo/products/image/${p.id}`}
                                  alt={p.name}
                                  loading="lazy"
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                  }}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[260px] truncate font-bold leading-tight text-[#1A1A1A]">{p.name}</p>
                                <p className="mt-0.5 text-[10px] text-[#94A3B8]">ID Odoo {p.id}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-xs font-semibold text-[#64748B]">{p.default_code || "—"}</td>
                          <td className="px-4 py-3 text-xs text-[#64748B]">{getCategoryName(p.categ_id)}</td>
                          <td className="px-4 py-3 font-bold text-[#1A1A1A]">{fmt(p.list_price ?? 0)}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-1 text-xs font-bold ${tone}`}>{qty}</span>
                          </td>
                          <td className="px-4 py-3 text-xs font-bold text-[#64748B]">{p.virtual_available ?? 0}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{label}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Paginación */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#64748B]">
            <span>
              Mostrando {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de{" "}
              {filtered.length} productos
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] disabled:opacity-40"
              >
                ‹
              </button>
              {getPageNumbers(page, pageCount).map((p, i) =>
                p === "..." ? (
                  <span key={`dots-${i}`} className="px-1 text-[#94A3B8]">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-bold ${
                      p === page ? "bg-[#27B1B8] text-white" : "border border-[#E2E8F0] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#E2E8F0] disabled:opacity-40"
              >
                ›
              </button>
            </div>
            <SimpleSelect
              value={String(perPage)}
              options={[
                { value: "20", label: "20 por página" },
                { value: "50", label: "50 por página" },
                { value: "100", label: "100 por página" },
              ]}
              onChange={(v) => setPerPage(Number(v))}
              className="w-40"
              openUp
            />
          </div>
        </>
      )}
    </div>
  );
}
