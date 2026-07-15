"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import WhatsAppAsesor from "../../components/whatsapp-asesor";
import AsesorBanner from "../../components/asesor-banner";
import { useParams } from "next/navigation";
import { useCart } from "../../components/cart-provider";
import { useProducts } from "../../components/products-provider";
import SiteFooter from "../../components/site-footer";
import QuoteModal from "../../components/quote-modal";
import ProductosCarousel from "../../components/productos-carousel";
import { getVolumePricing, TIPO_VARIANTES, INSUMO_PACK_TIERS_BY_SKU, NO_PACK_SKUS } from "@/lib/volume-discounts";
import type { ProductoEspecificacion } from "../../data/catalog";

const esInox = (nombre: string, categoria: string, descripcion?: string) =>
  /inoxidable/i.test(nombre) || /inoxidable/i.test(categoria) || /inoxidable/i.test(descripcion ?? "");

const trustBadges = [
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 5v3h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    label: "Envío",
    sub: "a todo Colombia",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    label: "Garantía",
    sub: "2 años",
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-5"/>
      </svg>
    ),
    label: "Devoluciones",
    sub: "Fáciles",
  },
];

const trustBar = [
  {
    label: "+100 empresas confían de KLINIU",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    label: "Productos diseñados para durar",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
      </svg>
    ),
  },
  {
    label: "Higiene garantizada en cada uso",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
  {
    label: "Soporte y asesoría especializada",
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 18v-6a9 9 0 0118 0v6"/>
        <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
      </svg>
    ),
  },
];


function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function ImageGallery({ nombre, images, videoUrl }: { nombre: string; images: string[]; videoUrl?: string }) {
  const videoId = videoUrl ? getYouTubeId(videoUrl) : null;
  const [active, setActive] = useState(0);
  const [videoActive, setVideoActive] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement | null>(null);

  // Zoom state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  const resetZoom = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightbox(true);
    resetZoom();
  };

  const closeLightbox = () => { setLightbox(false); resetZoom(); };

  const goPrev = () => { setLightboxIndex((i) => (i - 1 + images.length) % images.length); resetZoom(); };
  const goNext = () => { setLightboxIndex((i) => (i + 1) % images.length); resetZoom(); };

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
    setActive(Math.min(Math.max(nextIndex, 0), images.length - 1));
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.min(4, Math.max(1, z - e.deltaY * 0.002)));
    if (zoom <= 1) setPan({ x: 0, y: 0 });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    });
  };

  const onMouseUp = () => { dragging.current = false; };

  const onDblClick = () => {
    if (zoom > 1) { resetZoom(); } else { setZoom(2.5); }
  };

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
  }, [lightbox, images.length]);

  return (
    <>
      <div className="mx-auto w-full max-w-[360px] md:max-w-none">
        <div className="md:hidden">
          <div className="relative">
            {images.length > 1 && (
              <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#111] shadow-sm">
                {active + 1}/{images.length}
              </span>
            )}
            <div
              ref={mobileScrollRef}
              onScroll={updateActiveFromScroll}
              className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto scroll-smooth rounded-none bg-white"
              style={{ scrollbarWidth: "none" }}
            >
              {images.map((src, i) => (
                <button
                  key={`mobile-image-${i}`}
                  type="button"
                  onClick={() => openLightbox(i)}
                  className="group relative flex min-w-full snap-center items-center justify-center p-4"
                  aria-label={`Ver imagen ${i + 1} ampliada`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src || "/product-placeholder.png"}
                    alt={`${nombre} ${i + 1}`}
                    className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                  />
                </button>
              ))}
            </div>
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex items-center justify-center gap-2">
              {images.map((_, i) => (
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
          {videoId && (
            <div className="mt-4 aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                title="Video del producto"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          )}
        </div>

        <div className="hidden gap-3 md:flex">
        {/* Thumbnail strip */}
        <div className="hidden flex-col gap-2 md:flex">
          {images.map((src, i) => (
            <button
              key={`thumb-${i}`}
              type="button"
              onClick={() => { setActive(i); setVideoActive(false); }}
              className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 transition-all ${
                active === i && !videoActive ? "border-[#27B1B8]" : "border-black/8 hover:border-[#27B1B8]/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${nombre} ${i + 1}`}
                className="h-full w-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
              />
            </button>
          ))}
          {videoId && (
            <button
              type="button"
              onClick={() => setVideoActive(true)}
              aria-label="Ver video del producto"
              className={`relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-black transition-all ${
                videoActive ? "border-[#27B1B8]" : "border-black/8 hover:border-[#27B1B8]/40"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                alt="Video del producto"
                className="h-full w-full object-cover opacity-80"
              />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[#111]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </span>
            </button>
          )}
        </div>

        {/* Main image — click to open lightbox */}
        {videoActive && videoId ? (
          <div className="aspect-square w-full overflow-hidden rounded-none bg-black md:rounded-2xl md:border md:border-black/8">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title="Video del producto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        ) : (
        <button
          type="button"
          onClick={() => openLightbox(active)}
          className="group relative aspect-square w-full overflow-hidden rounded-none border-0 bg-white p-4 text-left md:rounded-2xl md:border md:border-black/8 md:p-6"
          aria-label="Ver imagen ampliada"
        >
          {images.length > 1 && (
            <span className="absolute left-3 top-3 z-10 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-[#111] shadow-sm md:hidden">
              {active + 1}/{images.length}
            </span>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[active] || "/product-placeholder.png"}
            alt={nombre}
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
          />
          {/* Zoom hint */}
          <span className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
            </svg>
          </span>
        </button>
        )}
        </div>

      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm"
          onClick={closeLightbox}
        >
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
          {images.length > 1 && (
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

          {/* Image + zoom container */}
          <div
            className="mx-16 flex max-h-[88vh] max-w-[88vw] items-center justify-center overflow-hidden rounded-2xl"
            style={{ cursor: zoom > 1 ? "grab" : "zoom-in" }}
            onClick={(e) => e.stopPropagation()}
            onWheel={onWheel}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onDoubleClick={onDblClick}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[lightboxIndex] || "/product-placeholder.png"}
              alt={`${nombre} ${lightboxIndex + 1}`}
              className="max-h-[88vh] max-w-[88vw] select-none object-contain shadow-[0_32px_80px_rgba(0,0,0,0.5)]"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transition: dragging.current ? "none" : "transform 0.15s ease",
              }}
              draggable={false}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
            />
          </div>

          {/* Zoom hint + reset */}
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
              onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(1, z - 0.5)); if (zoom <= 1.5) resetZoom(); }}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25"
              aria-label="Alejar"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35M8 11h6" />
              </svg>
            </button>
            {zoom > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); resetZoom(); }}
                className="mt-1 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:bg-white/25"
              >
                Reset
              </button>
            )}
          </div>

          {/* Next */}
          {images.length > 1 && (
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
          {images.length > 1 && (
            <div className="absolute bottom-5 flex gap-2">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(i); }}
                  className={`h-2 w-2 rounded-full transition-all ${i === lightboxIndex ? "w-5 bg-white" : "bg-white/40"}`}
                  aria-label={`Imagen ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function ProductoDetallePage() {
  const params = useParams<{ slug: string }>();
  const { products } = useProducts();
  const { addItem } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [esUnidad, setEsUnidad] = useState(true);
  const [showComboTip, setShowComboTip] = useState(false);
  const [sinSello, setSinSello] = useState(false);
  const [colorActivo, setColorActivo] = useState(0);
  const [tipoActivo, setTipoActivo] = useState(0);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [agregado, setAgregado] = useState(false);
  const agregadoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const comboTipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ajustarUnidad = (delta: number) => {
    const next = Math.max(1, cantidad + delta);
    setCantidad(next);
    // Mostrar popup solo al cruzar el umbral subiendo
    if (next >= 12 && cantidad < 12 && delta > 0) {
      mostrarTipsCombo();
    }
  };

  const mostrarTipsCombo = () => {
    setShowComboTip(true);
    if (comboTipTimeout.current) clearTimeout(comboTipTimeout.current);
    comboTipTimeout.current = setTimeout(() => setShowComboTip(false), 12000);
  };

  const slug = params.slug;
  const producto = products.find((p) => p.slug === slug);

  const tiposVariantes = producto ? TIPO_VARIANTES[producto.slug] : undefined;
  const tipoVarianteActiva = tiposVariantes?.[tipoActivo];

  const variacionesColor = producto?.variacionesColor ?? [];

  // Prepend the base product image as "Blanco" cuando faltan colores y ninguna variante trae SKU propio
  // (productos con SKU por color ya declaran todos sus colores reales explícitamente, no hay "Blanco" implícito que rellenar)
  const allVariants = useMemo(() => {
    if (!producto || variacionesColor.length === 0) return [];
    const hasBlanco = variacionesColor.some((v) => v.label.toLowerCase() === "blanco");
    const hasSku = variacionesColor.some((v) => v.sku);
    return hasBlanco || hasSku
      ? variacionesColor
      : [{ color: "#ffffff", label: "Blanco", image: producto.imagen, images: [producto.imagen] }, ...variacionesColor];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto]);

  const colorVarianteActiva = allVariants[colorActivo];

  // Código sin sello / con sello: prioriza el de la variante de tipo (ej. Xpert
  // Bolsa/Botella) o de color (ej. Antigoteo Blanco/Negro) sobre el del producto base.
  const codigoSinSello = tipoVarianteActiva?.sku ?? colorVarianteActiva?.sku ?? producto?.sku;
  const codigoConSello = tipoVarianteActiva?.skuSello ?? colorVarianteActiva?.skuSello ?? producto?.referenciasAlternas?.[0];
  const codigoMostrado = sinSello || !codigoConSello ? codigoSinSello : codigoConSello;

  const effectiveSlug = tiposVariantes
    ? `${slug}${tiposVariantes[tipoActivo].slugSuffix}`
    : slug;
  const varianteSuffix = tiposVariantes?.[tipoActivo]?.slugSuffix ?? "";
  const preciosBase = varianteSuffix === "" ? producto?.preciosPorCantidad : undefined;

  const handleAddToCart = () => {
    if (!producto || producto.puedeComprar === false) return;
    const pricing = getVolumePricing(producto.precio, cantidad, effectiveSlug, preciosBase, producto.sku);
    const varianteActiva = allVariants[colorActivo];
    const imagenSeleccionada = varianteActiva?.images?.[0] ?? varianteActiva?.image ?? producto.imagen;
    const colorLabel = allVariants.length > 0 ? varianteActiva?.label : undefined;
    const tipoLabel = tiposVariantes ? tiposVariantes[tipoActivo].label : undefined;
    const itemId = [producto.slug, varianteActiva?.color, tipoLabel].filter(Boolean).join("--");
    addItem({
      id: itemId,
      nombre: producto.nombre,
      precio: pricing.unitPriceLabel,
      precioOriginal: pricing.hasDiscount ? producto.precio : undefined,
      imagen: imagenSeleccionada,
      cantidad,
      colorLabel,
      tipoLabel,
      sku: codigoMostrado,
    });
    setAgregado(true);
    if (agregadoTimeout.current) clearTimeout(agregadoTimeout.current);
    agregadoTimeout.current = setTimeout(() => setAgregado(false), 1200);
  };

  const galleryImages = useMemo(() => {
    if (!producto) return [];
    const tipoImage = tiposVariantes?.[tipoActivo]?.image;
    if (allVariants.length > 0) {
      const varianteSeleccionada = allVariants[colorActivo];
      // Si el color tiene sus propias fotos (2+), la galería muestra solo esas
      if (varianteSeleccionada?.images && varianteSeleccionada.images.length > 1) {
        return [...varianteSeleccionada.images, tipoImage]
          .filter((x): x is string => Boolean(x))
          .filter((x, i, arr) => arr.indexOf(x) === i);
      }
      // Si no, comportamiento clásico: imagen del color + otras variantes + extras del producto
      const selected = varianteSeleccionada?.images?.[0] ?? varianteSeleccionada?.image ?? producto.imagen;
      const others = allVariants.filter((_, i) => i !== colorActivo).map((v) => v.image);
      const extras = (producto.imagenesExtra || []).filter((img) => img !== tipoImage);
      // La imagen del color seleccionado va primero para que tocar una variante cambie la imagen principal
      return [selected, tipoImage, ...others, ...extras]
        .filter((x): x is string => Boolean(x))
        .filter((x, i, arr) => arr.indexOf(x) === i);
    }
    const extras = (producto.imagenesExtra || []).filter((img) => img !== tipoImage);
    return [tipoImage, producto.imagen, ...extras].filter((x): x is string => Boolean(x));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto, colorActivo, allVariants, tipoActivo, tiposVariantes]);

  if (!producto) {
    return (
      <main className="min-h-screen bg-white text-[#111]">
        <section className="mx-auto max-w-[960px] px-6 py-24 text-center">
          <h1 className="text-3xl font-bold text-[#111]">Producto no encontrado</h1>
          <p className="mt-3 text-[#6e7379]">Este producto ya no existe o no está disponible.</p>
          <Link
            href="/categorias"
            className="mt-8 inline-flex rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-bold text-white hover:bg-[#1E969B]"
          >
            Ver catálogo
          </Link>
        </section>
      </main>
    );
  }

  const relacionados = products
    .filter((p) => p.categoria === producto.categoria && p.slug !== producto.slug)
    .slice(0, 4);
  const volumePricing = getVolumePricing(producto.precio, cantidad, effectiveSlug, preciosBase, producto.sku);

  const fichaTecnica: ProductoEspecificacion[] =
    producto.especificacionesTecnicas?.length
      ? producto.especificacionesTecnicas
      : [
          { etiqueta: "Categoría", valor: producto.categoria },
          { etiqueta: "Marca", valor: producto.marca },
          { etiqueta: "Disponibilidad", valor: producto.disponibilidad },
          { etiqueta: "Garantía", valor: producto.garantia || "1 año del fabricante" },
          { etiqueta: "Aplicación", valor: producto.aplicacion || "Higiene profesional" },
        ];

  const categoriaSlug = producto.categoria
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return (
    <main className="min-h-screen bg-white text-[#111]">

      {/* Modal popup combo */}
      {showComboTip && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4" onClick={() => setShowComboTip(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-[min(92vw,420px)] overflow-hidden rounded-3xl bg-white shadow-[0_24px_64px_rgba(0,0,0,0.28)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Foca */}
            <div className="flex justify-center bg-[#f0fafa] pt-6 pb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/foca-arma-tu-combo.png" alt="Foca Kliniu" className="h-36 w-auto object-contain" />
            </div>

            {/* Contenido */}
            <div className="px-7 pb-7 pt-4 text-center">
              <p className="text-xl font-black text-[#111]">¡Te sale más barato en combo!</p>
              <p className="mt-2 text-sm text-[#6e7379]">
                Selecciona <strong className="text-[#F07826]">× 12 und</strong> o más y ahorra hasta un{" "}
                <strong className="text-[#F07826]">10%</strong> en tu compra.
              </p>
              <button
                type="button"
                onClick={() => setShowComboTip(false)}
                className="mt-5 w-full rounded-full bg-[#27B1B8] py-3 text-sm font-bold text-white transition-colors hover:bg-[#1e9aa0]"
              >
                ¡Entendido!
              </button>
            </div>

            {/* Cerrar */}
            <button
              type="button"
              onClick={() => setShowComboTip(false)}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-black/10 text-[#111] hover:bg-black/20"
            >
              ✕
            </button>
          </div>
        </div>
      )}


      {/* Breadcrumb */}
      <div className="mx-auto max-w-[1440px] px-6 py-4">
        <nav className="flex items-center gap-2 text-sm text-[#6e7379]">
          <Link href="/" className="hover:text-[#27B1B8]">Inicio</Link>
          <span>›</span>
          <Link href="/categorias" className="hover:text-[#27B1B8]">Categorías</Link>
          <span>›</span>
          <Link href={`/categorias?categoria=${categoriaSlug}`} className="hover:text-[#27B1B8]">
            {producto.categoria}
          </Link>
          <span>›</span>
          <span className="text-[#111]">{producto.nombre}</span>
        </nav>
      </div>

      {/* ── Main product section ── */}
      <section className="mx-auto max-w-[1440px] px-6 pb-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_480px] lg:gap-10 xl:grid-cols-[1fr_520px]">

          {/* LEFT — image gallery */}
          <ImageGallery key={`${colorActivo}-${tipoActivo}`} nombre={producto.nombre} images={galleryImages} videoUrl={producto.videoUrl} />

          {/* RIGHT — product info */}
          <div className="space-y-4 lg:sticky lg:top-[72px] lg:self-start">
            {/* Badge */}
            {producto.destacado && (
              <span className="inline-block rounded-lg bg-[#073F43] px-3 py-1 text-xs font-bold text-white">
                Más vendido
              </span>
            )}

            {/* Name + SKU */}
            <div>
              <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-[#111] md:text-[26px]">
                {producto.nombre}
                {esInox(producto.nombre, producto.categoria, producto.descripcion) && (
                  <span className="text-[#555]"> · Inox 304</span>
                )}
              </h1>
              {codigoMostrado && (
                <p className="mt-1.5 text-xs text-[#6e7379]">
                  Código: <span className="font-medium text-[#444]">{codigoMostrado}</span>
                  {codigoConSello && (
                    <span className="ml-1 text-[#9aa0a6]">
                      ({sinSello ? "sin sello" : "con sello"})
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Price */}
            <div>
              <p className="text-3xl font-extrabold text-[#27B1B8]">
                {(volumePricing.hasDiscount || varianteSuffix !== "") ? volumePricing.unitPriceLabel : producto.precio}
                {volumePricing.hasDiscount && <span className="ml-1 text-base font-semibold text-[#27B1B8]/70">c/u</span>}
              </p>
              {volumePricing.hasDiscount && (
                <p className="mt-0.5 text-sm text-[#aaa] line-through">{producto.precio}</p>
              )}
              {!volumePricing.hasDiscount && producto.precioAnterior && (
                <p className="mt-1 text-sm text-[#aaa] line-through">{producto.precioAnterior}</p>
              )}
            </div>

            {/* Color */}
            {allVariants.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-[#333]">
                  Colores disponibles: <span className="font-normal text-[#555]">{allVariants[colorActivo]?.label}</span>
                </p>
                <div className="flex flex-wrap gap-1">
                  {allVariants.map((v, i) => (
                    <button
                      key={v.color}
                      type="button"
                      onClick={() => setColorActivo(i)}
                      aria-label={v.label}
                      aria-pressed={colorActivo === i}
                      title={v.label}
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                        colorActivo === i ? "bg-[#27B1B8]/10" : "hover:bg-black/5"
                      }`}
                    >
                      <span
                        className={`block h-9 w-9 rounded-full border-2 shadow-sm transition-all ${
                          colorActivo === i ? "ring-2 ring-[#27B1B8] ring-offset-2" : ""
                        }`}
                        style={{
                          background: v.color,
                          borderColor: v.color === "#ffffff" || v.color === "#fff" || v.color.toLowerCase() === "white"
                            ? "rgba(0,0,0,0.15)"
                            : "rgba(0,0,0,0.08)",
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tipo (Bolsa / Frasco) */}
            {tiposVariantes && tiposVariantes.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-[#333]">
                  Presentación: <span className="font-normal text-[#555]">{tiposVariantes[tipoActivo].label}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {tiposVariantes.map((tipo, i) => (
                    <button
                      key={tipo.label}
                      type="button"
                      onClick={() => setTipoActivo(i)}
                      className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
                        tipoActivo === i
                          ? "border-[#27B1B8] bg-[#27B1B8] text-white shadow-sm"
                          : "border-black/12 bg-white text-[#444] hover:border-[#27B1B8]/60 hover:text-[#27B1B8]"
                      }`}
                    >
                      {tipo.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + CTA */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#333]">Cantidad</p>

              {/* Pack selector */}
              <div className="flex flex-wrap gap-2">
                {/* Unidad */}
                <button
                  type="button"
                  onClick={() => { setEsUnidad(true); setCantidad(1); setShowComboTip(false); }}
                  className={`relative rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 ${
                    esUnidad
                      ? "border-[#F07826] bg-[#F07826] text-white shadow-sm"
                      : "border-black/12 bg-white text-[#444] hover:border-[#F07826]/60 hover:text-[#F07826]"
                  }`}
                >
                  Unidad
                </button>

                {/* Packs fijos */}
                {(INSUMO_PACK_TIERS_BY_SKU[producto.sku ?? ""]?.map((p) => ({ label: p.label, qty: p.qty })) ?? (NO_PACK_SKUS.has(producto.sku ?? "") ? [] : [
                  { label: "× 12 und", qty: 12 },
                  { label: "× 48 und", qty: 48 },
                  { label: "× 100 und", qty: 100 },
                ])).map((pack) => {
                  const isActive = !esUnidad && cantidad === pack.qty;
                  return (
                    <button
                      key={pack.qty}
                      type="button"
                      onClick={() => {
                        setEsUnidad(false);
                        setCantidad(pack.qty);
                        setShowComboTip(false);
                      }}
                      className={`relative rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-150 ${
                        isActive
                          ? "border-[#F07826] bg-[#F07826] text-white shadow-sm"
                          : "border-black/12 bg-white text-[#444] hover:border-[#F07826]/60 hover:text-[#F07826]"
                      }`}
                    >
                      {pack.label}
                    </button>
                  );
                })}
              </div>

              {/* Contador +/- solo en modo Unidad */}
              {esUnidad && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center overflow-hidden rounded-xl border border-black/12">
                    <button type="button" onClick={() => ajustarUnidad(-1)} className="px-4 py-2 text-lg font-medium text-[#333] hover:bg-[#f5f5f5]">−</button>
                    <span className="min-w-[2.5rem] border-x border-black/10 px-3 py-2 text-center text-base font-semibold">{cantidad}</span>
                    <button type="button" onClick={() => ajustarUnidad(1)} className="px-4 py-2 text-lg font-medium text-[#333] hover:bg-[#f5f5f5]">+</button>
                  </div>
                </div>
              )}


              {/* Toggle sin tampografía (predeterminado: con tampografía) */}
              {codigoConSello && (
                <button
                  type="button"
                  onClick={() => setSinSello(!sinSello)}
                  className="w-fit text-sm font-semibold text-[#333] hover:text-[#27B1B8]"
                >
                  {sinSello ? "Volver a con tampografía" : "Sin tampografía"}
                </button>
              )}

              {/* Resumen de precio */}
              {volumePricing.hasDiscount && (
                <div className="flex items-center gap-2 rounded-xl bg-[#FFF3E8] px-3 py-2">
                  <span className="text-sm font-bold text-[#F07826]">{volumePricing.tier.pct}% OFF</span>
                  <span className="text-xs text-[#6e7379]">·</span>
                  <span className="text-xs font-semibold text-[#111]">Total {volumePricing.totalLabel}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={producto.puedeComprar === false}
                  onClick={handleAddToCart}
                  className="flex min-h-[50px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-center text-[13px] font-semibold leading-tight transition-colors sm:text-sm"
                  style={
                    producto.puedeComprar === false
                      ? { background: "#f2f2f1", color: "#6b7280", cursor: "not-allowed", border: "1px solid rgba(0,0,0,0.1)" }
                      : agregado
                      ? { background: "#d4621a", color: "#fff", border: "1px solid #d4621a" }
                      : { background: "#F07826", color: "#fff", border: "1px solid #F07826" }
                  }
                >
                  {producto.puedeComprar === false ? (
                    "Sin stock"
                  ) : agregado ? (
                    <>
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                      Agregado
                    </>
                  ) : (
                    <>
                      Agregar al carrito
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={producto.puedeComprar === false}
                  onClick={() => setQuoteOpen(true)}
                  className="flex min-h-[50px] items-center justify-center gap-2 rounded-full px-4 py-2.5 text-center text-[13px] font-bold leading-tight text-white transition-opacity hover:opacity-90 sm:text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: "#1a1a2e" }}
                >
                  Cotiza ahora
                </button>
              </div>
              {producto.categoria === "Hoteles y Restaurantes" && (
                <WhatsAppAsesor
                  message={`Hola, quiero personalizar mi compra de "${producto.nombre}" (tampografía / logo de mi empresa)`}
                  className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-full border border-[#25D366] px-4 py-2.5 text-center text-[13px] font-bold leading-tight text-[#128C7E] transition-colors hover:bg-[#25D366]/10 sm:text-sm"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M20.5 3.5A11.8 11.8 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.5 4.1 1.6 5.9L0 24l6.3-1.6c1.7.9 3.7 1.4 5.7 1.4 6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.7 9.7 0 0 1 2.2 12c0-5.4 4.4-9.8 9.8-9.8 2.6 0 5.1 1 6.9 2.9a9.7 9.7 0 0 1 2.9 6.9c0 5.4-4.4 9.8-9.8 9.8zm5.4-7.3c-.3-.1-1.7-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.1-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.5-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5 0-.1-.7-1.7-1-2.3-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1.1 2.8 1.2 3c.1.2 2.2 3.4 5.4 4.7.7.3 1.3.5 1.8.7.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/></svg>
                  Personaliza tu compra
                </WhatsAppAsesor>
              )}
            </div>

            {/* Trust badges — horizontal row */}
            <div className="flex divide-x divide-black/8 overflow-hidden rounded-2xl border border-black/8 bg-[#f8fafa]">
              {trustBadges.map((b) => (
                <div key={b.label} className="flex flex-1 items-center gap-2.5 px-4 py-3">
                  <span className="shrink-0 text-[#27B1B8]">{b.icon}</span>
                  <div>
                    <p className="text-[11px] font-bold leading-tight text-[#0C535B]">{b.label}</p>
                    <p className="text-[10px] leading-tight text-[#6e7379]">{b.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Description / Specs */}
            <div className="grid gap-0 border-t border-black/8 pt-5 md:grid-cols-2">
              <div className="space-y-4 border-b border-black/8 pb-6 pr-0 text-sm leading-7 md:border-b-0 md:border-r md:pb-0 md:pr-8">
                <div>
                  <p className="mb-1 font-bold text-[#F07826]">Descripción</p>
                  <p className="text-[#333]">
                    {producto.descripcion ||
                      `${producto.nombre} es un producto de la línea ${producto.categoria} de Kliniu, diseñado para ofrecer higiene profesional en espacios de alto tráfico.`}
                  </p>
                </div>
                {fichaTecnica.find((r) => r.etiqueta === "Material") && (
                  <div>
                    <p className="mb-1 font-bold text-[#F07826]">Materiales</p>
                    <p className="text-[#333]">Fabricado en {fichaTecnica.find((r) => r.etiqueta === "Material")?.valor}.</p>
                  </div>
                )}
                {fichaTecnica.find((r) => r.etiqueta === "Baterías") && (
                  <div>
                    <p className="mb-1 font-bold text-[#F07826]">Baterías</p>
                    <p className="text-[#333]">{fichaTecnica.find((r) => r.etiqueta === "Baterías")?.valor}</p>
                  </div>
                )}
                {fichaTecnica.find((r) => r.etiqueta === "Instalación") && (
                  <div>
                    <p className="mb-1 font-bold text-[#F07826]">Instalación</p>
                    <p className="text-[#333]">{fichaTecnica.find((r) => r.etiqueta === "Instalación")?.valor}</p>
                  </div>
                )}
                {producto.aplicacion && (
                  <div>
                    <p className="mb-1 font-bold text-[#F07826]">Aplicación</p>
                    <p className="text-[#333]">{producto.aplicacion}</p>
                  </div>
                )}
              </div>
              <div className="space-y-4 pt-6 text-sm leading-7 md:pl-8 md:pt-0">
                {fichaTecnica.some((r) => ["Alto", "Ancho", "Profundidad", "Peso", "Capacidad"].includes(r.etiqueta)) && (
                  <div>
                    <p className="mb-1 font-bold text-[#F07826]">Medidas</p>
                    <div className="text-[#333]">
                      {fichaTecnica.filter((r) => ["Alto", "Ancho"].includes(r.etiqueta)).length >= 2 && (
                        <p>Alto {fichaTecnica.find((r) => r.etiqueta === "Alto")?.valor} x ancho {fichaTecnica.find((r) => r.etiqueta === "Ancho")?.valor}</p>
                      )}
                      {fichaTecnica.find((r) => r.etiqueta === "Profundidad") && (
                        <p>Profundidad: {fichaTecnica.find((r) => r.etiqueta === "Profundidad")?.valor}</p>
                      )}
                      {fichaTecnica.find((r) => r.etiqueta === "Peso") && (
                        <p>Peso: {fichaTecnica.find((r) => r.etiqueta === "Peso")?.valor}</p>
                      )}
                      {fichaTecnica.find((r) => r.etiqueta === "Capacidad") && (
                        <p>Capacidad: {fichaTecnica.find((r) => r.etiqueta === "Capacidad")?.valor}</p>
                      )}
                    </div>
                  </div>
                )}
                {producto.compatibilidad && producto.compatibilidad.length > 0 && (
                  <div>
                    <p className="mb-1 font-bold text-[#F07826]">Incluye</p>
                    <ul className="space-y-0.5 text-[#333]">
                      {producto.compatibilidad.map((c) => (
                        <li key={c}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {fichaTecnica.find((r) => r.etiqueta === "Fuente de poder") && (
                  <div>
                    <p className="mb-1 font-bold text-[#F07826]">Fuente de poder</p>
                    <p className="text-[#333]">{fichaTecnica.find((r) => r.etiqueta === "Fuente de poder")?.valor}</p>
                  </div>
                )}
                {fichaTecnica
                  .filter((r) => !["Alto", "Ancho", "Profundidad", "Peso", "Capacidad", "Material", "Baterías", "Instalación", "Fuente de poder", "Categoría", "Marca", "Disponibilidad", "Garantía", "Aplicación"].includes(r.etiqueta))
                  .map((r) => (
                    <div key={r.etiqueta}>
                      <p className="mb-1 font-bold text-[#F07826]">{r.etiqueta}</p>
                      <p className="text-[#333]">{r.valor}</p>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ── */}
      <section className="mx-auto max-w-[1440px] px-6 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/banners-web/BANNER-FINALES-21.png"
          alt="Kliniu"
          className="hidden sm:block w-full object-cover"
        />
      </section>

      {/* ── Related products ── */}
      {relacionados.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 py-14">
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-[#27B1B8]">
            Productos relacionados
          </h2>
          <ProductosCarousel products={relacionados} />
        </section>
      )}

      {/* ── ¿Necesitas ayuda? ── */}
      <section className="px-6 pt-10 md:pb-36 md:pt-16">
        <div className="mx-auto max-w-[1440px]">
          <AsesorBanner />
        </div>
      </section>

      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        productoId={producto.slug}
        productoNombre={producto.nombre}
        productoPrecio={producto.precio}
        productoImagen={producto.imagen}
        productoCodigo={codigoMostrado}
        cantidadSeleccionada={cantidad}
        productSlug={effectiveSlug}
        productSku={producto.sku}
        preciosPorCantidad={preciosBase}
        addItem={addItem}
      />
      <SiteFooter />
    </main>
  );
}
