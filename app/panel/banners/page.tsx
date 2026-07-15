"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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

type Slot = {
  key: string;
  type: "CATEGORY" | "SITE";
  tab: "home" | "categorias" | "outlet" | "otras";
  group: string;
  label: string;
  preview: "hero" | "wide" | "card";
  fallbackDesktop?: string;
  fallbackMobile?: string;
  mobileFixed?: boolean;
};

const FIXED_SLOTS: Slot[] = [
  { key: "home_hero_slide_1", type: "SITE", tab: "home", group: "Carrusel principal", label: "Hero Banner 1", preview: "hero" },
  { key: "home_hero_slide_2", type: "SITE", tab: "home", group: "Carrusel principal", label: "Hero Banner 2", preview: "hero" },
  { key: "home_hero_slide_3", type: "SITE", tab: "home", group: "Carrusel principal", label: "Hero Banner 3", preview: "hero" },
  { key: "home_banner_features", type: "SITE", tab: "home", group: "Banners estáticos", label: "Franja beneficios", preview: "wide", fallbackDesktop: "/banners-web/BANNER-FINALES-12.png", fallbackMobile: "/banners-responsive/BANNER-FINALES-34.png" },
  { key: "home_banner_asesoria", type: "SITE", tab: "home", group: "Banners estáticos", label: "Habla con un asesor", preview: "wide", fallbackDesktop: "/banners-web/BANNER-FINALES-13.png", fallbackMobile: "/banners-responsive/BANNER-FINALES-32.png" },
  { key: "home_banner_insumos", type: "SITE", tab: "home", group: "Banners estáticos", label: "Insumos/Repuestos", preview: "wide", fallbackDesktop: "/banners-web/BANNER-FINALES-14.png", fallbackMobile: "/banners-responsive/BANNER-FINALES-33.png" },
  { key: "asesor_banner", type: "SITE", tab: "categorias", group: "Banners estáticos", label: "¿Necesitas ayuda para elegir?", preview: "wide", fallbackDesktop: "/banners-web/BANNER-FINALES-20.png", mobileFixed: true },
  { key: "outlet_hero", type: "SITE", tab: "outlet", group: "Banners estáticos", label: "Hero tienda Outlet", preview: "wide", fallbackDesktop: "/banner-outlet.jpg", fallbackMobile: "/banners-responsive/oulet%20movil.jpg" },
  { key: "outlet_super_ofertas", type: "SITE", tab: "outlet", group: "Banners estáticos", label: "Banner Super Ofertas", preview: "wide", fallbackDesktop: "/outlet/banner-super-ofertas.jpg" },
  { key: "nosotros_hero", type: "SITE", tab: "otras", group: "Otras páginas", label: "Nosotros", preview: "wide", fallbackDesktop: "/banner-foto-nosotros.png", mobileFixed: true },
  { key: "contacto_hero", type: "SITE", tab: "otras", group: "Otras páginas", label: "Contacto", preview: "wide", fallbackDesktop: "/banners-web/BANNER-FINALES-09.png", fallbackMobile: "/banners-responsive/BANNER-FINALES-30.png" },
  { key: "puntos_hero", type: "SITE", tab: "otras", group: "Otras páginas", label: "Puntos K", preview: "wide", fallbackDesktop: "/puntos-k-banner.jpg" },
];

const CATEGORY_SLOTS: Slot[] = categoriasData
  .filter((c) => c.nombre !== "Outlet")
  .map((c) => ({
    key: `categoria_${c.nombre}`,
    type: "CATEGORY" as const,
    tab: "categorias" as const,
    group: "Categorías",
    label: c.nombre,
    preview: "card" as const,
    fallbackDesktop: c.heroBannerImagen ?? c.bannerImagen,
    fallbackMobile: c.heroBannerMovil,
  }));

const ALL_SLOTS = [...FIXED_SLOTS, ...CATEGORY_SLOTS];

const DIMS: Record<Slot["preview"], { desktop: string; mobile: string }> = {
  hero: { desktop: "1680×480 px", mobile: "800×1000 px" },
  wide: { desktop: "1200×400 px", mobile: "800×800 px" },
  card: { desktop: "800×1000 px", mobile: "800×1000 px" },
};

function UploadIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

export default function BannersPanel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"home" | "categorias" | "outlet" | "otras">("home");
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [pending, setPending] = useState<{ slot: Slot; file: File; previewUrl: string } | null>(null);
  const [alert, setAlert] = useState<{ type: "ok" | "err"; msg: string } | null>(null);
  const router = useRouter();
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch("/api/panel/banners");
    if (r.status === 401 || r.status === 403) { router.push("/login"); return; }
    const data = await r.json();
    setBanners(data);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const bannerByKey = useMemo(() => {
    const map = new Map<string, Banner>();
    banners.forEach((b) => map.set(b.key, b));
    return map;
  }, [banners]);

  const extraSlots: Slot[] = useMemo(() => {
    const known = new Set(ALL_SLOTS.map((s) => s.key));
    const unused = new Set(["categoria_Outlet"]);
    return banners
      .filter((b) => !known.has(b.key) && !unused.has(b.key))
      .map((b) => ({ key: b.key, type: b.type as "CATEGORY" | "SITE", tab: "home" as const, group: "Otros", label: b.key, preview: "wide" as const }));
  }, [banners]);

  const slotsForTab = [...ALL_SLOTS, ...extraSlots].filter((s) => s.tab === tab);
  const groups = Array.from(new Set(slotsForTab.map((s) => s.group)));

  const pickFile = (slot: Slot, file: File) => {
    setAlert(null);
    setPending({ slot, file, previewUrl: URL.createObjectURL(file) });
  };

  const cancelPending = () => {
    if (pending) URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  };

  const confirmUpload = async () => {
    if (!pending) return;
    const { slot, file } = pending;
    setUploadingKey(slot.key);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("productName", `banner-${slot.key}`);
    const up = await fetch("/api/uploads", { method: "POST", body: fd });
    if (!up.ok) {
      setUploadingKey(null);
      const d = await up.json();
      setAlert({ type: "err", msg: d.error ?? "Error al subir imagen" });
      return;
    }
    const { publicUrl } = (await up.json()) as { publicUrl: string };
    const existing = bannerByKey.get(slot.key);
    const r = await fetch("/api/panel/banners", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: slot.key,
        type: slot.type,
        title1: existing?.title1 ?? undefined,
        title2: existing?.title2 ?? undefined,
        link: existing?.link ?? undefined,
        metadata: existing?.metadata ?? undefined,
        active: existing?.active ?? true,
        order: existing?.order ?? 0,
        desktopImage: view === "desktop" ? publicUrl : existing?.desktopImage ?? undefined,
        mobileImage: view === "mobile" ? publicUrl : existing?.mobileImage ?? undefined,
      }),
    });
    setUploadingKey(null);
    URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
    if (r.ok) {
      setAlert({ type: "ok", msg: "Imagen actualizada" });
      load();
    } else {
      const d = await r.json();
      setAlert({ type: "err", msg: d.error ?? "Error al guardar" });
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#94A3B8]">Panel maestro</p>
        <h1 className="mt-1 text-2xl font-black text-[#1A1A1A]">Gestión de imágenes</h1>
        <p className="mt-1 text-sm text-[#64748B]">Sube o reemplaza imágenes del sitio. JPG · PNG · WEBP · máx. 5 MB.</p>
      </div>

      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setView("desktop")}
          className={`rounded-xl px-4 py-2 text-xs font-bold ${view === "desktop" ? "bg-[#1A1A1A] text-white" : "border border-[#E2E8F0] text-[#64748B]"}`}
        >
          🖥️ Escritorio
        </button>
        <button
          onClick={() => setView("mobile")}
          className={`rounded-xl px-4 py-2 text-xs font-bold ${view === "mobile" ? "bg-[#1A1A1A] text-white" : "border border-[#E2E8F0] text-[#64748B]"}`}
        >
          📱 Responsive
        </button>
      </div>

      <div className="mb-6 flex gap-4 border-b border-[#E2E8F0]">
        {([["home", "Home"], ["categorias", "Categorías"], ["outlet", "Outlet"], ["otras", "Otras páginas"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-1 pb-2 text-sm font-bold ${tab === key ? "border-[#27B1B8] text-[#1A1A1A]" : "border-transparent text-[#94A3B8]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {alert && (
        <div className={`mb-4 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
          {alert.msg}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-[#94A3B8]">Cargando…</div>
      ) : (
        groups.map((group) => (
          <div key={group} className="mb-8">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-[#94A3B8]">{group}</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {slotsForTab.filter((s) => s.group === group).map((slot) => {
                const banner = bannerByKey.get(slot.key);
                const mobileLocked = view === "mobile" && slot.mobileFixed;
                const img = view === "desktop"
                  ? banner?.desktopImage ?? slot.fallbackDesktop
                  : banner?.mobileImage ?? slot.fallbackMobile ?? banner?.desktopImage ?? slot.fallbackDesktop;
                const isUploading = uploadingKey === slot.key;
                return (
                  <div key={slot.key} className="rounded-2xl border border-[#E2E8F0] bg-white p-3">
                    <div className="mb-2 flex h-32 items-center justify-center overflow-hidden rounded-xl bg-[#F1F5F9] px-3 text-center">
                      {mobileLocked ? (
                        <span className="text-xs text-[#94A3B8]">Diseño fijo en móvil, no editable</span>
                      ) : img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt={slot.label} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-xs text-[#CBD5E1]">Sin imagen</span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-[#1A1A1A]">{slot.label}</p>
                    <p className="mb-2 text-[10px] font-semibold text-[#94A3B8]">Medida: {view === "desktop" ? DIMS[slot.preview].desktop : DIMS[slot.preview].mobile}</p>
                    <input
                      ref={(el) => { fileInputs.current[slot.key] = el; }}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(slot, f); e.target.value = ""; }}
                    />
                    <button
                      onClick={() => fileInputs.current[slot.key]?.click()}
                      disabled={isUploading || mobileLocked}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#27B1B8] px-3 py-2 text-xs font-bold text-white hover:opacity-80 disabled:opacity-50"
                    >
                      {mobileLocked ? "No editable" : isUploading ? "Subiendo…" : (<><UploadIcon /> Cambiar</>)}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {pending && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="font-black text-[#1A1A1A]">Vista previa: {pending.slot.label}</h3>
              <button onClick={cancelPending} className="text-[#94A3B8] hover:text-[#1A1A1A]">✕</button>
            </div>

            <p className="mb-3 text-xs text-[#64748B]">Así se vería en la página ({view === "desktop" ? "escritorio" : "celular"}):</p>

            {pending.slot.preview === "hero" && (
              <div className="relative overflow-hidden rounded-xl bg-[#0F172A]" style={{ aspectRatio: view === "desktop" ? "21/6" : "4/5" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pending.previewUrl} alt="preview" className="h-full w-full object-cover opacity-90" />
                <div className="absolute bottom-0 left-0 p-4">
                  <div className="h-2.5 w-24 rounded bg-white/80" />
                  <div className="mt-1.5 h-2.5 w-32 rounded bg-white/50" />
                </div>
              </div>
            )}

            {pending.slot.preview === "wide" && (
              <div className="overflow-hidden rounded-xl" style={{ aspectRatio: view === "desktop" ? "3/1" : "1/1" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pending.previewUrl} alt="preview" className="h-full w-full object-cover" />
              </div>
            )}

            {pending.slot.preview === "card" && (
              <div className="mx-auto w-1/2 overflow-hidden rounded-xl" style={{ aspectRatio: "4/5" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pending.previewUrl} alt="preview" className="h-full w-full object-cover" />
              </div>
            )}

            {alert && (
              <div className={`mt-3 rounded-xl px-3 py-2 text-xs font-semibold ${alert.type === "ok" ? "bg-[#DCFCE7] text-[#16A34A]" : "bg-[#FEE2E2] text-[#DC2626]"}`}>
                {alert.msg}
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button onClick={cancelPending} className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-bold text-[#64748B] hover:bg-[#F8FAFC]">
                Cancelar
              </button>
              <button onClick={confirmUpload} disabled={uploadingKey === pending.slot.key} className="flex-1 rounded-xl bg-[#27B1B8] py-2.5 text-sm font-bold text-white hover:opacity-80 disabled:opacity-50">
                {uploadingKey === pending.slot.key ? "Subiendo…" : "Confirmar y subir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
