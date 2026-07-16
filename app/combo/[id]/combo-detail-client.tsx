"use client";

import { useRef, useState } from "react";
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

              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-black/8 bg-white p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={galleryImages[active]}
                  alt={combo.nombre}
                  className="h-full w-full object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                />
              </div>
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
                    <div
                      key={`mobile-image-${i}`}
                      className="flex min-w-full shrink-0 snap-center items-center justify-center p-4"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={src}
                        alt={`${combo.nombre} ${i + 1}`}
                        className="h-full w-full object-contain"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                      />
                    </div>
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
    </main>
  );
}
