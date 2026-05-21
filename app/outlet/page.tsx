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
  { title: "Envios rapidos a todo el pais", icon: "truck" },
  { title: "Pagos 100% seguros", icon: "lock" },
  { title: "Devoluciones faciles", icon: "refresh" },
] as const;

const countdown = [
  ["02", "Dias"],
  ["14", "Horas"],
  ["38", "Min"],
  ["45", "Seg"],
] as const;

function BenefitIcon({ icon }: { icon: (typeof benefits)[number]["icon"] }) {
  if (icon === "truck") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M3 6h11v10H3z" />
        <path d="M14 9h4l3 3v4h-7z" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    );
  }

  if (icon === "lock") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
    );
  }

  if (icon === "refresh") {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M20 12a8 8 0 0 1-13.6 5.7" />
        <path d="M4 12A8 8 0 0 1 17.6 6.3" />
        <path d="M6 18H3v-3" />
        <path d="M18 6h3v3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
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
      style={
        product.puedeComprar === false
          ? undefined
          : {
              background: "linear-gradient(135deg, #7c3aed, #d946ef)",
            }
      }
      className={`inline-flex items-center justify-center rounded-full font-black text-white transition-all duration-200 disabled:cursor-not-allowed disabled:bg-slate-700 ${
        featured
          ? "min-h-14 w-full px-7 py-4 text-base shadow-[0_14px_30px_rgba(124,58,237,0.4)] hover:-translate-y-0.5"
          : "mt-4 min-h-11 w-full px-4 py-3 text-sm hover:opacity-90"
      }`}
    >
      {product.puedeComprar === false ? "Sin stock" : added ? "Agregado" : "Agregar al carrito"}
    </button>
  );
}

function ProductImage({
  product,
  className = "",
  maxHeight,
}: {
  product: ProductoCatalogo;
  className?: string;
  maxHeight?: number;
}) {
  const [src, setSrc] = useState(product.imagen);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={product.nombre}
      className={`w-auto max-w-full object-contain ${className}`}
      style={maxHeight ? { maxHeight } : undefined}
      onError={() => setSrc("/product-placeholder.png")}
    />
  );
}

function ProductCard({ product }: { product: ProductoCatalogo }) {
  return (
    <article className="group flex min-h-[250px] flex-col overflow-hidden rounded-xl border border-white bg-white p-4 shadow-[0_18px_36px_rgba(124,58,237,0.15)] transition-transform duration-300 hover:-translate-y-1">
      <div className="relative flex h-[138px] items-center justify-center rounded-[0.7rem] bg-white px-5">
        {product.descuento ? (
          <span className="absolute left-3 top-3 z-10 rounded-md px-3 py-1 text-xs font-black text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #d946ef)" }}>
            {product.descuento}
          </span>
        ) : null}
        <ProductImage product={product} className="transition-transform duration-300 group-hover:scale-105" maxHeight={106} />
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <h3 className="min-h-10 text-[14px] font-black leading-snug text-[#1a1a2e]">
          {product.nombre}
        </h3>
        <div className="mt-auto flex flex-wrap items-end gap-2 pt-5">
          <p className="text-[24px] font-black leading-none tracking-tight" style={{ color: "#5b21b6" }}>{product.precio}</p>
          {product.precioAnterior ? (
            <p className="pb-0.5 text-xs font-bold text-slate-400 line-through">{product.precioAnterior}</p>
          ) : null}
        </div>
        <AddOutletButton product={product} />
      </div>
    </article>
  );
}

function FeaturedOffer({ product }: { product: ProductoCatalogo }) {
  return (
    <article className="rounded-[2rem] border border-white/20 bg-white p-5 shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:p-7">
      <div className="mb-4 inline-flex items-center gap-2 rounded-md px-4 py-2 text-xs font-black uppercase tracking-wide text-white" style={{ background: "linear-gradient(135deg, #7c3aed, #d946ef)" }}>
        <span aria-hidden="true">☆</span>
        Oferta destacada
      </div>

      <div className="grid items-center gap-6 sm:grid-cols-[0.86fr_1fr]">
        <div className="flex min-h-[220px] items-center justify-center rounded-[1.5rem] bg-white px-6" style={{ border: "1px solid rgba(124,58,237,0.1)" }}>
          <ProductImage product={product} maxHeight={205} />
        </div>

        <div>
          <h1 className="text-2xl font-black leading-tight tracking-tight text-[#1a1a2e] md:text-4xl">
            {product.nombre}
          </h1>
          <div className="mt-5 flex flex-wrap items-end gap-x-4 gap-y-2">
            <p className="text-4xl font-black tracking-tight md:text-5xl" style={{ color: "#5b21b6" }}>
              {product.precio}
            </p>
            {product.precioAnterior ? (
              <p className="pb-1 text-xl font-bold text-slate-400 line-through">
                {product.precioAnterior}
              </p>
            ) : null}
          </div>
          <div className="mt-5 inline-block rounded-xl px-5 py-3" style={{ backgroundColor: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <p className="text-sm font-black uppercase" style={{ color: "#7c3aed" }}>Oferta outlet</p>
            <p className="text-3xl font-black text-[#1a1a2e]">{product.descuento || "70% OFF"}</p>
          </div>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center">
        <AddOutletButton product={product} featured />
        <Link
          href="#ofertas"
          className="inline-flex min-h-14 items-center justify-center rounded-full bg-white px-7 py-4 text-sm font-black transition-colors duration-200 hover:bg-purple-50"
          style={{ border: "1px solid rgba(124,58,237,0.25)", color: "#5b21b6" }}
        >
          Ver todas
        </Link>
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {[0, 1, 2, 3, 4].map((dot) => (
          <span key={dot} className="h-3 w-3 rounded-full" style={{ backgroundColor: dot === 0 ? "#079ca4" : "#cbd5e1" }} />
        ))}
      </div>
    </article>
  );
}

export default function OutletPage() {
  const { products } = useProducts();
  const featuredProduct = useMemo(
    () =>
      products.find((product) => product.nombre.toLowerCase().includes("doble de jabón 800")) ??
      products.find((product) => product.nombre.toLowerCase().includes("dispensador")) ??
      products[0],
    [products],
  );
  const outletProducts = useMemo(
    () =>
      products
        .filter((product) => product.slug !== featuredProduct?.slug)
        .slice(0, 5),
    [featuredProduct?.slug, products],
  );

  return (
    <>
      <main className="min-h-screen" style={{ backgroundColor: "#08052a" }}>
        <section
          className="relative isolate overflow-hidden bg-[#08052a] bg-top"
          style={{
            backgroundImage: "url('/banner-outlet.png')",
            backgroundRepeat: "no-repeat",
            backgroundSize: "100% auto",
            height: "max(620px, calc(100vw * 941 / 1672))",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-900/10 to-[#08052a]/40" />

          <div className="relative mx-auto grid h-full max-w-[1536px] grid-cols-1 items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_0.86fr] lg:px-10">
            <div className="min-h-[260px] lg:min-h-[560px]" />

            {featuredProduct ? (
              <FeaturedOffer product={featuredProduct} />
            ) : (
              <div className="rounded-[2rem] border border-white bg-white/90 p-8 text-center font-black" style={{ color: "#075969" }}>
                Cargando ofertas...
              </div>
            )}
          </div>
        </section>

        <section className="border-y border-white/10 bg-white">
          <div className="mx-auto flex max-w-[1536px] flex-col gap-6 px-5 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {benefits.map((benefit) => (
                <div key={benefit.title} className="flex items-center gap-3 text-[#1a1a2e]">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(124,58,237,0.1)", color: "#7c3aed" }}>
                    <BenefitIcon icon={benefit.icon} />
                  </span>
                  <span className="max-w-[9.5rem] text-sm font-black leading-tight">{benefit.title}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 lg:justify-end">
              <p className="mr-2 text-xs font-black uppercase tracking-wide text-[#4c1d95]">
                Ofertas por tiempo limitado
              </p>
              {countdown.map(([value, label]) => (
                <div key={label} className="rounded-lg px-4 py-2 text-center text-white shadow-[0_10px_22px_rgba(124,58,237,0.35)]" style={{ background: "linear-gradient(180deg, #7c3aed, #4c1d95)" }}>
                  <p className="text-2xl font-black leading-none">{value}</p>
                  <p className="mt-1 text-[10px] font-black uppercase">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ofertas" className="relative overflow-hidden px-5 py-10 lg:px-10" style={{ backgroundColor: "#08052a" }}>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 10% 30%, rgba(124,58,237,0.25), transparent 40%), radial-gradient(circle at 90% 10%, rgba(217,70,239,0.18), transparent 35%), radial-gradient(circle at 50% 80%, rgba(99,102,241,0.15), transparent 50%)",
            }}
          />
          <div className="relative mx-auto max-w-[1536px]">
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-purple-400">
                  Outlet virtual
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-white md:text-5xl">
                  Super ofertas KLINIU
                </h2>
              </div>
              <Link
                href="/categorias"
                className="inline-flex w-fit rounded-full px-6 py-3 text-sm font-black text-white transition-opacity duration-200 hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #7c3aed, #d946ef)" }}
              >
                Ver catalogo completo
              </Link>
            </div>

            <div className="relative">
              <button
                type="button"
                aria-label="Ofertas anteriores"
                className="absolute -left-5 top-[150px] z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-2xl font-black shadow-[0_12px_28px_rgba(124,58,237,0.4)] xl:flex"
                style={{ backgroundColor: "#1e1050", color: "#c084fc" }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Siguientes ofertas"
                className="absolute -right-5 top-[150px] z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-2xl font-black shadow-[0_12px_28px_rgba(124,58,237,0.4)] xl:flex"
                style={{ backgroundColor: "#1e1050", color: "#c084fc" }}
              >
                ›
              </button>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {outletProducts.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}

                <aside className="overflow-hidden rounded-xl border border-white bg-white shadow-[0_18px_36px_rgba(124,58,237,0.15)] md:col-span-2 xl:col-span-2 xl:max-w-[650px]">
                  <div className="grid h-full min-h-[250px] items-center gap-5 p-5 sm:grid-cols-[0.9fr_1fr]">
                    <div className="relative min-h-[206px] overflow-hidden rounded-xl bg-gradient-to-br from-purple-50 via-white to-purple-100">
                      <Image
                        src="/outlet/kliniu-foca-pregunta.png"
                        alt="Foca KLINIU pensando en las mejores ofertas"
                        fill
                        sizes="(max-width: 768px) 100vw, 260px"
                        className="object-contain object-bottom"
                      />
                      <div
                        className="absolute right-4 top-4 rotate-6 rounded-xl px-4 py-3 text-center text-white shadow-[0_12px_24px_rgba(124,58,237,0.4)]"
                        style={{ background: "linear-gradient(160deg, #7c3aed, #d946ef)" }}
                      >
                        <p className="text-4xl font-black leading-none">%</p>
                        <p className="text-[10px] font-black uppercase tracking-wide">Outlet</p>
                      </div>
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="text-2xl font-black leading-tight text-[#1a1a2e]">
                        Las mejores ofertas para equipar tu hogar o negocio.
                      </p>
                      <Link
                        href="/categorias"
                        className="mt-6 inline-flex whitespace-nowrap rounded-full px-6 py-3 text-sm font-black text-white transition-opacity duration-200 hover:opacity-90"
                        style={{ background: "linear-gradient(135deg, #7c3aed, #d946ef)" }}
                      >
                        Ver todas las ofertas
                      </Link>
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
