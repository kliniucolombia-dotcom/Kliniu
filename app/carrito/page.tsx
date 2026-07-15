"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "../components/cart-provider";
import { useProducts } from "../components/products-provider";
import SiteFooter from "../components/site-footer";
import OfferRoulette from "../components/offer-roulette";
import ProductosCarousel from "../components/productos-carousel";

function parsePrecio(precio: string) {
  return Number(precio.replace(/[^\d]/g, "")) || 0;
}

function formatPrecio(value: number) {
  return `$${value.toLocaleString("es-CO")}`;
}

const trustItems = [
  { icon: "📦", label: "Envíos a todos\nColombia" },
  { icon: "🛡️", label: "Garantía 2\naños" },
  { icon: "↩️", label: "Devoluciones\nfáciles" },
  { icon: "🎧", label: "Asesoría\nexperta" },
];

const datoKlinBenefits = [
  {
    label: "Productos\ncompatibles",
    icon: (
      <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="3">
        <rect x="12" y="8" width="28" height="44" rx="5" />
        <path d="M18 50v6h16v-6" />
        <path d="M26 34v9" strokeLinecap="round" />
        <path d="M44 25h10v27H44z" />
        <path d="M44 31c3 2 7 2 10 0" />
        <path d="M47 43h4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Más rendimiento\ndel sistema",
    icon: (
      <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="3">
        <path d="M10 52h44" strokeLinecap="round" />
        <path d="M14 52V42h9v10" />
        <path d="M28 52V34h9v18" />
        <path d="M42 52V25h9v27" />
        <path d="M12 34c18-3 30-13 39-28" strokeLinecap="round" />
        <path d="M42 8h9v9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Ahorro en tiempo\ny mantenimiento",
    icon: (
      <svg viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="3">
        <circle cx="32" cy="32" r="25" />
        <path d="M31 48c-2-16 4-28 18-35" strokeLinecap="round" />
        <path d="M28 45c-11-2-17-10-15-23 12 0 20 6 22 16" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M34 38c3-12 10-18 20-18 0 13-7 22-20 24" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export default function CarritoPage() {
  const { items, incrementItem, decrementItem, removeItem, clearCart } = useCart();
  const { products } = useProducts();
  const [loginRequiredOpen, setLoginRequiredOpen] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    fetch("/api/account")
      .then((r) => {
        if (r.status === 401) setLoginRequiredOpen(true);
      })
      .catch(() => {});
  }, [items.length]);

  const subtotal = items.reduce(
    (acc, item) => acc + parsePrecio(item.precio) * item.cantidad,
    0,
  );

  const ahorroTotal = items.reduce((acc, item) => {
    if (!item.precioOriginal) return acc;
    return acc + (parsePrecio(item.precioOriginal) - parsePrecio(item.precio)) * item.cantidad;
  }, 0);

  const differentProducts = items.length;
  const discountPct = differentProducts > 10 ? 10 : differentProducts > 4 ? 5 : 0;
  const discountAmount = Math.round(subtotal * discountPct / 100);
  const total = subtotal - discountAmount;

  const recommended = products
    .filter((p) => !items.some((i) => i.id === p.slug))
    .slice(0, 6);

  // Informativo únicamente: si el stock no alcanza, el producto queda
  // "Sobre pedido" (la empresa lo fabrica/consigue), nunca bloquea la compra.
  const backorderItems = items
    .map((item) => {
      const slug = item.id.split("--")[0];
      const producto = products.find((p) => p.slug === slug);
      if (!producto || producto.stock === undefined) return null;
      if (producto.stock <= 0) return { item, disponible: 0 };
      if (producto.stock < item.cantidad) return { item, disponible: producto.stock };
      return null;
    })
    .filter((issue): issue is { item: (typeof items)[number]; disponible: number } => issue !== null);

  return (
    <main className="min-h-screen bg-white text-[#111]">
      {/* <OfferRoulette /> */}
      <section className="mx-auto max-w-[1440px] px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#27B1B8]">
            Carrito de compras
          </h1>
          {items.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="flex items-center gap-1.5 text-sm text-[#6e7379] hover:text-[#e05252] transition-colors"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4h6v2" />
              </svg>
              Vaciar carrito
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/12 bg-[#f8f8f7] p-16 text-center">
            <p className="text-lg text-[#6e7379]">Tu carrito está vacío.</p>
            <Link
              href="/categorias"
              className="mt-6 inline-flex rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-bold text-white hover:bg-[#1E969B] transition-colors"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* Table */}
            <div>
              <div className="overflow-hidden rounded-2xl border border-black/8 bg-white">
                {/* Table header */}
                <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-black/8 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#6e7379] md:grid">
                  <span>Producto</span>
                  <span className="text-center">Precio unitario</span>
                  <span className="text-center">Cantidad</span>
                  <span className="text-right">Subtotal</span>
                </div>

                {/* Rows */}
                {items.map((item, i) => {
                  const unitario = parsePrecio(item.precio);
                  const subtotalItem = unitario * item.cantidad;
                  const originalUnitario = item.precioOriginal ? parsePrecio(item.precioOriginal) : null;
                  const ahorro = originalUnitario ? (originalUnitario - unitario) * item.cantidad : 0;
                  const issue = backorderItems.find((s) => s.item.id === item.id);
                  return (
                    <div
                      key={item.id}
                      className={`grid grid-cols-1 gap-4 px-6 py-5 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center ${
                        i !== 0 ? "border-t border-black/8" : ""
                      }`}
                    >
                      {/* Producto */}
                      <div className="flex gap-4">
                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f8f8f7]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.imagen}
                            alt={item.nombre}
                            className="h-full w-full object-contain p-1"
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug text-[#111]">{item.nombre}</p>
                          {item.colorLabel && (
                            <p className="mt-0.5 text-xs text-[#6e7379]">Color: {item.colorLabel}</p>
                          )}
                          <p className="text-xs text-[#6e7379]">Código: {item.id.split("--")[0].toUpperCase()}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#27B1B8]" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                            <span className="text-[11px] text-[#555]">Envío estimado: 2 días hábiles</span>
                          </div>
                          {issue ? (
                            <span className="mt-1 inline-block rounded bg-[#fff4e5] px-1.5 py-0.5 text-[10px] font-semibold text-[#b5730a]">
                              {issue.disponible <= 0
                                ? "Sobre pedido"
                                : `${issue.disponible} en stock, resto sobre pedido`}
                            </span>
                          ) : (
                            <span className="mt-1 inline-block rounded bg-[#e8f7f0] px-1.5 py-0.5 text-[10px] font-semibold text-[#2a8a5e]">
                              En Stock
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Precio unitario */}
                      <div className="pl-24 text-left md:pl-0 md:text-center">
                        <span className="block text-xs font-normal text-[#6e7379] md:hidden">Precio unitario</span>
                        {originalUnitario && (
                          <span className="block text-xs text-[#aaa] line-through">{formatPrecio(originalUnitario)}</span>
                        )}
                        <span className="font-bold text-[#0C535B]">{formatPrecio(unitario)}</span>
                        {originalUnitario && (
                          <span className="block text-[10px] font-semibold text-[#2a8a5e]">descuento aplicado</span>
                        )}
                      </div>

                      {/* Cantidad */}
                      <div className="flex flex-col items-center gap-1">
                        <span className="block text-xs font-normal text-[#6e7379] md:hidden">Cantidad</span>
                        <div className="flex items-center overflow-hidden rounded-lg border border-black/10">
                          <button
                            type="button"
                            onClick={() => decrementItem(item.id)}
                            className="px-3 py-1.5 text-[#333] hover:bg-[#f5f5f5] transition-colors"
                            aria-label="Disminuir"
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] border-x border-black/10 px-2 py-1.5 text-center text-sm font-semibold">
                            {item.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => incrementItem(item.id)}
                            className="px-3 py-1.5 text-[#333] hover:bg-[#f5f5f5] transition-colors"
                            aria-label="Aumentar"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="text-[11px] text-[#e05252] hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>

                      {/* Subtotal */}
                      <div className="text-right">
                        <span className="block text-xs font-normal text-[#6e7379] md:hidden">Subtotal</span>
                        <span className="font-bold text-[#27B1B8]">{formatPrecio(subtotalItem)}</span>
                        {ahorro > 0 && (
                          <span className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-semibold text-[#2a8a5e]">
                            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            Ahorras {formatPrecio(ahorro)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Seguir comprando */}
              <div className="mt-4">
                <Link
                  href="/categorias"
                  className="inline-flex items-center gap-1.5 text-sm text-[#27B1B8] hover:underline"
                >
                  ← Seguir comprando
                </Link>
              </div>
            </div>

            {/* Order summary */}
            <aside className="h-fit rounded-2xl border border-black/8 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-extrabold text-[#111]">Resumen del pedido</h2>

              {discountPct === 0 && differentProducts > 0 && (
                <div className="mb-4 rounded-xl bg-[#f0fbfc] border border-[#27B1B8]/20 px-3 py-2.5 text-xs text-[#0C535B]">
                  {differentProducts <= 4
                    ? `Agrega ${5 - differentProducts} producto${5 - differentProducts !== 1 ? "s" : ""} más y obtén 5% de descuento`
                    : `Agrega ${11 - differentProducts} producto${11 - differentProducts !== 1 ? "s" : ""} más y obtén 10% de descuento`}
                </div>
              )}

              <div className="mt-4 space-y-2.5 text-sm">
                <div className="flex justify-between text-[#333]">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatPrecio(subtotal)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between rounded-xl bg-[#e8f7f0] px-3 py-2 text-[#2a8a5e]">
                    <span className="font-semibold">🎉 Descuento por variedad ({discountPct}%)</span>
                    <span className="font-bold">-{formatPrecio(discountAmount)}</span>
                  </div>
                )}
                {ahorroTotal > 0 && (
                  <div className="flex justify-between rounded-xl bg-[#e8f7f0] px-3 py-2 text-[#2a8a5e]">
                    <span className="font-semibold">🎉 Ahorro por volumen</span>
                    <span className="font-bold">-{formatPrecio(ahorroTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#333]">
                  <span>Envío estimado</span>
                  <span className="font-semibold text-[#27B1B8]">Envío gratis</span>
                </div>
              </div>

              <div className="my-4 border-t border-black/8" />

              <div className="flex justify-between text-base">
                <span className="font-bold text-[#111]">Total:</span>
                <span className="text-2xl font-extrabold text-[#27B1B8]">{formatPrecio(total)}</span>
              </div>

              {backorderItems.length > 0 && (
                <div className="mt-4 rounded-xl border border-[#f5dca6] bg-[#fff4e5] px-3 py-2.5 text-xs text-[#8a5a06]">
                  <p className="font-semibold">Estos productos quedan sobre pedido:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {backorderItems.map(({ item, disponible }) => (
                      <li key={item.id}>
                        {item.nombre}{" "}
                        {disponible <= 0
                          ? "— se fabrica/consigue para tu pedido"
                          : `— ${disponible} en stock, el resto se fabrica/consigue`}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Link
                href="/checkout"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#0C535B] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Finalizar compra
              </Link>

              <div className="mt-4 flex items-center gap-2 rounded-xl bg-[#f8fafa] px-4 py-3 text-xs text-[#555]">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-[#27B1B8]" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <polyline points="9 12 11 14 15 10" />
                </svg>
                <span>Compra 100% segura · Tus datos están protegidos</span>
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* Trust bar */}
      <section className="mx-auto max-w-[1440px] px-6 py-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/banners-web/BANNER FINALES.png" alt="Kliniu" className="hidden sm:block w-full object-cover" />
      </section>

      {/* Productos recomendados */}
      {recommended.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 py-12">
          <h2 className="mb-6 text-xl font-extrabold tracking-tight text-[#27B1B8]">
            Productos recomendados para ti
          </h2>
          <ProductosCarousel products={recommended} />
        </section>
      )}

      {/* Dato KLINIU banner */}
      <section className="mx-auto hidden max-w-[1440px] px-6 pb-12 md:block">
        <div className="grid items-center gap-6 overflow-hidden rounded-2xl bg-[#f3f7f7] px-6 py-6 sm:px-10 lg:grid-cols-[240px_minmax(320px,1fr)_1.45fr] lg:gap-10">
          <Image
            src="/foca-ventana-dato.png"
            alt="Foca Kliniu"
            width={230}
            height={230}
            className="mx-auto w-[180px] shrink-0 object-contain sm:w-[210px] lg:w-[230px]"
          />
          <div>
            <p className="text-3xl font-black leading-tight text-[#0C535B]">Dato KLINIU</p>
            <p className="mt-5 max-w-[520px] text-lg font-semibold leading-[1.28] text-[#0C535B]">
              Te recomiendo agregar insumos compatibles para evitar reposiciones frecuentes y
              mantener tu sistema siempre funcionando.
            </p>
          </div>
          <div className="grid gap-5 text-[#0C535B] sm:grid-cols-3 sm:divide-x sm:divide-[#0C535B]/50">
            {datoKlinBenefits.map((item) => (
              <div key={item.label} className="flex items-center gap-4 text-left sm:flex-col sm:justify-center sm:gap-3 sm:px-6 sm:text-center">
                {item.icon}
                <p className="whitespace-pre-line text-lg font-semibold leading-[1.05]">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />

      {loginRequiredOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setLoginRequiredOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f0fbfc] text-[#0C535B]">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-lg font-extrabold text-[#111]">Inicia sesión para comprar</h2>
            <p className="mt-2 text-sm text-[#6e7379]">
              Necesitas iniciar sesión para poder finalizar la compra de tus productos.
            </p>
            <div className="mt-5 space-y-2.5">
              <Link
                href="/login?next=/carrito"
                className="flex w-full items-center justify-center rounded-full bg-[#0C535B] px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Iniciar sesión
              </Link>
              <button
                type="button"
                onClick={() => setLoginRequiredOpen(false)}
                className="flex w-full items-center justify-center rounded-full border border-black/12 px-5 py-3 text-sm font-semibold text-[#555] hover:bg-[#f5f5f5] transition-colors"
              >
                Seguir viendo el carrito
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
