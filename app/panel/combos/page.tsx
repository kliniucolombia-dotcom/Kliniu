"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SimpleSelect } from "../_components/simple-select";

type MiniProduct = { id: string; name: string; price: number; image: string; sku: string | null };

type ComboItem = { productId: string; quantity: number; product: MiniProduct };

type Combo = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string | null;
  image: string | null;
  galleryImages: string[];
  price: number;
  active: boolean;
  items: ComboItem[];
  createdByName: string | null;
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

type Vendedor = { id: string; fullName: string };

type FormState = {
  name: string;
  description: string;
  image: string;
  galleryImages: string[];
  price: string;
  active: boolean;
  items: { productId: string; quantity: number }[];
  createdByName: string;
};

const EMPTY_FORM: FormState = { name: "", description: "", image: "", galleryImages: [], price: "", active: true, items: [], createdByName: "" };

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
function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" />
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
function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 3 8l9 5 9-5-9-5Z" /><path d="M3 12l9 5 9-5" /><path d="M3 16l9 5 9-5" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

export default function CombosPanel() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<MiniProduct[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Combo | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [productSearch, setProductSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const router = useRouter();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [viewFilter, setViewFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const [showTip, setShowTip] = useState(true);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rCombos, rProducts, rVendedores] = await Promise.all([
      fetch("/api/panel/combos"),
      fetch("/api/panel/products?minimal=1"),
      fetch("/api/panel/vendedores"),
    ]);
    if (rCombos.status === 401 || rCombos.status === 403) { router.push("/login"); return; }
    setCombos(await rCombos.json());
    setProducts(rProducts.ok ? await rProducts.json() : []);
    setVendedores(rVendedores.ok ? await rVendedores.json() : []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const combosWithSavings = useMemo(() => {
    return combos.map((c) => {
      const normalTotal = c.items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
      const savings = Math.max(0, normalTotal - c.price);
      const savingsPct = normalTotal > 0 ? (savings / normalTotal) * 100 : 0;
      return { ...c, normalTotal, savings, savingsPct };
    });
  }, [combos]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = combosWithSavings.filter((c) => {
      const matchesSearch = !q || c.name.toLowerCase().includes(q) || c.sku.toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? c.active : !c.active);
      const matchesView = viewFilter === "all" || (viewFilter === "discount" ? c.savingsPct > 0 : c.savingsPct === 0);
      return matchesSearch && matchesStatus && matchesView;
    });
    list = [...list].sort((a, b) => {
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });
    return list;
  }, [combosWithSavings, search, statusFilter, viewFilter, sortBy]);

  useEffect(() => { setPage(1); }, [search, statusFilter, sortBy, viewFilter, perPage]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  const kpis = useMemo(() => ({
    total: combos.length,
    active: combos.filter((c) => c.active).length,
    totalValue: combos.reduce((sum, c) => sum + c.price, 0),
    totalItems: combos.reduce((sum, c) => sum + c.items.reduce((s, i) => s + i.quantity, 0), 0),
  }), [combos]);

  const hasFilters = search || statusFilter !== "all" || sortBy !== "recent" || viewFilter !== "all";
  const filterCount = [search, statusFilter !== "all", sortBy !== "recent", viewFilter !== "all"].filter(Boolean).length;
  const clearFilters = () => { setSearch(""); setStatusFilter("all"); setSortBy("recent"); setViewFilter("all"); };

  const exportCsv = () => {
    const header = ["Combo", "SKU", "Productos", "Precio", "Descuento %", "Ahorro", "Estado", "Vendedor"];
    const rows = filtered.map((c) => [
      c.name, c.sku, String(c.items.length), String(c.price),
      c.savingsPct.toFixed(0), String(c.savings), c.active ? "Activo" : "Inactivo", c.createdByName ?? "",
    ]);
    const csv = [header, ...rows].map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "combos-kliniu.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const copySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    setTimeout(() => setCopiedSku((s) => (s === sku ? null : s)), 1500);
  };

  const openEdit = (combo: Combo) => {
    setSelected(combo);
    setCreating(false);
    setForm({
      name: combo.name,
      description: combo.description ?? "",
      image: combo.image ?? "",
      galleryImages: combo.galleryImages ?? [],
      price: String(combo.price),
      active: combo.active,
      items: combo.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      createdByName: combo.createdByName ?? "",
    });
    setAlert(null);
  };

  const openCreate = () => {
    setSelected(null);
    setCreating(true);
    setForm(EMPTY_FORM);
    setAlert(null);
  };

  const closeModal = () => { setSelected(null); setCreating(false); };

  const toggleProduct = (productId: string) => {
    setForm((f) => {
      const exists = f.items.find((i) => i.productId === productId);
      if (exists) return { ...f, items: f.items.filter((i) => i.productId !== productId) };
      return { ...f, items: [...f.items, { productId, quantity: 1 }] };
    });
  };

  const setQuantity = (productId: string, quantity: number) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, quantity) } : i)),
    }));
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("productName", `combo-${form.name || "nuevo"}`);
    const r = await fetch("/api/uploads", { method: "POST", body: fd });
    setUploading(false);
    if (!r.ok) {
      const d = await r.json();
      setAlert({ type: "err", msg: d.error ?? "Error al subir imagen" });
      return;
    }
    const d = (await r.json()) as { publicUrl: string };
    setForm((f) => ({ ...f, image: d.publicUrl }));
  };

  const uploadGalleryImages = async (files: FileList) => {
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("productName", `combo-${form.name || "nuevo"}`);
      const r = await fetch("/api/uploads", { method: "POST", body: fd });
      if (!r.ok) {
        const d = await r.json();
        setAlert({ type: "err", msg: d.error ?? "Error al subir imagen" });
        continue;
      }
      const d = (await r.json()) as { publicUrl: string };
      urls.push(d.publicUrl);
    }
    setUploading(false);
    if (urls.length) setForm((f) => ({ ...f, galleryImages: [...f.galleryImages, ...urls] }));
  };

  const removeGalleryImage = (url: string) => {
    setForm((f) => ({ ...f, galleryImages: f.galleryImages.filter((u) => u !== url) }));
  };

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

  const normalTotal = useMemo(() => {
    return form.items.reduce((total, item) => {
      const product = products.find((p) => p.id === item.productId);
      return total + (product?.price ?? 0) * item.quantity;
    }, 0);
  }, [form.items, products]);

  const comboPrice = Number(form.price) || 0;
  const savings = Math.max(0, normalTotal - comboPrice);
  const savingsPct = normalTotal > 0 ? (savings / normalTotal) * 100 : 0;

  const save = async () => {
    if (!form.name.trim()) { setAlert({ type: "err", msg: "El nombre es obligatorio" }); return; }
    if (form.items.length === 0) { setAlert({ type: "err", msg: "Agrega al menos un producto" }); return; }
    if (!comboPrice || comboPrice <= 0) { setAlert({ type: "err", msg: "El precio del combo es obligatorio" }); return; }

    setSaving(true);
    const method = creating ? "POST" : "PATCH";
    const r = await fetch("/api/panel/combos", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: selected?.id,
        name: form.name.trim(),
        description: form.description || undefined,
        image: form.image || undefined,
        galleryImages: form.galleryImages,
        price: comboPrice,
        active: form.active,
        items: form.items,
        createdByName: form.createdByName || undefined,
      }),
    });
    setSaving(false);
    if (r.ok) {
      setAlert({ type: "ok", msg: "Combo guardado" });
      load();
      closeModal();
    } else {
      const d = await r.json();
      setAlert({ type: "err", msg: d.error ?? "Error al guardar" });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este combo?")) return;
    await fetch(`/api/panel/combos?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="min-h-full bg-[#f5f5f5] p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">Panel Comercial</p>
          <h1 className="text-3xl font-black text-[#1A1A1A]">Combos</h1>
          <p className="mt-1 text-sm text-[#6e7379]">Gestiona y organiza los combos de productos disponibles.</p>
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
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-[#0C535B] px-4 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43]"
          >
            <IconPlus /> Nuevo combo
          </button>
        </div>
      </div>

      {alert && !selected && !creating && (
        <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
          {alert.msg}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando combos…</div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]"><IconBox /></span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.total}</p>
                <p className="text-xs text-[#8b8d91]">Combos totales</p>
                <p className="text-[11px] text-[#8b8d91]">En el catálogo</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0FDF4] text-[#15803D]"><IconCheck /></span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.active}</p>
                <p className="text-xs text-[#8b8d91]">Combos activos</p>
                <p className="text-[11px] text-[#8b8d91]">Publicados</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF7ED] text-[#C2410C]"><IconCoin /></span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-[#1f2328]">{fmt(kpis.totalValue)}</p>
                <p className="text-xs text-[#8b8d91]">Valor total combos</p>
                <p className="text-[11px] text-[#8b8d91]">Precio de venta</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-[1.4rem] border border-black/8 bg-white px-5 py-4 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F3FF] text-[#6D28D9]"><IconLayers /></span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold text-[#1f2328]">{kpis.totalItems}</p>
                <p className="text-xs text-[#8b8d91]">Productos incluidos</p>
                <p className="text-[11px] text-[#8b8d91]">En todos los combos</p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="rounded-[1.75rem] border border-black/8 bg-white p-5 shadow-[0_10px_20px_rgba(15,23,42,0.04)]">
            <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#8b8d91]">Buscar</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#8b8d91]"><IconSearch /></span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar por nombre o SKU..."
                    className="w-full rounded-2xl border border-black/10 bg-[#fafaf9] py-2.5 pl-10 pr-4 text-sm text-[#1f2328] outline-none transition-colors duration-200 focus:border-[#27B1B8]"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#8b8d91]">Estado</label>
                <SimpleSelect
                  value={statusFilter}
                  options={[{ value: "all", label: "Todos" }, { value: "active", label: "Activo" }, { value: "inactive", label: "Inactivo" }]}
                  onChange={setStatusFilter}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#8b8d91]">Ordenar por</label>
                <SimpleSelect
                  value={sortBy}
                  options={[
                    { value: "recent", label: "Más recientes" },
                    { value: "price_desc", label: "Precio: mayor a menor" },
                    { value: "price_asc", label: "Precio: menor a mayor" },
                    { value: "name", label: "Nombre A-Z" },
                  ]}
                  onChange={setSortBy}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-[#8b8d91]">Ver</label>
                <SimpleSelect
                  value={viewFilter}
                  options={[
                    { value: "all", label: "Todos los combos" },
                    { value: "discount", label: "Con descuento" },
                    { value: "no_discount", label: "Sin descuento" },
                  ]}
                  onChange={setViewFilter}
                />
              </div>
              <div className="flex items-end">
                <span className="inline-flex items-center gap-2 rounded-2xl border border-black/10 bg-[#fafaf9] px-4 py-2.5 text-sm font-semibold text-[#5d6167]">
                  Filtros
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0C535B] px-1 text-[11px] font-bold text-white">{filterCount}</span>
                </span>
              </div>
            </div>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className="mt-3 text-sm font-semibold text-[#27B1B8] hover:underline">
                ↻ Limpiar filtros
              </button>
            )}
          </div>

          {/* Tabla de combos */}
          <div className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-black/8 text-left text-xs font-semibold uppercase tracking-[0.08em] text-[#8b8d91]">
                    <th className="p-4">Combo</th>
                    <th className="p-4">SKU</th>
                    <th className="p-4">Productos</th>
                    <th className="p-4">Precio</th>
                    <th className="p-4">Descuento</th>
                    <th className="p-4">Vendedor</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.length === 0 ? (
                    <tr><td colSpan={8} className="p-10 text-center text-sm text-[#6e7379]">Ningún combo coincide con los filtros.</td></tr>
                  ) : (
                    paged.map((c) => (
                      <tr key={c.id} className="border-b border-black/6 last:border-0 hover:bg-[#fafaf9]">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-black/8 bg-[#fafaf9]">
                              {c.image && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="max-w-[220px] truncate text-sm font-semibold text-[#1f2328]">{c.name}</p>
                              <p className="max-w-[220px] truncate text-xs text-[#8b8d91]">{c.description || `Combo de ${c.items.length} productos`}</p>
                              <span className="mt-1 inline-block rounded-full bg-[#EAF8F6] px-2 py-0.5 text-[10px] font-semibold text-[#0C535B]">{c.items.length} productos</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <button type="button" onClick={() => copySku(c.sku)} className="inline-flex items-center gap-1.5 font-mono text-xs text-[#5d6167] hover:text-[#0C535B]">
                            {c.sku} <IconCopy />
                          </button>
                          {copiedSku === c.sku && <p className="text-[10px] font-semibold text-[#16A34A]">Copiado</p>}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center -space-x-2">
                            {c.items.slice(0, 3).map((i) => (
                              <div key={i.productId} className="h-8 w-8 overflow-hidden rounded-full border-2 border-white bg-[#fafaf9]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={i.product.image} alt={i.product.name} className="h-full w-full object-cover" />
                              </div>
                            ))}
                            {c.items.length > 3 && (
                              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#F1F5F9] text-[10px] font-bold text-[#5d6167]">
                                +{c.items.length - 3}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-semibold text-[#1f2328]">{fmt(c.price)}</p>
                          <p className="text-[11px] text-[#8b8d91]">Precio combo</p>
                        </td>
                        <td className="p-4">
                          {c.savingsPct > 0 ? (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] px-2 py-0.5 text-xs font-bold text-[#DC2626]">↓ {c.savingsPct.toFixed(0)}%</span>
                              <p className="mt-1 text-[11px] font-semibold text-[#16A34A]">Ahorra {fmt(c.savings)}</p>
                            </>
                          ) : (
                            <span className="text-xs text-[#8b8d91]">—</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-[#5d6167]">{c.createdByName ?? "—"}</td>
                        <td className="p-4">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${c.active ? "bg-[#16A34A]" : "bg-[#94A3B8]"}`} />
                            {c.active ? "Activo" : "Inactivo"}
                          </span>
                          <p className="mt-0.5 text-[10px] text-[#8b8d91]">{c.active ? "Publicado" : "No publicado"}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEdit(c)} className="rounded-full bg-[#0C535B] px-4 py-1.5 text-xs font-semibold text-white transition-colors duration-200 hover:bg-[#073D43]">Editar</button>
                            <button onClick={() => remove(c.id)} className="rounded-full border border-[#DC2626]/25 bg-[#FEF2F2] px-4 py-1.5 text-xs font-semibold text-[#DC2626] transition-colors duration-200 hover:bg-[#DC2626] hover:text-white">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-black/8 px-4 py-3 text-sm text-[#6e7379]">
              <span>
                Mostrando {filtered.length === 0 ? 0 : (page - 1) * perPage + 1} a {Math.min(page * perPage, filtered.length)} de {filtered.length} combos
              </span>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">‹</button>
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
                <button type="button" onClick={() => setPage((p) => Math.min(pageCount, p + 1))} disabled={page >= pageCount} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-black/10 text-[#5d6167] disabled:opacity-40">›</button>
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

          {showTip && (
            <div className="flex items-start justify-between gap-3 rounded-2xl bg-[#EAF8F6] px-4 py-3.5 text-sm">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#27B1B8] text-[11px] font-bold text-white">i</span>
                <div>
                  <p className="font-semibold text-[#0C535B]">Consejo</p>
                  <p className="text-[#0C535B]/80">Los combos te permiten agrupar productos y ofrecer descuentos atractivos a tus clientes.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowTip(false)} className="shrink-0 text-[#0C535B]/60 hover:text-[#0C535B]">✕</button>
            </div>
          )}
        </>
      )}

      {(selected || creating) && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">{creating ? "Nuevo combo" : `Editar: ${selected?.name}`}</h3>
              <button onClick={closeModal} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Nombre</label>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Precio del combo (COP)</label>
                <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-bold outline-none focus:border-[#27B1B8]" />
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Vendedor</label>
              <SimpleSelect
                value={form.createdByName}
                onChange={(v) => setForm((f) => ({ ...f, createdByName: v }))}
                placeholder="Seleccionar vendedor…"
                options={vendedores.map((v) => ({ value: v.fullName, label: v.fullName }))}
              />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Descripción (opcional)</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Imagen principal</label>
              <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f); }} />
              <div className="flex items-center gap-3">
                {form.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image} alt="preview combo" className="h-14 w-14 rounded-lg object-cover bg-[#F1F5F9]" />
                )}
                <button onClick={() => imageInputRef.current?.click()} disabled={uploading}
                  className="rounded-xl border border-dashed border-[#E2E8F0] px-4 py-2.5 text-xs font-bold text-[#64748B] hover:border-[#27B1B8] disabled:opacity-50">
                  {uploading ? "Subiendo…" : "Cargar imagen"}
                </button>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Imágenes adicionales (opcional)</label>
              <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                onChange={(e) => { const files = e.target.files; if (files && files.length) uploadGalleryImages(files); e.target.value = ""; }} />
              <div className="flex flex-wrap items-center gap-3">
                {form.galleryImages.map((url) => (
                  <div key={url} className="group relative h-14 w-14 shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="imagen adicional del combo" className="h-full w-full rounded-lg object-cover bg-[#F1F5F9]" />
                    <button
                      type="button"
                      onClick={() => removeGalleryImage(url)}
                      className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#DC2626] text-[10px] font-bold text-white shadow"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button onClick={() => galleryInputRef.current?.click()} disabled={uploading}
                  className="rounded-xl border border-dashed border-[#E2E8F0] px-4 py-2.5 text-xs font-bold text-[#64748B] hover:border-[#27B1B8] disabled:opacity-50">
                  {uploading ? "Subiendo…" : "+ Agregar imágenes"}
                </button>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Productos incluidos</label>
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Buscar producto…"
                className="mb-2 w-full rounded-xl border border-[#E2E8F0] px-4 py-2 text-sm outline-none focus:border-[#27B1B8]"
              />
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[#E2E8F0] p-2">
                {filteredProducts.map((p) => {
                  const item = form.items.find((i) => i.productId === p.id);
                  return (
                    <div key={p.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[#F8FAFC]">
                      <input type="checkbox" checked={!!item} onChange={() => toggleProduct(p.id)} />
                      <span className="flex-1 truncate text-xs text-[#1A1A1A]">{p.name}</span>
                      <span className="text-[10px] text-[#94A3B8]">{fmt(p.price)}</span>
                      {item && (
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => setQuantity(p.id, Number(e.target.value))}
                          className="w-14 rounded-lg border border-[#E2E8F0] px-2 py-1 text-xs"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Vista previa automática de ahorro */}
            <div className="mt-4 rounded-xl bg-[#F8FAFC] p-4">
              <p className="mb-2 text-xs font-bold text-[#64748B]">Vista previa de ahorro (no se guarda)</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div>
                  <p className="text-[10px] text-[#94A3B8]">Precio normal</p>
                  <p className="font-bold text-[#1A1A1A]">{fmt(normalTotal)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#94A3B8]">Precio combo</p>
                  <p className="font-bold text-[#27B1B8]">{fmt(comboPrice)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#94A3B8]">Ahorro</p>
                  <p className="font-bold text-[#16A34A]">{fmt(savings)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#94A3B8]">% ahorro</p>
                  <p className="font-bold text-[#16A34A]">{savingsPct.toFixed(0)}%</p>
                </div>
              </div>
            </div>

            <label className="mt-3 flex items-center gap-2 text-xs font-bold text-[#64748B]">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))} />
              Activo
            </label>

            {alert && (
              <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                {alert.msg}
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <button onClick={closeModal} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">Cancelar</button>
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar combo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
