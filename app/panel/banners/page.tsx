"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { categoriasData } from "../../data/catalog";

type Banner = {
  id: string;
  key: string;
  type: "CATEGORY" | "SITE";
  title1: string | null;
  title2: string | null;
  desktopImage: string | null;
  mobileImage: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  active: boolean;
  order: number;
  updatedAt: string;
};

type FormState = {
  key: string;
  type: "CATEGORY" | "SITE";
  title1: string;
  title2: string;
  desktopImage: string;
  mobileImage: string;
  link: string;
  metadataText: string;
  active: boolean;
  order: string;
};

const FIXED_LOCATIONS: { key: string; type: "CATEGORY" | "SITE"; label: string }[] = [
  { key: "home_hero_slide_1", type: "SITE", label: "Inicio → Carrusel principal → slide 1 de 3" },
  { key: "home_hero_slide_2", type: "SITE", label: "Inicio → Carrusel principal → slide 2 de 3" },
  { key: "home_hero_slide_3", type: "SITE", label: "Inicio → Carrusel principal → slide 3 de 3" },
  { key: "home_banner_features", type: "SITE", label: "Inicio → franja de beneficios/características" },
  { key: "home_banner_asesoria", type: "SITE", label: "Inicio → banner \"Habla con un asesor\"" },
  { key: "home_banner_insumos", type: "SITE", label: "Inicio → banner de Insumos/Repuestos" },
  { key: "asesor_banner", type: "SITE", label: "Categorías → sección \"¿Necesitas ayuda para elegir?\"" },
];

const KNOWN_LOCATIONS: { key: string; type: "CATEGORY" | "SITE"; label: string }[] = [
  ...FIXED_LOCATIONS,
  ...categoriasData.map((c) => ({
    key: `categoria_${c.nombre}`,
    type: "CATEGORY" as const,
    label: `Categorías → banner grande de "${c.nombre}"`,
  })),
];

function getBannerLocation(key: string): string {
  const known = KNOWN_LOCATIONS.find((l) => l.key === key);
  if (known) return known.label;
  if (key.startsWith("categoria_")) {
    return `Categorías → banner grande de la categoría "${key.replace("categoria_", "")}"`;
  }
  return "Ubicación personalizada (key no reconocida automáticamente)";
}

const EMPTY_FORM: FormState = {
  key: "",
  type: "SITE",
  title1: "",
  title2: "",
  desktopImage: "",
  mobileImage: "",
  link: "",
  metadataText: "",
  active: true,
  order: "0",
};

export default function BannersPanel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"desktop" | "mobile" | null>(null);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const [keyMode, setKeyMode] = useState<"known" | "custom">("known");
  const router = useRouter();
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/panel/banners");
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    const data = await r.json();
    setBanners(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (banner: Banner) => {
    setSelected(banner);
    setCreating(false);
    setForm({
      key: banner.key,
      type: banner.type,
      title1: banner.title1 ?? "",
      title2: banner.title2 ?? "",
      desktopImage: banner.desktopImage ?? "",
      mobileImage: banner.mobileImage ?? "",
      link: banner.link ?? "",
      metadataText: banner.metadata ? JSON.stringify(banner.metadata, null, 2) : "",
      active: banner.active,
      order: String(banner.order),
    });
    setAlert(null);
  };

  const availableLocations = KNOWN_LOCATIONS.filter(
    (loc) => !banners.some((b) => b.key === loc.key),
  );

  const openCreate = () => {
    setSelected(null);
    setCreating(true);
    setForm(EMPTY_FORM);
    setKeyMode(availableLocations.length > 0 ? "known" : "custom");
    setAlert(null);
  };

  const closeModal = () => {
    setSelected(null);
    setCreating(false);
  };

  const uploadImage = async (file: File, slot: "desktop" | "mobile") => {
    setUploading(slot);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("productName", `banner-${form.key || "nuevo"}`);
    const r = await fetch("/api/uploads", { method: "POST", body: fd });
    setUploading(null);
    if (!r.ok) {
      const d = await r.json();
      setAlert({ type: "err", msg: d.error ?? "Error al subir imagen" });
      return;
    }
    const d = (await r.json()) as { publicUrl: string };
    setForm((f) => ({ ...f, [slot === "desktop" ? "desktopImage" : "mobileImage"]: d.publicUrl }));
  };

  const save = async () => {
    if (!form.key.trim()) { setAlert({ type: "err", msg: "La key es obligatoria" }); return; }

    let metadata: Record<string, unknown> | undefined;
    if (form.metadataText.trim()) {
      try {
        metadata = JSON.parse(form.metadataText);
      } catch {
        setAlert({ type: "err", msg: "El metadata no es JSON válido" });
        return;
      }
    }

    setSaving(true);
    const method = creating ? "POST" : "PATCH";
    const r = await fetch("/api/panel/banners", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: form.key.trim(),
        type: form.type,
        title1: form.title1 || undefined,
        title2: form.title2 || undefined,
        desktopImage: form.desktopImage || undefined,
        mobileImage: form.mobileImage || undefined,
        link: form.link || undefined,
        metadata,
        active: form.active,
        order: Number(form.order) || 0,
      }),
    });
    setSaving(false);
    if (r.ok) {
      setAlert({ type: "ok", msg: "Banner guardado" });
      load();
      closeModal();
    } else {
      const d = await r.json();
      setAlert({ type: "err", msg: d.error ?? "Error al guardar" });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("¿Eliminar este banner?")) return;
    await fetch(`/api/panel/banners?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel Comercial</p>
          <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Banners</h1>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 rounded-xl bg-[#27B1B8] px-4 py-2.5 text-xs font-bold text-white hover:opacity-80"
        >
          + Nuevo banner
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando banners…</div>
      ) : (
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
              <tr>
                {["Dónde aparece", "Preview", "Título", "Estado", "Orden"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{h}</th>
                ))}
                <th className="sticky right-0 border-l border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {banners.map((b) => (
                <tr key={b.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3">
                    <p className="max-w-[260px] text-xs font-semibold text-[#1A1A1A]">{getBannerLocation(b.key)}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-[#94A3B8]">{b.key}</p>
                  </td>
                  <td className="px-4 py-3">
                    {b.desktopImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={b.desktopImage} alt={b.key} className="h-10 w-16 rounded-lg object-cover bg-[#F1F5F9]" />
                    ) : (
                      <span className="text-xs text-[#CBD5E1]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">{b.title1 || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${b.active ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                      {b.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94A3B8]">{b.order}</td>
                  <td className="sticky right-0 border-l border-[#E2E8F0] bg-white px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(b)} className="rounded-lg bg-[#27B1B8] px-3 py-1.5 text-xs font-bold text-white hover:opacity-80">
                        Editar
                      </button>
                      <button onClick={() => remove(b.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50">
                        Eliminar
                      </button>
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
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">{creating ? "Nuevo banner" : `Editar: ${selected?.key}`}</h3>
              <button onClick={closeModal} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
            </div>

            {!creating && selected && (
              <div className="mb-4 rounded-xl bg-[#EFFAFB] px-3 py-2 text-xs font-semibold text-[#0C535B]">
                📍 Dónde aparece: {getBannerLocation(selected.key)}
              </div>
            )}
            {creating && keyMode === "custom" && (
              <div className="mb-4 rounded-xl bg-[#FFF7ED] px-3 py-2 text-xs font-semibold text-[#9A3412]">
                ⚠️ La &quot;key&quot; define dónde se muestra. Si no coincide con una key usada en el código, el banner se guarda pero no aparece en ningún lado del sitio.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {creating && keyMode === "known" ? (
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">¿Dónde va este banner?</label>
                  <select
                    value={form.key}
                    onChange={(e) => {
                      const loc = availableLocations.find((l) => l.key === e.target.value);
                      setForm((f) => ({ ...f, key: e.target.value, type: loc?.type ?? f.type }));
                    }}
                    className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
                  >
                    <option value="">Elegir ubicación…</option>
                    {availableLocations.map((loc) => (
                      <option key={loc.key} value={loc.key}>{loc.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => { setKeyMode("custom"); setForm((f) => ({ ...f, key: "" })); }}
                    className="mt-1.5 text-[11px] font-semibold text-[#27B1B8] hover:underline"
                  >
                    Usar key personalizada en vez de la lista
                  </button>
                </div>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-bold text-[#64748B]">Key (identificador único)</label>
                  <input
                    value={form.key}
                    disabled={!creating}
                    onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))}
                    placeholder="ej: home_banner_1, categoria_champus"
                    className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                  />
                  {creating && availableLocations.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setKeyMode("known")}
                      className="mt-1.5 text-[11px] font-semibold text-[#27B1B8] hover:underline"
                    >
                      Elegir de la lista de ubicaciones conocidas
                    </button>
                  )}
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Tipo</label>
                <select
                  value={form.type}
                  disabled={creating && keyMode === "known"}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "CATEGORY" | "SITE" }))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8] disabled:bg-[#F8FAFC] disabled:text-[#94A3B8]"
                >
                  <option value="SITE">SITE</option>
                  <option value="CATEGORY">CATEGORY</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Título línea 1</label>
                <input
                  value={form.title1}
                  onChange={(e) => setForm((f) => ({ ...f, title1: e.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Título línea 2</label>
                <input
                  value={form.title2}
                  onChange={(e) => setForm((f) => ({ ...f, title2: e.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Link (opcional)</label>
                <input
                  value={form.link}
                  onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Orden</label>
                <input
                  type="number"
                  value={form.order}
                  onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm outline-none focus:border-[#27B1B8]"
                />
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Imagen desktop</label>
                <input ref={desktopInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "desktop"); }} />
                <button onClick={() => desktopInputRef.current?.click()} disabled={uploading === "desktop"}
                  className="w-full rounded-xl border border-dashed border-[#E2E8F0] px-4 py-2.5 text-xs font-bold text-[#64748B] hover:border-[#27B1B8] disabled:opacity-50">
                  {uploading === "desktop" ? "Subiendo…" : "Cargar imagen desktop"}
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-[#64748B]">Imagen móvil</label>
                <input ref={mobileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadImage(f, "mobile"); }} />
                <button onClick={() => mobileInputRef.current?.click()} disabled={uploading === "mobile"}
                  className="w-full rounded-xl border border-dashed border-[#E2E8F0] px-4 py-2.5 text-xs font-bold text-[#64748B] hover:border-[#27B1B8] disabled:opacity-50">
                  {uploading === "mobile" ? "Subiendo…" : "Cargar imagen móvil"}
                </button>
              </div>
            </div>

            {/* Vista previa: desktop -> mobile, siempre visible antes de guardar */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold text-[#64748B]">Vista previa</p>
              <div className="space-y-2">
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                  <p className="mb-1 text-[10px] font-bold uppercase text-[#94A3B8]">Desktop</p>
                  {form.desktopImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.desktopImage} alt="preview desktop" className="h-28 w-full rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-28 items-center justify-center rounded-lg bg-[#F1F5F9] text-xs text-[#CBD5E1]">Sin imagen</div>
                  )}
                </div>
                <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2">
                  <p className="mb-1 text-[10px] font-bold uppercase text-[#94A3B8]">Móvil</p>
                  {form.mobileImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.mobileImage} alt="preview móvil" className="mx-auto h-40 w-32 rounded-lg object-cover" />
                  ) : (
                    <div className="mx-auto flex h-40 w-32 items-center justify-center rounded-lg bg-[#F1F5F9] text-xs text-[#CBD5E1]">Sin imagen</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <label className="mb-1 block text-xs font-bold text-[#64748B]">Metadata avanzado (JSON opcional: beneficios, CTA, colores, etc.)</label>
              <textarea
                value={form.metadataText}
                onChange={(e) => setForm((f) => ({ ...f, metadataText: e.target.value }))}
                rows={4}
                placeholder='{"heroDestacado": "líquidos", "textoDark": false}'
                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-2.5 font-mono text-xs outline-none focus:border-[#27B1B8]"
              />
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
              <button onClick={closeModal} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={save} disabled={saving} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {saving ? "Guardando…" : "Guardar banner"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
