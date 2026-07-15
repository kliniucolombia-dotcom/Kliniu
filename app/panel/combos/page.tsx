"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";

type MiniProduct = { id: string; name: string; price: number; image: string; sku: string | null };

type ComboItem = { productId: string; quantity: number; product: MiniProduct };

type Combo = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  description: string | null;
  image: string | null;
  price: number;
  active: boolean;
  items: ComboItem[];
};

const fmt = (n: number) => n.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

type FormState = {
  name: string;
  description: string;
  image: string;
  price: string;
  active: boolean;
  items: { productId: string; quantity: number }[];
};

const EMPTY_FORM: FormState = { name: "", description: "", image: "", price: "", active: true, items: [] };

export default function CombosPanel() {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<MiniProduct[]>([]);
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

  const load = useCallback(async () => {
    setLoading(true);
    const [rCombos, rProducts] = await Promise.all([
      fetch("/api/panel/combos"),
      fetch("/api/panel/products?minimal=1"),
    ]);
    if (rCombos.status === 401 || rCombos.status === 403) { router.push("/login"); return; }
    setCombos(await rCombos.json());
    setProducts(rProducts.ok ? await rProducts.json() : []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (combo: Combo) => {
    setSelected(combo);
    setCreating(false);
    setForm({
      name: combo.name,
      description: combo.description ?? "",
      image: combo.image ?? "",
      price: String(combo.price),
      active: combo.active,
      items: combo.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
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
        price: comboPrice,
        active: form.active,
        items: form.items,
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
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Combos</h1>
        </div>
        <button onClick={openCreate} className="shrink-0 rounded-xl bg-[#27B1B8] px-4 py-2.5 text-xs font-bold text-white hover:opacity-80">
          + Nuevo combo
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando combos…</div>
      ) : (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <tr>
                {["Combo", "SKU", "Productos", "Precio", "Estado"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                ))}
                <th className="sticky right-0 border-l border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {combos.map((c) => (
                <tr key={c.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F1F5F9]">
                        {c.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.image} alt={c.name} className="h-full w-full object-cover" />
                        )}
                      </div>
                      <p className="font-semibold text-[#1A1A1A]">{c.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[#64748B]">{c.sku}</td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">{c.items.length} productos</td>
                  <td className="px-4 py-3 font-bold text-[#1A1A1A]">{fmt(c.price)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${c.active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                      {c.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="sticky right-0 border-l border-[#E2E8F0] bg-white px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(c)} className="rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white hover:opacity-80">Editar</button>
                      <button onClick={() => remove(c.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Descripción (opcional)</label>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2}
                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]" />
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Imagen</label>
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
