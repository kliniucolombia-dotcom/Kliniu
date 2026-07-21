"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { categorias } from "../../data/catalog";
import { SimpleSelect } from "../_components/simple-select";
import { useRealtimeRefresh } from "@/lib/hooks/use-realtime-refresh";

type PanelProduct = {
  id: string; slug: string; sku: string | null; oemReference: string | null;
  alternativeReferences: string[]; category: string; name: string; brand: string;
  price: number; previousPrice: number; stock: number; minimumStock: number;
  image: string; galleryImages: string[]; availability: string; description: string;
  application: string | null; compatibility: string[]; warranty: string | null;
  technicalSpecs: unknown; colorVariants: unknown; videoUrl: string | null; active: boolean;
  isOutlet: boolean;
  updatedAt: string;
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

const emptyForm = {
  sku: "", marca: "Kliniu", nombre: "", oemReferencia: "", referenciasAlternas: "",
  precioValor: "", precioAnteriorValor: "", stock: "0", stockMinimo: "0", categoria: "",
};

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconBox() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M21 8l-9-5-9 5 9 5 9-5Z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="M3 12l9 5 9-5" /><path d="M3 16l9 5 9-5" />
    </svg>
  );
}
function IconCoin() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v10M9 9.5c0-1.4 1.3-2.5 3-2.5s3 1.1 3 2.5-1.3 2-3 2.5-3 1.1-3 2.5 1.3 2.5 3 2.5 3-1.1 3-2.5" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" />
    </svg>
  );
}

export default function OutletPanel() {
  const [products, setProducts] = useState<PanelProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(() => ({ ...emptyForm, categoria: categorias[0] }));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PanelProduct | null>(null);
  const router = useRouter();

  const [outletSearch, setOutletSearch] = useState("");
  const [outletPage, setOutletPage] = useState(1);
  const [outletPerPage, setOutletPerPage] = useState(10);

  const [addSearch, setAddSearch] = useState("");
  const [addCategory, setAddCategory] = useState("all");
  const [addStatus, setAddStatus] = useState("all");
  const [addPage, setAddPage] = useState(1);
  const [addPerPage, setAddPerPage] = useState(10);

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

  const outletProducts = useMemo(() => products.filter((p) => p.isOutlet), [products]);
  const filteredOutlet = useMemo(() => {
    const q = outletSearch.trim().toLowerCase();
    return outletProducts.filter((p) => !q || p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q));
  }, [outletProducts, outletSearch]);
  useEffect(() => { setOutletPage(1); }, [outletSearch, outletPerPage]);
  const outletPageCount = Math.max(1, Math.ceil(filteredOutlet.length / outletPerPage));
  const pagedOutlet = filteredOutlet.slice((outletPage - 1) * outletPerPage, outletPage * outletPerPage);

  const otherProducts = useMemo(() => products.filter((p) => !p.isOutlet), [products]);
  const filteredOther = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    return otherProducts.filter((p) => {
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
      const matchesCategory = addCategory === "all" || p.category === addCategory;
      const matchesStatus = addStatus === "all" || (addStatus === "active" ? p.active : !p.active);
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [otherProducts, addSearch, addCategory, addStatus]);
  useEffect(() => { setAddPage(1); }, [addSearch, addCategory, addStatus, addPerPage]);
  const addPageCount = Math.max(1, Math.ceil(filteredOther.length / addPerPage));
  const pagedOther = filteredOther.slice((addPage - 1) * addPerPage, addPage * addPerPage);

  const kpis = useMemo(() => ({
    activeCount: outletProducts.filter((p) => p.active).length,
    totalUnits: outletProducts.reduce((sum, p) => sum + p.stock, 0),
    inventoryValue: outletProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
    available: otherProducts.length,
  }), [outletProducts, otherProducts]);

  const hasAddFilters = addSearch || addCategory !== "all" || addStatus !== "all";
  const clearAddFilters = () => { setAddSearch(""); setAddCategory("all"); setAddStatus("all"); };

  const exportCsv = () => {
    const header = ["Producto", "SKU", "Categoría", "Precio", "Stock", "Estado"];
    const rows = filteredOutlet.map((p) => [p.name, p.sku ?? "", p.category, String(p.price), String(p.stock), p.active ? "Activo" : "Inactivo"]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outlet-kliniu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const uploadImage = async (f: File, productName: string) => {
    const fd = new FormData();
    fd.append("file", f);
    fd.append("productName", productName);
    const r = await fetch("/api/uploads", { method: "POST", body: fd });
    const d = await r.json() as { publicUrl?: string; error?: string };
    if (!r.ok || !d.publicUrl) throw new Error(d.error || "No fue posible subir la imagen.");
    return d.publicUrl;
  };

  const createOutletProduct = async () => {
    setAlert(null);
    if (!form.nombre.trim()) { setAlert({ type: "err", msg: "Falta el nombre del producto" }); return; }
    if (!file) { setAlert({ type: "err", msg: "Selecciona una imagen" }); return; }
    const precioValor = Number(form.precioValor);
    if (!precioValor || precioValor <= 0) { setAlert({ type: "err", msg: "Precio inválido" }); return; }

    setSaving(true);
    try {
      const imagen = await uploadImage(file, form.nombre);
      const payload = {
        sku: form.sku || undefined,
        categoria: form.categoria,
        isOutlet: true,
        nombre: form.nombre.trim(),
        marca: form.marca.trim() || "Kliniu",
        precioValor,
        precioAnteriorValor: Number(form.precioAnteriorValor || form.precioValor),
        stock: Number(form.stock || 0),
        stockMinimo: Number(form.stockMinimo || 0),
        imagen,
        disponibilidad: "Entrega inmediata",
        descripcion: "",
        oemReferencia: form.oemReferencia || undefined,
        referenciasAlternas: form.referenciasAlternas.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const r = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await r.json() as { error?: string; details?: string };
      if (!r.ok) { setAlert({ type: "err", msg: d.error || "Error al crear producto" }); setSaving(false); return; }
      setAlert({ type: "ok", msg: "Producto outlet creado" });
      setForm({ ...emptyForm, categoria: categorias[0] });
      setFile(null);
      await load();
      setShowCreate(false);
    } catch (e) {
      setAlert({ type: "err", msg: e instanceof Error ? e.message : "Error al crear producto" });
    }
    setSaving(false);
  };

  const setProductOutlet = async (p: PanelProduct, isOutlet: boolean) => {
    setSaving(true);
    setAlert(null);
    const r = await fetch(`/api/products/${p.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOutlet }),
    });
    const d = await r.json() as { error?: string };
    if (!r.ok) { setAlert({ type: "err", msg: d.error || "Error al actualizar" }); setSaving(false); return; }
    setAlert({ type: "ok", msg: isOutlet ? "Producto agregado a Outlet" : "Producto quitado de Outlet" });
    await load();
    setSaving(false);
  };

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">Panel Comercial</p>
          <h1 className="text-3xl font-black text-[#1A1A1A]">Outlet</h1>
          <p className="mt-1 text-sm text-[#6e7379]">Gestiona los productos que se muestran en el outlet y administra su inventario.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#5d6167] transition-colors duration-200 hover:text-[#0C535B]"
          >
            <IconDownload /> Exportar
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-full bg-[#0C535B] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43]"
          >
            <IconPlus /> Crear producto outlet
          </button>
        </div>
      </div>

      {alert && (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
          {alert.msg}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]"><IconBox /></span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-[#1f2328]">{outletProducts.length}</p>
                <p className="text-xs text-[#8b8d91]">Productos en outlet</p>
                <p className="text-[11px] text-[#8b8d91]">{kpis.activeCount} activos</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]"><IconLayers /></span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.totalUnits.toLocaleString("es-CO")}</p>
                <p className="text-xs text-[#8b8d91]">Unidades en stock</p>
                <p className="text-[11px] text-[#8b8d91]">Total disponible</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-[#C2410C]"><IconCoin /></span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-[#1f2328]">{fmt(kpis.inventoryValue)}</p>
                <p className="text-xs text-[#8b8d91]">Valor inventario outlet</p>
                <p className="text-[11px] text-[#8b8d91]">Precio actual</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#6D28D9]"><IconTrend /></span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.available}</p>
                <p className="text-xs text-[#8b8d91]">Productos disponibles</p>
                <p className="text-[11px] text-[#8b8d91]">Para agregar</p>
              </div>
            </div>
          </div>

          {/* Productos en Outlet */}
          <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/8 p-5">
              <h2 className="text-base font-bold text-[#1f2328]">Productos en Outlet ({filteredOutlet.length})</h2>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b8d91]"><IconSearch /></span>
                <input
                  type="search"
                  value={outletSearch}
                  onChange={(e) => setOutletSearch(e.target.value)}
                  placeholder="Buscar en productos del outlet..."
                  className="w-64 rounded-2xl border border-black/10 bg-[#fafaf9] py-2.5 pl-10 pr-4 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead>
                  <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                    <th className="p-4">Producto</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Precio</th>
                    <th className="p-4">Stock</th>
                    <th className="p-4">Últ. actualización</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOutlet.length === 0 ? (
                    <tr><td colSpan={7} className="p-10 text-center text-sm text-[#6e7379]">Aún no hay productos en Outlet.</td></tr>
                  ) : (
                    pagedOutlet.map((p) => {
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
                                <p className="text-xs text-[#8b8d91]">{p.sku ?? "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className="rounded-full bg-[#EAF8F6] px-2.5 py-0.5 text-xs font-semibold text-[#0C535B]">{p.category}</span>
                          </td>
                          <td className="p-4">
                            <span className="font-semibold text-[#1f2328]">{fmt(p.price)}</span>
                            {priceDiff !== 0 && (
                              <p className={`text-xs font-bold ${priceDiff > 0 ? "text-[#16A34A]" : "text-[#DC2626]"}`}>
                                {priceDiff > 0 ? "▲" : "▼"}{Math.abs(priceDiff).toFixed(0)}% vs precio normal
                              </p>
                            )}
                          </td>
                          <td className="p-4 text-[#5d6167]">{p.stock.toLocaleString("es-CO")} unidades</td>
                          <td className="p-4 text-xs text-[#8b8d91]">
                            {new Date(p.updatedAt).toLocaleDateString("es-CO")}
                            <p>{new Date(p.updatedAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</p>
                          </td>
                          <td className="p-4">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                              {p.active ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              disabled={saving}
                              onClick={() => setRemoveTarget(p)}
                              className="rounded-full border border-[#DC2626]/25 bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold text-[#DC2626] transition-colors duration-200 hover:bg-[#DC2626] hover:text-white disabled:opacity-50"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-4 py-3 text-sm text-[#6e7379]">
              <span>
                Mostrando {filteredOutlet.length === 0 ? 0 : (outletPage - 1) * outletPerPage + 1} a {Math.min(outletPage * outletPerPage, filteredOutlet.length)} de {filteredOutlet.length} productos
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setOutletPage((p) => Math.max(1, p - 1))} disabled={outletPage <= 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">‹</button>
                {getPageNumbers(outletPage, outletPageCount).map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-1 text-[#8b8d91]">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setOutletPage(p)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors duration-200 ${p === outletPage ? "bg-[#0C535B] text-white" : "border border-black/10 text-[#5d6167] hover:bg-[#ececea]"}`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button type="button" onClick={() => setOutletPage((p) => Math.min(outletPageCount, p + 1))} disabled={outletPage >= outletPageCount} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">›</button>
              </div>
              <SimpleSelect
                value={String(outletPerPage)}
                options={[{ value: "10", label: "10 por página" }, { value: "20", label: "20 por página" }, { value: "50", label: "50 por página" }]}
                onChange={(v) => setOutletPerPage(Number(v))}
                className="w-40"
                openUp
              />
            </div>
          </div>

          {/* Agregar producto existente */}
          <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <div className="border-b border-black/8 p-5">
              <h2 className="mb-4 text-base font-bold text-[#1f2328]">Agregar producto existente a Outlet</h2>
              <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b8d91]"><IconSearch /></span>
                  <input
                    value={addSearch}
                    onChange={(e) => setAddSearch(e.target.value)}
                    placeholder="Buscar por nombre, marca o SKU..."
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] py-2.5 pl-10 pr-4 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </div>
                <SimpleSelect
                  value={addCategory}
                  options={[{ value: "all", label: "Todas las categorías" }, ...categorias.map((c) => ({ value: c, label: c }))]}
                  onChange={setAddCategory}
                />
                <SimpleSelect
                  value={addStatus}
                  options={[{ value: "all", label: "Todos" }, { value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]}
                  onChange={setAddStatus}
                />
                {hasAddFilters && (
                  <button type="button" onClick={clearAddFilters} className="text-sm font-semibold text-[#27B1B8] hover:underline">
                    Limpiar filtros
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                    <th className="p-4">Producto</th>
                    <th className="p-4">Categoría</th>
                    <th className="p-4">Precio actual</th>
                    <th className="p-4">Stock disponible</th>
                    <th className="p-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedOther.length === 0 ? (
                    <tr><td colSpan={5} className="p-10 text-center text-sm text-[#6e7379]">Ningún producto coincide con los filtros.</td></tr>
                  ) : (
                    pagedOther.map((p) => (
                      <tr key={p.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-black/8 bg-[#fafaf9]">
                              <Image src={p.image} alt={p.name} fill className="object-cover" sizes="36px" />
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-semibold text-[#1f2328]">{p.name}</p>
                              <p className="text-xs text-[#8b8d91]">{p.sku ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="rounded-full bg-[#EAF8F6] px-2.5 py-0.5 text-xs font-semibold text-[#0C535B]">{p.category}</span>
                        </td>
                        <td className="p-4 font-semibold text-[#1f2328]">{fmt(p.price)}</td>
                        <td className={`p-4 font-semibold ${p.stock === 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>{p.stock.toLocaleString("es-CO")} unidades</td>
                        <td className="p-4 text-right">
                          <button disabled={saving} onClick={() => setProductOutlet(p, true)} className="rounded-full bg-[#27B1B8] px-4 py-2 text-xs font-semibold text-white transition-colors duration-200 hover:opacity-90 disabled:opacity-50">
                            Agregar a Outlet
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-4 py-3 text-sm text-[#6e7379]">
              <span>
                Mostrando {filteredOther.length === 0 ? 0 : (addPage - 1) * addPerPage + 1} a {Math.min(addPage * addPerPage, filteredOther.length)} de {filteredOther.length} productos disponibles
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setAddPage((p) => Math.max(1, p - 1))} disabled={addPage <= 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">‹</button>
                {getPageNumbers(addPage, addPageCount).map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-1 text-[#8b8d91]">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAddPage(p)}
                      className={`inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-xs font-semibold transition-colors duration-200 ${p === addPage ? "bg-[#0C535B] text-white" : "border border-black/10 text-[#5d6167] hover:bg-[#ececea]"}`}
                    >
                      {p}
                    </button>
                  )
                )}
                <button type="button" onClick={() => setAddPage((p) => Math.min(addPageCount, p + 1))} disabled={addPage >= addPageCount} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">›</button>
              </div>
              <SimpleSelect
                value={String(addPerPage)}
                options={[{ value: "10", label: "10 por página" }, { value: "20", label: "20 por página" }, { value: "50", label: "50 por página" }]}
                onChange={(v) => setAddPerPage(Number(v))}
                className="w-40"
                openUp
              />
            </div>
          </div>
        </>
      )}

      {/* Modal crear producto outlet */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-black text-[#1A1A1A]">Crear producto outlet</h3>
                <p className="mt-0.5 text-xs text-[#64748B]">Este producto quedará marcado como Outlet, visible también en su categoría real.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">SKU</label>
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ej. FAROLA001" className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Marca</label>
                <input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Categoría real del producto</label>
                <SimpleSelect
                  value={form.categoria}
                  options={categorias.map((c) => ({ value: c, label: c }))}
                  onChange={(v) => setForm({ ...form, categoria: v })}
                />
                <p className="mt-1 text-[10px] text-[#94A3B8]">El producto se marcará como Outlet pero seguirá visible en esta categoría.</p>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Nombre del producto</label>
                <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Referencia OEM</label>
                <input value={form.oemReferencia} onChange={(e) => setForm({ ...form, oemReferencia: e.target.value })} placeholder="Ej. OEM-45892" className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Referencias alternas</label>
                <input value={form.referenciasAlternas} onChange={(e) => setForm({ ...form, referenciasAlternas: e.target.value })} placeholder="Separadas por coma" className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Precio actual</label>
                <input type="number" value={form.precioValor} onChange={(e) => setForm({ ...form, precioValor: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Stock actual</label>
                <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Precio anterior (descuento)</label>
                <input type="number" value={form.precioAnteriorValor} onChange={(e) => setForm({ ...form, precioAnteriorValor: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
                <p className="mt-1 text-[10px] text-[#94A3B8]">Opcional, para mostrar el % de descuento.</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Stock mínimo</label>
                <input type="number" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Imagen del producto</label>
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={createOutletProduct} disabled={saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : "Crear producto outlet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-black text-[#1A1A1A]">Quitar de Outlet</h3>
                <p className="mt-0.5 text-sm text-[#64748B]">{removeTarget.name}</p>
              </div>
              <button onClick={() => setRemoveTarget(null)} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
            </div>
            <p className="mb-4 text-xs text-[#64748B]">El producto no se elimina, solo deja de mostrarse en Outlet. Sigue visible en su categoría real ({removeTarget.category}).</p>
            <div className="flex gap-2">
              <button onClick={() => setRemoveTarget(null)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const p = removeTarget;
                  setRemoveTarget(null);
                  await setProductOutlet(p, false);
                }}
                disabled={saving}
                className="flex-1 rounded-xl bg-[#DC2626] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50"
              >
                Quitar de Outlet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
