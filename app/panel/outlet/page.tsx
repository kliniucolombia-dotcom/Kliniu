"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { categorias } from "../../data/catalog";

const nonOutletCategorias = categorias.filter((c) => c !== "Outlet");

type PanelProduct = {
  id: string; slug: string; sku: string | null; oemReference: string | null;
  alternativeReferences: string[]; category: string; name: string; brand: string;
  price: number; previousPrice: number; stock: number; minimumStock: number;
  image: string; galleryImages: string[]; availability: string; description: string;
  application: string | null; compatibility: string[]; warranty: string | null;
  technicalSpecs: unknown; colorVariants: unknown; videoUrl: string | null; active: boolean;
};

const fmt = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const emptyForm = {
  sku: "", marca: "Kliniu", nombre: "", oemReferencia: "", referenciasAlternas: "",
  precioValor: "", precioAnteriorValor: "", stock: "0", stockMinimo: "0",
};

export default function OutletPanel() {
  const [tab, setTab] = useState<"crear" | "productos">("productos");
  const [products, setProducts] = useState<PanelProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<PanelProduct | null>(null);
  const [removeCategoria, setRemoveCategoria] = useState(nonOutletCategorias[0]);
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

  const outletProducts = useMemo(() => products.filter((p) => p.category === "Outlet"), [products]);
  const otherProducts = useMemo(() => {
    const q = search.toLowerCase();
    return products.filter((p) => p.category !== "Outlet" && (p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q)));
  }, [products, search]);

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
        categoria: "Outlet",
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
      setForm(emptyForm);
      setFile(null);
      await load();
      setTab("productos");
    } catch (e) {
      setAlert({ type: "err", msg: e instanceof Error ? e.message : "Error al crear producto" });
    }
    setSaving(false);
  };

  const setProductCategory = async (p: PanelProduct, categoria: string) => {
    setSaving(true);
    setAlert(null);
    const payload = {
      sku: p.sku ?? undefined,
      categoria,
      nombre: p.name,
      marca: p.brand,
      precioValor: p.price,
      precioAnteriorValor: p.previousPrice,
      stock: p.stock,
      stockMinimo: p.minimumStock,
      imagen: p.image,
      imagenesExtra: p.galleryImages,
      disponibilidad: p.availability,
      descripcion: p.description,
      oemReferencia: p.oemReference ?? undefined,
      referenciasAlternas: p.alternativeReferences,
      compatibilidad: p.compatibility,
      aplicacion: p.application ?? undefined,
      garantia: p.warranty ?? undefined,
      videoUrl: p.videoUrl ?? undefined,
    };
    const r = await fetch(`/api/products/${p.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const d = await r.json() as { error?: string };
    if (!r.ok) { setAlert({ type: "err", msg: d.error || "Error al actualizar" }); setSaving(false); return; }
    setAlert({ type: "ok", msg: categoria === "Outlet" ? "Producto agregado a Outlet" : "Producto quitado de Outlet" });
    await load();
    setSaving(false);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Outlet</h1>
      </div>

      <div className="mb-5 flex gap-2">
        <button onClick={() => setTab("productos")} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "productos" ? "bg-[#1A1A1A] text-white" : "border border-[#E2E8F0] text-[#64748B]"}`}>
          Productos en Outlet ({outletProducts.length})
        </button>
        <button onClick={() => setTab("crear")} className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === "crear" ? "bg-[#1A1A1A] text-white" : "border border-[#E2E8F0] text-[#64748B]"}`}>
          Crear producto outlet
        </button>
      </div>

      {alert && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
          {alert.msg}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : tab === "productos" ? (
        <div className="space-y-8">
          <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <tr>
                  {["Producto", "Precio", "Stock", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {outletProducts.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-sm text-[#94A3B8]">Aún no hay productos en Outlet.</td></tr>
                )}
                {outletProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F8FAFC]">
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
                    <td className="px-4 py-3 font-bold text-[#1A1A1A]">{fmt(p.price)}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B]">{p.stock}</td>
                    <td className="px-4 py-3">
                      <button
                        disabled={saving}
                        onClick={() => { setRemoveTarget(p); setRemoveCategoria(nonOutletCategorias[0]); }}
                        className="rounded-lg border border-[#E2E8F0] px-3 py-1.5 text-xs font-bold text-[#DC2626] hover:bg-[#FEE2E2] disabled:opacity-50"
                      >
                        Quitar de Outlet
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Agregar producto existente a Outlet</p>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, marca o SKU…"
              className="mb-3 w-full max-w-sm rounded-xl border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
            />
            <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <tbody className="divide-y divide-[#F1F5F9]">
                  {otherProducts.slice(0, 30).map((p) => (
                    <tr key={p.id} className="hover:bg-[#F8FAFC]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-[#F1F5F9]">
                            <Image src={p.image} alt={p.name} fill className="object-cover" sizes="36px" />
                          </div>
                          <div>
                            <p className="font-semibold text-[#1A1A1A] leading-tight">{p.name}</p>
                            <p className="text-[10px] text-[#94A3B8]">{p.brand} · {p.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-[#1A1A1A]">{fmt(p.price)}</td>
                      <td className="px-4 py-3">
                        <button disabled={saving} onClick={() => setProductCategory(p, "Outlet")} className="rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white hover:opacity-80 disabled:opacity-50">
                          Agregar a Outlet
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl rounded-2xl border border-[#E2E8F0] bg-white p-6">
          <p className="mb-4 text-xs text-[#64748B]">Este producto quedará marcado en la categoría Outlet.</p>
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
          <button onClick={createOutletProduct} disabled={saving} className="mt-5 w-full rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
            {saving ? "Guardando…" : "Crear producto outlet"}
          </button>
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
            <p className="mb-3 text-xs text-[#64748B]">El producto no se elimina, solo se saca de la categoría Outlet. Elige a qué categoría vuelve:</p>
            <select
              value={removeCategoria}
              onChange={(e) => setRemoveCategoria(e.target.value)}
              className="mb-4 w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
            >
              {nonOutletCategorias.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button onClick={() => setRemoveTarget(null)} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const p = removeTarget;
                  setRemoveTarget(null);
                  await setProductCategory(p, removeCategoria);
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
