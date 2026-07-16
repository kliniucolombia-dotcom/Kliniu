"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "./cart-provider";
import WhatsAppAsesor from "./whatsapp-asesor";

type ComboProducto = {
  nombre: string;
  cantidad: number;
  imagen: string;
  precio: string;
};

type Combo = {
  id: string;
  nombre: string;
  imagen: string;
  destacado: boolean;
  items: string[];
  productos: ComboProducto[];
  precio: string;
  precioNumero: number;
  sku: string;
};

export default function ComboCarousel({ combos }: { combos: Combo[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { addItem } = useCart();
  const [lightboxCombo, setLightboxCombo] = useState<Combo | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [zoom, setZoom] = useState(1);

  const lightboxImages = lightboxCombo
    ? [lightboxCombo.imagen, ...lightboxCombo.productos.map((p) => p.imagen)]
    : [];

  const openLightbox = (combo: Combo) => {
    setLightboxCombo(combo);
    setLightboxIndex(0);
    setZoom(1);
  };
  const closeLightbox = () => setLightboxCombo(null);
  const goPrev = () => { setLightboxIndex((i) => (i - 1 + lightboxImages.length) % lightboxImages.length); setZoom(1); };
  const goNext = () => { setLightboxIndex((i) => (i + 1) % lightboxImages.length); setZoom(1); };

  useEffect(() => {
    if (!lightboxCombo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lightboxCombo, lightboxImages.length]);

  const handleAdd = (combo: Combo) =>
    addItem({
      id: combo.id,
      nombre: combo.nombre,
      precio: combo.precio,
      imagen: combo.imagen,
      sku: combo.sku,
      isCombo: true,
      comboId: combo.id,
    });

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    if (dir === "right") {
      if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        el.scrollBy({ left: 240, behavior: "smooth" });
      }
    } else {
      if (el.scrollLeft <= 4) {
        el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
      } else {
        el.scrollBy({ left: -240, behavior: "smooth" });
      }
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll("left")}
        aria-label="Anterior"
        className="absolute -left-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ‹
      </button>

      <div ref={scrollRef} className="motion-list scrollbar-hidden flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
        {combos.map((combo) => (
          <div
            key={combo.id}
            className="interactive-lift relative w-[210px] min-w-[210px] shrink-0 snap-start overflow-hidden rounded-2xl border border-black/8 bg-white"
          >
            {combo.destacado && (
              <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#f5a623] px-2.5 py-1 text-[10px] font-bold text-white">
                Más vendido
              </span>
            )}
            <button
              type="button"
              onClick={() => openLightbox(combo)}
              aria-label={`Ver imágenes de ${combo.nombre}`}
              className="flex h-36 w-full items-center justify-center bg-[#f8f8f7] p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={combo.imagen} alt={combo.nombre} className="image-lift h-full w-full object-contain" />
            </button>
            <div className="flex flex-col gap-2 p-4">
              <p className="font-semibold text-[#111]">{combo.nombre}</p>
              <ul className="space-y-1">
                {combo.items.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-[#555]">
                    <span className="mt-px text-[#27B1B8]">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-base font-bold" style={{ color: "#0C535B" }}>{combo.precio}</p>
              <button
                type="button"
                onClick={() => handleAdd(combo)}
                className="shine-sweep mt-1 w-full rounded-full bg-[#F07826] py-2 text-xs font-bold text-white transition-colors hover:bg-[#d4621a]"
              >
                Agregar al carrito
              </button>
              <Link
                href={`/combo/${combo.id}`}
                className="mt-1.5 block w-full rounded-full border border-black/10 py-2 text-center text-xs font-semibold text-[#444] transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
              >
                Ver combo
              </Link>
            </div>
          </div>
        ))}

        {/* CTA card */}
        <div className="interactive-lift relative flex w-[260px] min-w-[260px] shrink-0 snap-start flex-col items-center overflow-hidden rounded-[8px] bg-[#b9e5dc] px-8 pb-5 pt-7 text-center text-[#0C535B]">
          <div className="relative z-10">
            <p className="text-[20px] font-extrabold leading-tight text-[#0A5560]">Arma tu combo</p>
            <p className="mx-auto mt-3 max-w-[13rem] text-[14px] font-bold leading-[1.15] text-[#0A5560]">
              Te ayudamos a armar la solución perfecta para tus espacios.
            </p>
          </div>
          <div className="relative z-0 -mx-8 mt-4 px-3">
            <Image
              src="/foca-arma-tu-combo.png"
              alt="Foca Kliniu con productos para armar combo"
              width={260}
              height={174}
              className="image-lift h-auto w-full object-contain"
            />
          </div>
          <WhatsAppAsesor
            randomAsesor
            message="Hola, quiero armar un combo a la medida de mis espacios"
            className="shine-sweep relative z-10 mt-6 inline-flex rounded-full bg-[#0C535B] px-7 py-2.5 text-[14px] font-extrabold leading-none text-white transition-opacity hover:opacity-90"
          >
            Cotizar ahora
          </WhatsAppAsesor>
        </div>
      </div>

      <button
        type="button"
        onClick={() => scroll("right")}
        aria-label="Siguiente"
        className="absolute -right-4 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
      >
        ›
      </button>

      {/* Lightbox combo */}
      {lightboxCombo && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          {/* Header: nombre + precio */}
          <div className="absolute left-4 top-4 max-w-[70%] text-white">
            <p className="text-sm font-bold leading-tight">{lightboxCombo.nombre}</p>
            <p className="text-xs text-white/70">{lightboxCombo.precio}</p>
          </div>

          {/* Close */}
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

          {/* Prev */}
          {lightboxImages.length > 1 && (
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

          {/* Imagen */}
          <div
            className="mx-16 flex max-h-[70vh] max-w-[88vw] items-center justify-center overflow-hidden rounded-2xl bg-white p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightboxImages[lightboxIndex] || "/product-placeholder.png"}
              alt={`${lightboxCombo.nombre} ${lightboxIndex + 1}`}
              className="max-h-[60vh] max-w-[76vw] select-none object-contain"
              style={{ transform: `scale(${zoom})`, transition: "transform 0.15s ease" }}
              draggable={false}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
            />
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-14 right-4 flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(3, z + 0.5)); }}
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

          {/* Next */}
          {lightboxImages.length > 1 && (
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

          {/* Dots */}
          {lightboxImages.length > 1 && (
            <div className="absolute bottom-5 flex gap-2">
              {lightboxImages.map((_, i) => (
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
    </div>
  );
}
