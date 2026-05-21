"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import WhatsAppAsesor from "../../components/whatsapp-asesor";
import { useParams } from "next/navigation";
import { useCart } from "../../components/cart-provider";
import { useProducts } from "../../components/products-provider";
import SiteFooter from "../../components/site-footer";
import QuoteModal from "../../components/quote-modal";
import { getVolumePricing, parsePriceValue } from "@/lib/volume-discounts";
import type { ProductoEspecificacion } from "../../data/catalog";

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


function ImageGallery({ nombre, images }: { nombre: string; images: string[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="flex gap-3">
      {/* Thumbnail strip */}
      <div className="flex flex-col gap-2">
        {images.map((src, i) => (
          <button
            key={`thumb-${i}`}
            type="button"
            onClick={() => setActive(i)}
            className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 transition-all ${
              active === i ? "border-[#27B1B8]" : "border-black/8 hover:border-[#27B1B8]/40"
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
      </div>

      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-black/8 bg-white p-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={images[active] || "/product-placeholder.png"}
          alt={nombre}
          className="h-full w-full object-contain"
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
        />
      </div>
    </div>
  );
}

export default function ProductoDetallePage() {
  const params = useParams<{ slug: string }>();
  const { products } = useProducts();
  const { addItem } = useCart();
  const [cantidad, setCantidad] = useState(1);
  const [colorActivo, setColorActivo] = useState(0);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [agregado, setAgregado] = useState(false);
  const agregadoTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slug = params.slug;
  const producto = products.find((p) => p.slug === slug);

  const handleAddToCart = () => {
    if (!producto || producto.puedeComprar === false) return;
    const pricing = getVolumePricing(producto.precio, cantidad);
    addItem({
      id: producto.slug,
      nombre: producto.nombre,
      precio: pricing.unitPriceLabel,
      precioOriginal: pricing.hasDiscount ? producto.precio : undefined,
      imagen: producto.imagen,
      cantidad,
    });
    setAgregado(true);
    if (agregadoTimeout.current) clearTimeout(agregadoTimeout.current);
    agregadoTimeout.current = setTimeout(() => setAgregado(false), 1200);
  };

  const variacionesColor = producto?.variacionesColor ?? [];

  // Prepend the base product image as "Blanco" when there are other color variants
  const allVariants = useMemo(() => {
    if (!producto || variacionesColor.length === 0) return [];
    return [
      { color: "#ffffff", label: "Blanco", image: producto.imagen },
      ...variacionesColor,
    ];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto]);

  const galleryImages = useMemo(() => {
    if (!producto) return [];
    if (allVariants.length > 0) {
      const selected = allVariants[colorActivo]?.image ?? producto.imagen;
      const others = allVariants.filter((_, i) => i !== colorActivo).map((v) => v.image);
      return [selected, ...others, ...(producto.imagenesExtra || [])].filter(Boolean);
    }
    return [producto.imagen, ...(producto.imagenesExtra || [])].filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [producto, colorActivo, allVariants]);

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

  const ajustar = (delta: number) => {
    setCantidad((n) => Math.min(Math.max(1, n + delta), producto.stock ?? 99));
  };

  const relacionados = products
    .filter((p) => p.categoria === producto.categoria && p.slug !== producto.slug)
    .slice(0, 4);
  const volumePricing = getVolumePricing(producto.precio, cantidad);

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
        <div className="grid gap-10 lg:grid-cols-[1fr_480px] xl:grid-cols-[1fr_520px]">

          {/* LEFT — image gallery */}
          <ImageGallery key={colorActivo} nombre={producto.nombre} images={galleryImages} />

          {/* RIGHT — product info */}
          <div className="space-y-5">
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
              </h1>
              {producto.sku && (
                <p className="mt-1.5 text-xs text-[#6e7379]">
                  Código: <span className="font-medium text-[#444]">{producto.sku}</span>
                </p>
              )}
            </div>

            {/* Price */}
            <div>
              <p className="text-3xl font-extrabold text-[#111]">{producto.precio}</p>
              {producto.precioAnterior && (
                <p className="mt-1 text-sm text-[#aaa] line-through">{producto.precioAnterior}</p>
              )}
            </div>

            {/* Color */}
            {allVariants.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold text-[#333]">
                  Colores disponibles: <span className="font-normal text-[#555]">{allVariants[colorActivo]?.label}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {allVariants.map((v, i) => (
                    <button
                      key={v.color}
                      type="button"
                      onClick={() => setColorActivo(i)}
                      aria-label={v.label}
                      title={v.label}
                      className={`h-7 w-7 rounded-full border-2 shadow-sm transition-all ${
                        colorActivo === i
                          ? "ring-2 ring-[#27B1B8] ring-offset-2"
                          : "hover:ring-1 hover:ring-[#27B1B8]/50 hover:ring-offset-1"
                      }`}
                      style={{
                        background: v.color,
                        borderColor: v.color === "#ffffff" || v.color === "#fff" || v.color.toLowerCase() === "white"
                          ? "rgba(0,0,0,0.15)"
                          : "rgba(0,0,0,0.08)",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + CTA */}
            <div className="space-y-3">
              <p className="text-sm font-semibold text-[#333]">Cantidad</p>
              <div className="flex items-center gap-3">
                <div className="flex items-center overflow-hidden rounded-xl border border-black/12">
                  <button
                    type="button"
                    onClick={() => ajustar(-1)}
                    className="px-4 py-2.5 text-lg font-medium text-[#333] hover:bg-[#f5f5f5]"
                    aria-label="Disminuir"
                  >
                    −
                  </button>
                  <span className="min-w-[2.5rem] border-x border-black/10 px-3 py-2.5 text-center text-base font-semibold">
                    {cantidad}
                  </span>
                  <button
                    type="button"
                    onClick={() => ajustar(1)}
                    className="px-4 py-2.5 text-lg font-medium text-[#333] hover:bg-[#f5f5f5]"
                    aria-label="Aumentar"
                  >
                    +
                  </button>
                </div>
                {volumePricing.hasDiscount && (
                  <span className="rounded-full bg-[#EAF8F7] px-3 py-1.5 text-xs font-bold text-[#0C535B]">
                    {volumePricing.tier.pct}% off por volumen
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={producto.puedeComprar === false}
                  onClick={handleAddToCart}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors"
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
                  onClick={() => setQuoteOpen(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: "#1a1a2e" }}
                >
                  Cotiza ahora
                </button>
              </div>
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
      <section className="border-y border-black/8 bg-[#f8fafa]">
        <div className="mx-auto max-w-[1440px] px-6 py-5">
          <div className="flex divide-x divide-black/8">
            {trustBar.map((t) => (
              <div key={t.label} className="flex flex-1 items-center gap-3 px-4 first:pl-0 last:pr-0">
                <span className="shrink-0 text-[#27B1B8]">{t.icon}</span>
                <span className="text-xs font-semibold leading-snug text-[#0C535B]">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related products ── */}
      {relacionados.length > 0 && (
        <section className="mx-auto max-w-[1440px] px-6 py-14">
          <h2 className="mb-6 text-2xl font-extrabold tracking-tight text-[#111]">
            Productos relacionados
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {relacionados.map((p) => (
              <Link
                key={p.slug}
                href={`/producto/${p.slug}`}
                className="group overflow-hidden rounded-2xl border border-black/8 bg-white transition-shadow hover:shadow-md"
              >
                <div className="flex h-44 items-center justify-center bg-white p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.imagen}
                    alt={p.nombre}
                    className="max-h-36 w-auto object-contain"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png"; }}
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold leading-snug text-[#111] group-hover:text-[#27B1B8]">
                    {p.nombre}
                  </p>
                  <p className="mt-1.5 font-bold text-[#27B1B8]">{p.precio}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── ¿Necesitas ayuda? ── */}
      <section className="px-6 pb-24 pt-16">
        <div className="mx-auto max-w-[1440px]">
          <div
            className="relative flex items-center rounded-2xl border border-black/8 bg-white pr-6 md:pr-8"
            style={{ minHeight: 96 }}
          >
            <div className="absolute left-2 top-1/2 h-[272px] w-[238px] -translate-y-1/2">
              <Image src="/foca-celular-ayuda.png" alt="Foca Kliniu" fill className="object-contain object-bottom" />
            </div>
            <div className="w-[248px] shrink-0" />

            <div className="min-w-0 flex-1 py-5 pl-5">
              <p className="font-bold text-[#0C535B]">¿Necesitas ayuda para elegir?</p>
              <p className="mt-0.5 text-sm text-[#6e7379]">
                Nuestro equipo de expertos está listo para asesorarte sin compromiso
              </p>
            </div>

            {(() => {
              const WaIcon = () => (
                <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0 text-[#27B1B8]" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
                </svg>
              );
              return (
                <div className="hidden items-center gap-5 lg:flex">
                  {["Asesoría gratuita sin compromiso.", "Respuesta rápida por WhatsApp", "Cotizaciones personalizadas"].map((txt) => (
                    <div key={txt} className="flex items-center gap-2 text-xs text-[#555]">
                      <WaIcon />
                      <span className="max-w-[90px] leading-tight">{txt}</span>
                    </div>
                  ))}
                </div>
              );
            })()}

            <WhatsAppAsesor className="ml-6 shrink-0 rounded-full bg-[#073F43] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
              Hablar con un asesor 💬
            </WhatsAppAsesor>
          </div>
        </div>
      </section>

      <QuoteModal
        open={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        productoId={producto.slug}
        productoNombre={producto.nombre}
        productoPrecio={producto.precio}
        productoImagen={producto.imagen}
        addItem={addItem}
      />
      <SiteFooter />
    </main>
  );
}
