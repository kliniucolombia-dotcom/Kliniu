"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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
  const [cotizarOpen, setCotizarOpen] = useState(false);
  const { items, incrementItem, decrementItem, removeItem, clearCart } = useCart();
  const { products } = useProducts();

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

  const stockIssues = items
    .map((item) => {
      const slug = item.id.split("--")[0];
      const producto = products.find((p) => p.slug === slug);
      if (!producto || producto.stock === undefined) return null;
      if (producto.stock <= 0) return { item, disponible: 0 };
      if (producto.stock < item.cantidad) return { item, disponible: producto.stock };
      return null;
    })
    .filter((issue): issue is { item: (typeof items)[number]; disponible: number } => issue !== null);

  const hasStockIssues = stockIssues.length > 0;

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
                  const issue = stockIssues.find((s) => s.item.id === item.id);
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
                            <span className="mt-1 inline-block rounded bg-[#fdecec] px-1.5 py-0.5 text-[10px] font-semibold text-[#c0392b]">
                              {issue.disponible <= 0
                                ? "Sin stock"
                                : `Solo quedan ${issue.disponible} disponibles`}
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

              {hasStockIssues && (
                <div className="mt-4 rounded-xl border border-[#f2b8b5] bg-[#fdecec] px-3 py-2.5 text-xs text-[#c0392b]">
                  <p className="font-semibold">No puedes finalizar la compra:</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {stockIssues.map(({ item, disponible }) => (
                      <li key={item.id}>
                        {item.nombre}{" "}
                        {disponible <= 0
                          ? "no tiene stock disponible"
                          : `— solo quedan ${disponible} unidades`}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1">Ajusta la cantidad o elimínalo del carrito para continuar.</p>
                </div>
              )}

              {hasStockIssues ? (
                <button
                  type="button"
                  disabled
                  className="mt-5 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-full bg-[#c9c9c7] px-5 py-3 text-sm font-bold text-white"
                >
                  Finalizar compra
                </button>
              ) : (
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
              )}

              <button
                type="button"
                onClick={() => setCotizarOpen(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#0C535B] px-5 py-3 text-sm font-bold text-[#0C535B] transition-colors hover:bg-[#f0f8f8]"
              >
                Cotizar este pedido
              </button>

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

      {/* Modal cotización */}
      {cotizarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center bg-black/50 p-0 sm:p-4 backdrop-blur-sm"
          onClick={() => setCotizarOpen(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Franja superior teal */}
            <div className="bg-gradient-to-r from-[#0C535B] to-[#27B1B8] px-6 pt-6 pb-8">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Kliniu</p>
                  <h2 className="mt-1 text-xl font-extrabold text-white">Confirmar pedido</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCotizarOpen(false)}
                  className="rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25 transition-colors"
                  aria-label="Cerrar"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Badge descuento si aplica */}
              {discountPct > 0 && (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-bold text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  Descuento {discountPct}% por variedad aplicado
                </div>
              )}
              {discountPct === 0 && differentProducts > 0 && (
                <div className="mt-4 w-full rounded-2xl overflow-hidden">
                  <div className="relative flex items-center gap-3 bg-gradient-to-r from-[#FF6B00] via-[#FF9500] to-[#FFD000] px-4 py-3 shadow-lg">
                    {/* Pulso animado */}
                    <span className="relative flex h-8 w-8 shrink-0 items-center justify-center">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-30" />
                      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/25 text-lg">
                        🔥
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-white/80">
                        ¡Casi lo tienes!
                      </p>
                      <p className="text-sm font-extrabold text-white leading-tight">
                        {differentProducts <= 4
                          ? <>Agrega <span className="underline decoration-dotted">{5 - differentProducts} producto{5 - differentProducts !== 1 ? "s" : ""} más</span> y obtén <span className="text-base">5% OFF</span></>
                          : <>Agrega <span className="underline decoration-dotted">{11 - differentProducts} producto{11 - differentProducts !== 1 ? "s" : ""} más</span> y obtén <span className="text-base">10% OFF</span></>}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-extrabold text-[#FF6B00] shadow">
                      {differentProducts <= 4 ? "5%" : "10%"} OFF
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Card de totales superpuesta */}
            <div className="-mt-4 mx-4 rounded-2xl bg-white border border-black/8 shadow-md px-5 py-4">
              {/* Lista productos */}
              <div className="max-h-44 overflow-y-auto space-y-2.5 pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imagen}
                      alt={item.nombre}
                      className="h-9 w-9 rounded-lg object-contain bg-[#f8f8f7] p-0.5 shrink-0"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                    />
                    <span className="flex-1 text-xs font-medium text-[#222] leading-tight line-clamp-2">{item.nombre}</span>
                    <span className="text-[11px] text-[#999] mr-1">×{item.cantidad}</span>
                    <span className="text-xs font-bold text-[#0C535B] whitespace-nowrap">
                      {formatPrecio(parsePrecio(item.precio) * item.cantidad)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Separador */}
              <div className="my-3 border-t border-dashed border-black/10" />

              {/* Desglose financiero */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-[#555]">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatPrecio(subtotal)}</span>
                </div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-[#2a8a5e] font-semibold">
                    <span>Descuento {discountPct}% ({differentProducts} productos)</span>
                    <span>−{formatPrecio(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[#555]">
                  <span>Envío</span>
                  <span className="font-semibold text-[#27B1B8]">Gratis</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-[#f0fbfc] px-4 py-3">
                <span className="font-extrabold text-[#0C535B]">Total a pagar</span>
                <span className="text-2xl font-extrabold text-[#0C535B]">{formatPrecio(total)}</span>
              </div>
            </div>

            {/* Botones */}
            <div className="px-4 py-5 space-y-2.5">
              <Link
                href="/checkout"
                onClick={() => setCotizarOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[#0C535B] px-5 py-3.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Confirmar y pagar
              </Link>
              <button
                type="button"
                onClick={() => setCotizarOpen(false)}
                className="flex w-full items-center justify-center rounded-full border border-black/12 px-5 py-3 text-sm font-semibold text-[#555] hover:bg-[#f5f5f5] transition-colors"
              >
                Seguir comprando
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
