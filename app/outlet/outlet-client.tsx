"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "../components/cart-provider";
import { useProducts } from "../components/products-provider";
import type { ProductoCatalogo } from "../data/catalog";
import SiteFooter from "../components/site-footer";

function isOutletProduct(product: ProductoCatalogo) {
  return product.esOutlet === true;
}

function hasVisibleDiscount(product: ProductoCatalogo) {
  return Boolean(product.descuento && product.descuento !== "-0%");
}

function AddOutletButton({ product, featured = false }: { product: ProductoCatalogo; featured?: boolean }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={product.puedeComprar === false}
      onClick={() => {
        if (product.puedeComprar === false) return;
        addItem({
          id: product.slug,
          nombre: product.nombre,
          precio: product.precio,
          imagen: product.imagen,
        });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1200);
      }}
      style={product.puedeComprar === false ? undefined : { background: "linear-gradient(135deg, #3b82f6, #7c3aed, #d946ef)" }}
      className={`shine-sweep inline-flex items-center justify-center rounded-full font-bold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400 ${
        featured
          ? "min-h-10 w-full px-5 py-2.5 text-sm shadow-[0_8px_28px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 hover:opacity-90"
          : "mt-3 min-h-10 w-full px-4 py-2.5 text-sm hover:opacity-90"
      }`}
    >
      {product.puedeComprar === false ? "Sin stock" : added ? "¡Agregado!" : "Agregar al carrito"}
    </button>
  );
}

function ProductImage({ product, maxHeight }: { product: ProductoCatalogo; maxHeight?: number }) {
  const [src, setSrc] = useState(product.imagen);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={product.nombre}
      className="w-auto max-w-full object-contain"
      style={maxHeight ? { maxHeight } : undefined}
      onError={() => setSrc("/product-placeholder.png")}
    />
  );
}

function ProductCard({ product }: { product: ProductoCatalogo }) {
  const showDiscount = hasVisibleDiscount(product);

  return (
    <article
      className="motion-card interactive-lift group flex min-h-[240px] flex-col overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(124,58,237,0.35)]"
      style={{ background: "linear-gradient(160deg, #0f0c2e 0%, #1a1060 60%, #2d1080 100%)" }}
    >
      <div className="relative flex h-[130px] items-center justify-center bg-white px-4">
        {showDiscount ? (
          <span
            className="absolute left-3 top-3 z-10 rounded-lg px-2.5 py-1 text-[11px] font-black text-white"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
          >
            {product.descuento}
          </span>
        ) : null}
        <div className="outlet-product-pop">
          <ProductImage product={product} maxHeight={98} />
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[13px] font-semibold leading-snug text-white/85">{product.nombre}</h3>
        <div className="mt-auto flex flex-wrap items-end gap-2 pt-3">
          <p className="text-[22px] font-black leading-none tracking-tight text-white">{product.precio}</p>
          {product.precioAnterior ? (
            <p className="pb-0.5 text-xs font-medium text-white/40 line-through">{product.precioAnterior}</p>
          ) : null}
        </div>
        <AddOutletButton product={product} />
      </div>
    </article>
  );
}

function FeaturedCarousel({ products }: { products: ProductoCatalogo[] }) {
  const [index, setIndex] = useState(0);
  const product = products[index];
  if (!product) return null;
  const showDiscount = hasVisibleDiscount(product);

  const prev = () => setIndex((i) => (i - 1 + products.length) % products.length);
  const next = () => setIndex((i) => (i + 1) % products.length);

  return (
    <article
      className="outlet-featured-shell flex aspect-square flex-col overflow-hidden rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
      style={{ background: "linear-gradient(160deg, #0f0c2e 0%, #1a1060 60%, #2d1080 100%)" }}
    >
      {/* Imagen con flechas */}
      <div className="relative flex h-[58%] min-h-0 w-full items-center justify-center bg-white p-5">
        {showDiscount && (
          <span
            className="outlet-badge-pop absolute left-3 top-3 rounded-lg px-2.5 py-1 text-xs font-black text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
          >
            {product.descuento}
          </span>
        )}
        <div className="outlet-product-pop">
          <ProductImage product={product} maxHeight={190} />
        </div>

        {/* Flecha izquierda */}
        <button
          type="button"
          onClick={prev}
          className="nav-pulse absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
          style={{ border: "1px solid rgba(124,58,237,0.2)" }}
          aria-label="Anterior"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#7c3aed" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Flecha derecha */}
        <button
          type="button"
          onClick={next}
          className="nav-pulse absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
          style={{ border: "1px solid rgba(124,58,237,0.2)" }}
          aria-label="Siguiente"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#7c3aed" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="flex min-h-0 flex-1 flex-col px-5 pb-4 pt-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div
            className="inline-flex min-w-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white"
            style={{ background: "rgba(99,102,241,0.35)", border: "1px solid rgba(139,92,246,0.4)" }}
          >
            <svg viewBox="0 0 16 16" className="h-3 w-3 fill-[#c084fc]">
              <path d="M8 1.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L8 9.5l-3.2 1.9.6-3.6-2.6-2.5 3.6-.5z" />
            </svg>
            Oferta destacada
          </div>
          {/* Dots */}
          <div className="flex gap-1.5">
            {products.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "pulse-ring" : ""}`}
                style={{
                  width: i === index ? "18px" : "6px",
                  background: i === index ? "#c084fc" : "rgba(255,255,255,0.25)",
                }}
                aria-label={`Producto ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <h2 className="line-clamp-2 text-[13px] font-semibold leading-snug text-white/90">
          {product.nombre}
        </h2>

        <div className="mt-auto flex items-end gap-2 pt-2">
          <p className="text-2xl font-black leading-none tracking-tight text-white">
            {product.precio}
          </p>
          {product.precioAnterior && (
            <p className="pb-0.5 text-xs font-medium text-white/40 line-through">
              {product.precioAnterior}
            </p>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <AddOutletButton product={product} featured />
          <Link
            href="#ofertas"
            className="inline-flex shrink-0 items-center justify-center rounded-full px-3 py-2 text-[11px] font-semibold text-white/80 transition-colors hover:text-white"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Ver todas
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function OutletClient({ heroDesktop, heroMobile, superOfertas }: { heroDesktop: string; heroMobile: string; superOfertas: string }) {
  const { products } = useProducts();
  const outletCatalog = useMemo(
    () => products.filter(isOutletProduct),
    [products],
  );
  const outletProducts = useMemo(
    () => outletCatalog.slice(0, 5),
    [outletCatalog],
  );
  const carouselProducts = useMemo(
    () => outletCatalog.slice(0, 8),
    [outletCatalog],
  );

  return (
    <>
      <main className="min-h-screen bg-[#f4f6f8]">
        {/* Hero banner */}
        <section className="outlet-sparkle-layer relative isolate overflow-hidden bg-[#0a0630]">
          {/* Imagen a ancho completo, proporciones naturales */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <picture>
            <source media="(max-width: 639px)" srcSet={heroMobile} />
            <img
              src={heroDesktop}
              alt=""
              aria-hidden="true"
              className="outlet-hero-bg block w-full"
            />
          </picture>

          {/* Carrusel encima en desktop */}
          {carouselProducts.length > 0 && (
            <div
              className="absolute hidden lg:block"
              style={{
                right: "calc(8% + 100px)",
                top: "42%",
                transform: "translateY(-50%)",
                width: "clamp(360px, 24vw, 420px)",
              }}
            >
              <div className="outlet-featured-card-mobile">
                <FeaturedCarousel products={carouselProducts} />
              </div>
            </div>
          )}
        </section>

        {/* Carrusel en móvil/tablet — debajo del banner */}
        {carouselProducts.length > 0 && (
          <div className="outlet-featured-card-mobile block px-4 py-6 sm:px-6 lg:hidden" style={{ background: "linear-gradient(180deg, #08052a 0%, #100840 100%)" }}>
            <FeaturedCarousel products={carouselProducts} />
          </div>
        )}


        {/* Products grid */}
        <section id="ofertas" className="px-5 py-10 lg:px-10" style={{ background: "linear-gradient(180deg, #08052a 0%, #100840 100%)" }}>
          <div className="mx-auto max-w-[1536px]">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#c084fc]">
                  Outlet virtual
                </p>
                <h2 className="mt-1.5 text-3xl font-bold tracking-tight text-white md:text-4xl">
                  Super ofertas Kliniu
                </h2>
              </div>
              <Link
                href="/categorias"
                className="inline-flex w-fit rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:opacity-80"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
              >
                Ver catálogo completo
              </Link>
            </div>

            {outletCatalog.length > 0 ? (
              <div className="motion-list grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {outletProducts.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/8 px-6 py-10 text-center text-white">
                <p className="text-lg font-bold">Aún no hay productos en Outlet.</p>
                <p className="mt-2 text-sm text-white/70">
                  Crea productos desde el administrador usando el botón Crear Outlet.
                </p>
              </div>
            )}

            <aside className="outlet-sparkle-layer interactive-lift relative mt-4 overflow-hidden rounded-2xl">
              <div className="relative aspect-[4/3] sm:aspect-[16/6] lg:aspect-[16/4]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={superOfertas}
                  alt="Super Ofertas Kliniu - Outlet Virtual"
                  className="outlet-hero-bg absolute inset-0 h-full w-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent sm:bg-gradient-to-r sm:from-transparent sm:via-black/20 sm:to-black/85" />
                <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 px-5 pb-5 sm:inset-y-0 sm:bottom-auto sm:left-[38%] sm:right-0 sm:justify-center sm:gap-3 sm:px-8 sm:pb-0 sm:pt-16">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white sm:text-xs" style={{ background: "rgba(192,64,255,0.35)", border: "1px solid rgba(192,64,255,0.5)" }}>
                    ⏳ Solo 15 días
                  </span>
                  <p className="text-2xl font-black leading-tight text-white drop-shadow-lg sm:text-[clamp(1.5rem,3.5vw,3.2rem)]">
                    <span className="outlet-banner-title">¡Descuentos de hasta</span>{" "}
                    <span style={{ background: "linear-gradient(90deg,#c084fc,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                      70% OFF
                    </span>
                    !
                  </p>
                  <p className="text-sm leading-relaxed text-white/85 drop-shadow sm:max-w-[380px] sm:text-[clamp(0.85rem,1.4vw,1.15rem)]">
                    Estas ofertas desaparecen en 15 días. No dejes ir los mejores precios del año.
                  </p>
                  <Link
                    href="#ofertas"
                    className="inline-flex w-fit rounded-full px-5 py-2 text-sm font-black text-white shadow-lg transition-all duration-200 hover:scale-105 sm:px-6 sm:py-2.5"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #3b82f6)" }}
                  >
                    Ver ofertas ahora →
                  </Link>
                </div>
              </div>
            </aside>

          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
