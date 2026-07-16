"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "../../components/cart-provider";

type Producto = {
  nombre: string;
  cantidad: number;
  precio: string;
  imagen: string;
  galeria: string[];
};

type Combo = {
  id: string;
  sku: string;
  nombre: string;
  precio: string;
  imagenPrincipal: string;
};

export default function ComboDetailClient({
  combo,
  productos,
  galleryImages,
}: {
  combo: Combo;
  productos: Producto[];
  galleryImages: string[];
}) {
  const { addItem } = useCart();
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState(false);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  const [lightbox, setLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightbox(true);
    setZoom(1);
  };
  const closeLightbox = () => setLightbox(false);
  const goPrev = () => { setLightboxIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length); setZoom(1); };
  const goNext = () => { setLightboxIndex((i) => (i + 1) % galleryImages.length); setZoom(1); };

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightbox, galleryImages.length]);

  const selectMobileImage = (index: number) => {
    setActive(index);
    const scroller = mobileScrollRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: scroller.clientWidth * index, behavior: "smooth" });
  };

  const updateActiveFromScroll = () => {
    const scroller = mobileScrollRef.current;
    if (!scroller) return;
    const nextIndex = Math.round(scroller.scrollLeft / Math.max(scroller.clientWidth, 1));
    setActive(Math.min(Math.max(nextIndex, 0), galleryImages.length - 1));
  };

  const handleAdd = () => {
    addItem({
      id: combo.id,
      nombre: combo.nombre,
      precio: combo.precio,
      imagen: combo.imagenPrincipal,
      sku: combo.sku,
      isCombo: true,
      comboId: combo.id,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <main className="min-h-screen bg-white text-[#111]">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-[1440px] px-6 py-4">
        <nav className="flex items-center gap-2 text-sm text-[#6e7379]">
          <Link href="/" className="hover:text-[#27B1B8]">Inicio</Link>
          <span>›</span>
          <span className="text-[#111]">{combo.nombre}</span>
        </nav>
      </div>

      <section className="mx-auto max-w-[1440px] px-6 pb-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_480px] lg:gap-10 xl:grid-cols-[1fr_520px]">
          {/* LEFT — image gallery */}
          <div className="mx-auto w-full max-w-[360px] md:max-w-none">
            <div className="hidden gap-3 md:flex">
              <div className="flex flex-col gap-2">
                {galleryImages.map((src, i) => (
                  <button
                    key={`thumb-${i}`}
                    type="button"
                    onClick={() => setActive(i)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 transition-all ${
                      active === i ? "border-[#27B1B8]" : "border-black/8 hover:border-[#27B1B8]/40"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`${combo.nombre} ${i + 1}`}
                      className="h-full w-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => openLightbox(active)}
                className="group relative aspect-square w-full overflow-hidden rounded-2xl border border-black/8 bg-white p-6"
                aria-label="Ver imagen ampliada"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={galleryImages[active]}
                  alt={combo.nombre}
                  className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                />
              </button>
            </div>

            {/* Mobile gallery */}
            <div className="md:hidden">
              <div className="relative">
                {galleryImages.length > 1 && (
                  <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#111] shadow-sm">
                    {active + 1}/{galleryImages.length}
                  </span>
                )}
                <div
                  ref={mobileScrollRef}
                  onScroll={updateActiveFromScroll}
                  className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto scroll-smooth bg-white"
                  style={{ scrollbarWidth: "none" }}
                >
                  {galleryImages.map((src, i) => (
                    <button
                      key={`mobile-image-${i}`}
                      type="button"
                      onClick={() => openLightbox(i)}
                      className="flex min-w-full shrink-0 snap-center items-center justify-center p-4"
                      aria-label={`Ver imagen ${i + 1} ampliada`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${combo.nombre} ${i + 1}`}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                      />
                    </button>
                  ))}
                </div>
              </div>
              {galleryImages.length > 1 && (
                <div className="mt-3 flex items-center justify-center gap-2">
                  {galleryImages.map((_, i) => (
                    <button
                      key={`mobile-dot-${i}`}
                      type="button"
                      onClick={() => selectMobileImage(i)}
                      className={`h-2.5 rounded-full transition-all ${
                        active === i ? "w-2.5 bg-[#2E8BFF]" : "w-2.5 bg-black/12"
                      }`}
                      aria-label={`Imagen ${i + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — combo info */}
          <div className="space-y-4 lg:sticky lg:top-[72px] lg:self-start">
            <h1 className="text-2xl font-extrabold leading-tight text-[#111] sm:text-3xl">
              {combo.nombre}
            </h1>
            <p className="text-sm text-[#6e7379]">Código: {combo.sku}</p>
            <p className="text-3xl font-extrabold" style={{ color: "#27B1B8" }}>{combo.precio}</p>

            <div className="rounded-2xl border border-black/8 bg-[#f8f8f7] p-4">
              <p className="mb-3 text-sm font-bold text-[#0C535B]">Este combo incluye</p>
              <ul className="space-y-3">
                {productos.map((p, i) => (
                  <li key={`${p.nombre}-${i}`} className="flex items-center gap-3">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/8 bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.imagen}
                        alt={p.nombre}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-[#111]">
                        {p.cantidad}× {p.nombre}
                      </p>
                      <p className="text-xs text-[#6e7379]">{p.precio} c/u</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              className={`shine-sweep mt-2 w-full rounded-full py-3 text-sm font-bold transition-colors ${
                added ? "bg-[#d4621a] text-white" : "bg-[#F07826] text-white hover:bg-[#d4621a]"
              }`}
            >
              {added ? "✓ Agregado" : "Agregar al carrito"}
            </button>
          </div>
        </div>
      </section>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>

          {galleryImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Anterior"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          <div
            className="mx-16 flex max-h-[88vh] max-w-[88vw] items-center justify-center overflow-hidden rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={galleryImages[lightboxIndex] || "/product-placeholder.png"}
              alt={`${combo.nombre} ${lightboxIndex + 1}`}
              className="max-h-[88vh] max-w-[88vw] select-none object-contain shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
              style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease" }}
              draggable={false}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
            />
          </div>

          <div className="absolute bottom-14 right-4 flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(4, z + 0.5)); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              aria-label="Acercar"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35M11 8v6M8 11h6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(1, z - 0.5)); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              aria-label="Alejar"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35M8 11h6" />
              </svg>
            </button>
          </div>

          {galleryImages.length > 1 && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              aria-label="Siguiente"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          {galleryImages.length > 1 && (
            <div className="absolute bottom-5 flex gap-2">
              {galleryImages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); setZoom(1); }}
                  className={`h-2 w-2 rounded-full transition-all ${i === lightboxIndex ? "w-5 bg-white" : "bg-white/40"}`}
                  aria-label={`Imagen ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
