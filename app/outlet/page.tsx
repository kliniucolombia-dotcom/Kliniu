"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "../components/cart-provider";
import { useProducts } from "../components/products-provider";
import type { ProductoCatalogo } from "../data/catalog";
import SiteFooter from "../components/site-footer";

const benefits = [
  { title: "Calidad que te da confianza", icon: "shield" },
  { title: "Envíos rápidos a todo el país", icon: "truck" },
  { title: "Pagos 100% seguros", icon: "lock" },
  { title: "Devoluciones fáciles", icon: "refresh" },
] as const;

function BenefitIcon({ icon }: { icon: (typeof benefits)[number]["icon"] }) {
  if (icon === "truck") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 6h11v10H3z" />
        <path d="M14 9h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    );
  }
  if (icon === "lock") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }
  if (icon === "refresh") {
    return (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 12a8 8 0 0 1-13.6 5.7" />
        <path d="M4 12A8 8 0 0 1 17.6 6.3" />
        <path d="M6 18H3v-3" />
        <path d="M18 6h3v3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3 5 6v5c0 4.5 2.9 8.4 7 10 4.1-1.6 7-5.5 7-10V6z" />
      <path d="m8.8 12 2 2 4.4-4.5" />
    </svg>
  );
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
      className={`inline-flex items-center justify-center rounded-full bg-[#0C535B] font-bold text-white transition-all duration-200 hover:bg-[#073D43] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 ${
        featured
          ? "min-h-13 w-full px-7 py-3.5 text-[15px] shadow-[0_8px_24px_rgba(12,83,91,0.28)] hover:-translate-y-0.5"
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
  return (
    <article className="group flex min-h-[240px] flex-col overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(12,83,91,0.12)]">
      <div className="relative flex h-[130px] items-center justify-center rounded-t-2xl bg-[#f8f9fb] px-4">
        {product.descuento ? (
          <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#EAF8F6] px-2.5 py-1 text-[11px] font-bold text-[#0C535B]">
            {product.descuento}
          </span>
        ) : null}
        <ProductImage product={product} maxHeight={98} />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="text-[13px] font-semibold leading-snug text-[#1f2328]">{product.nombre}</h3>
        <div className="mt-auto flex flex-wrap items-end gap-2 pt-3">
          <p className="text-[22px] font-bold leading-none tracking-tight text-[#0C535B]">{product.precio}</p>
          {product.precioAnterior ? (
            <p className="pb-0.5 text-xs font-medium text-slate-400 line-through">{product.precioAnterior}</p>
          ) : null}
        </div>
        <AddOutletButton product={product} />
      </div>
    </article>
  );
}

function FeaturedOffer({ product }: { product: ProductoCatalogo }) {
  return (
    <article className="rounded-2xl border border-black/8 bg-white p-5 shadow-[0_16px_48px_rgba(15,23,42,0.12)] sm:p-7">
      <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#EAF8F6] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0C535B]">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-[#27B1B8]">
          <path d="M8 1.5l1.6 3.3 3.6.5-2.6 2.5.6 3.6L8 9.5l-3.2 1.9.6-3.6-2.6-2.5 3.6-.5z" />
        </svg>
        Oferta destacada
      </div>

      <div className="grid items-center gap-6 sm:grid-cols-[1fr_1.1fr]">
        <div className="flex min-h-[200px] items-center justify-center rounded-xl bg-[#f8f9fb] px-6 py-4">
          <ProductImage product={product} maxHeight={190} />
        </div>

        <div>
          <h1 className="text-2xl font-bold leading-tight tracking-tight text-[#0C535B] md:text-3xl">
            {product.nombre}
          </h1>
          <div className="mt-4 flex flex-wrap items-end gap-x-4 gap-y-1">
            <p className="text-4xl font-bold tracking-tight text-[#0C535B] md:text-5xl">
              {product.precio}
            </p>
            {product.precioAnterior ? (
              <p className="pb-1 text-lg font-medium text-slate-400 line-through">
                {product.precioAnterior}
              </p>
            ) : null}
          </div>
          {product.descuento ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#27B1B8]/20 bg-[#EAF8F6] px-4 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#27B1B8]">Oferta outlet</span>
              <span className="text-2xl font-bold text-[#0C535B]">{product.descuento}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <AddOutletButton product={product} featured />
        <Link
          href="#ofertas"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-black/10 bg-[#f8f9fb] px-7 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#EAF8F6]"
        >
          Ver todas
        </Link>
      </div>
    </article>
  );
}

export default function OutletPage() {
  const { products } = useProducts();
  const featuredProduct = useMemo(
    () =>
      products.find((p) => p.nombre.toLowerCase().includes("doble de jabón 800")) ??
      products.find((p) => p.nombre.toLowerCase().includes("dispensador")) ??
      products[0],
    [products],
  );
  const outletProducts = useMemo(
    () => products.filter((p) => p.slug !== featuredProduct?.slug).slice(0, 5),
    [featuredProduct?.slug, products],
  );

  return (
    <>
      <main className="min-h-screen bg-[#f4f6f8]">
        {/* Hero banner */}
        <section className="relative isolate overflow-hidden bg-[#0C535B]">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at 20% 50%, rgba(39,177,184,0.18) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(255,255,255,0.06) 0%, transparent 50%)",
            }}
          />
          <div className="relative mx-auto grid max-w-[1536px] grid-cols-1 items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-10 lg:py-16">
            {/* Left: copy */}
            <div className="text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#27B1B8]">
                Outlet virtual
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight md:text-6xl">
                Super ofertas<br />
                <span className="text-[#27B1B8]">Kliniu</span>
              </h1>
              <p className="mt-4 max-w-sm text-base text-white/70">
                Productos seleccionados con descuento especial. Stock limitado.
              </p>
              <Link
                href="#ofertas"
                className="mt-7 inline-flex rounded-full bg-[#27B1B8] px-7 py-3 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(39,177,184,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#1E969B]"
              >
                Ver todas las ofertas
              </Link>
            </div>
            {/* Right: featured card */}
            {featuredProduct ? (
              <FeaturedOffer product={featuredProduct} />
            ) : (
              <div className="rounded-2xl border border-white/20 bg-white/90 p-8 text-center font-semibold text-[#0C535B]">
                Cargando ofertas...
              </div>
            )}
          </div>
        </section>

        {/* Benefits bar */}
        <section className="border-y border-black/8 bg-white">
          <div className="mx-auto flex max-w-[1536px] items-center px-5 py-4 lg:px-10">
            <div className="grid w-full gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex items-center gap-3 text-[#1f2328]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#EAF8F6] text-[#27B1B8]">
                    <BenefitIcon icon={benefit.icon} />
                  </span>
                  <span className="text-[13px] font-semibold leading-tight">{benefit.title}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Products grid */}
        <section id="ofertas" className="px-5 py-10 lg:px-10">
          <div className="mx-auto max-w-[1536px]">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.26em] text-[#27B1B8]">
                  Outlet virtual
                </p>
                <h2 className="mt-1.5 text-3xl font-bold tracking-tight text-[#0C535B] md:text-4xl">
                  Super ofertas Kliniu
                </h2>
              </div>
              <Link
                href="/categorias"
                className="inline-flex w-fit rounded-full border border-black/10 bg-white px-6 py-2.5 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#EAF8F6]"
              >
                Ver catálogo completo
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {outletProducts.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}

              <aside className="overflow-hidden rounded-2xl border border-black/8 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.07)] md:col-span-2 xl:col-span-2">
                <div className="grid h-full min-h-[240px] items-center gap-5 p-5 sm:grid-cols-[0.9fr_1fr]">
                  <div className="relative min-h-[190px] overflow-hidden rounded-xl bg-[#EAF8F6]">
                    <Image
                      src="/outlet/kliniu-foca-pregunta.png"
                      alt="Foca KLINIU"
                      fill
                      sizes="(max-width: 768px) 100vw, 240px"
                      className="object-contain object-bottom"
                    />
                    <div className="absolute right-3 top-3 rotate-3 rounded-xl bg-[#0C535B] px-3 py-2 text-center text-white shadow-[0_8px_18px_rgba(12,83,91,0.3)]">
                      <p className="text-3xl font-bold leading-none">%</p>
                      <p className="text-[9px] font-bold uppercase tracking-wide">Outlet</p>
                    </div>
                  </div>
                  <div className="min-w-0 pr-2">
                    <p className="text-xl font-bold leading-snug text-[#0C535B]">
                      Las mejores ofertas para equipar tu hogar o negocio.
                    </p>
                    <Link
                      href="/categorias"
                      className="mt-5 inline-flex rounded-full bg-[#0C535B] px-5 py-2.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43]"
                    >
                      Ver todas las ofertas
                    </Link>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
