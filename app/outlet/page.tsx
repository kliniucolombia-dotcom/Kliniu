"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "../components/cart-provider";
import { useProducts } from "../components/products-provider";
import type { ProductoCatalogo } from "../data/catalog";
import SiteFooter from "../components/site-footer";

function isOutletProduct(product: ProductoCatalogo) {
  return product.categoria === "Outlet";
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
      className={`inline-flex items-center justify-center rounded-full font-bold text-white transition-all duration-200 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400 ${
        featured
          ? "min-h-11 w-full px-6 py-3 text-[15px] shadow-[0_8px_28px_rgba(124,58,237,0.5)] hover:-translate-y-0.5 hover:opacity-90"
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
      className="group flex min-h-[240px] flex-col overflow-hidden rounded-2xl shadow-[0_8px_28px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(124,58,237,0.35)]"
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
        <ProductImage product={product} maxHeight={98} />
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
      className="overflow-hidden rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
      style={{ background: "linear-gradient(160deg, #0f0c2e 0%, #1a1060 60%, #2d1080 100%)" }}
    >
      {/* Imagen con flechas */}
      <div className="relative flex h-[320px] w-full items-center justify-center bg-white p-8">
        {showDiscount && (
          <span
            className="absolute left-4 top-4 rounded-xl px-3 py-1.5 text-sm font-black text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #3b82f6, #7c3aed)" }}
          >
            {product.descuento}
          </span>
        )}
        <ProductImage product={product} maxHeight={220} />

        {/* Flecha izquierda */}
        <button
          type="button"
          onClick={prev}
          className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
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
          className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
          style={{ border: "1px solid rgba(124,58,237,0.2)" }}
          aria-label="Siguiente"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="#7c3aed" strokeWidth="2.5">
            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="px-5 pb-5 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-white"
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
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? "18px" : "6px",
                  background: i === index ? "#c084fc" : "rgba(255,255,255,0.25)",
                }}
                aria-label={`Producto ${i + 1}`}
              />
            ))}
          </div>
        </div>

        <h2 className="text-[15px] font-semibold leading-snug text-white/90">
          {product.nombre}
        </h2>

        <div className="mt-3 flex items-end gap-3">
          <p className="text-3xl font-black leading-none tracking-tight text-white">
            {product.precio}
          </p>
          {product.precioAnterior && (
            <p className="pb-0.5 text-sm font-medium text-white/40 line-through">
              {product.precioAnterior}
            </p>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <AddOutletButton product={product} featured />
          <Link
            href="#ofertas"
            className="inline-flex shrink-0 items-center justify-center rounded-full px-4 py-2.5 text-xs font-semibold text-white/80 transition-colors hover:text-white"
            style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            Ver todas
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function OutletPage() {
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
        <section className="relative isolate overflow-hidden bg-[#0a0630]">
          {/* Imagen a ancho completo, proporciones naturales */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/banner-outlet.jpg"
            alt=""
            aria-hidden="true"
            className="block w-full"
          />

          {/* Carrusel encima en desktop */}
          {carouselProducts.length > 0 && (
            <div className="absolute hidden lg:block" style={{ right: "3%", top: "50%", transform: "translateY(-50%)", width: "320px" }}>
              <FeaturedCarousel products={carouselProducts} />
            </div>
          )}
        </section>

        {/* Carrusel en móvil/tablet — debajo del banner */}
        {carouselProducts.length > 0 && (
          <div className="block px-4 py-6 sm:px-6 lg:hidden" style={{ background: "linear-gradient(180deg, #08052a 0%, #100840 100%)" }}>
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
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
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

            <aside className="relative mt-4 overflow-hidden rounded-2xl" style={{ aspectRatio: "16/4" }}>
              <Image
                src="/outlet/banner-super-ofertas.jpg"
                alt="Super Ofertas Kliniu - Outlet Virtual"
                fill
                sizes="100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-black/85" />
              <div className="absolute inset-y-0 right-0 flex w-[45%] flex-col justify-center gap-3 px-10">
                <p className="text-2xl font-bold leading-snug text-white drop-shadow lg:text-3xl">
                  ¡Inscríbete al programa de puntos Kliniu!
                </p>
                <p className="text-sm text-white/80 drop-shadow lg:text-base">
                  Acumula puntos en cada compra y canjéalos por descuentos exclusivos.
                </p>
                <Link
                  href="/puntos"
                  className="inline-flex w-fit rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-white/90"
                >
                  Inscribirme a puntos
                </Link>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
