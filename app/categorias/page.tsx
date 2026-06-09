"use client";

import {
  type Dispatch,
  type SetStateAction,
  startTransition,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "../components/cart-provider";
import WhatsAppAsesor from "../components/whatsapp-asesor";
import AsesorBanner from "../components/asesor-banner";
import { useProducts } from "../components/products-provider";
import {
  categoriaDesdeSlug,
  categoriasData,
  categoriaMeta,
  categorias,
  type ProductoCatalogo,
  slugCategoria,
} from "../data/catalog";
import SiteFooter from "../components/site-footer";

const ITEMS_PER_PAGE = 10;

/* ─────────────────────── Dropdown Filtro ─────────────────────── */
function DropdownFiltro({
  label,
  opciones,
  activos,
  onChange,
}: {
  label: string;
  opciones: readonly string[];
  activos: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (valor: string) => {
    onChange(
      activos.includes(valor)
        ? activos.filter((v) => v !== valor)
        : [...activos, valor],
    );
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex items-center gap-1.5 rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-medium text-[#111] transition-colors hover:border-[#27B1B8]/50"
      >
        {label}
        {activos.length > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#27B1B8] text-[9px] font-bold text-white">
            {activos.length}
          </span>
        )}
        <svg viewBox="0 0 12 12" className="h-3 w-3 opacity-40" fill="currentColor">
          <path d="M6 8L1 3h10z" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 min-w-[180px] rounded-2xl border border-black/8 bg-white p-2 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
          {opciones.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-[#333] hover:bg-[#f5f5f5]"
            >
              <input
                type="checkbox"
                checked={activos.includes(opt)}
                onChange={() => toggle(opt)}
                className="h-4 w-4 rounded border-slate-300 accent-[#27B1B8]"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── Tarjeta Producto ─────────────────────── */
function TarjetaProducto({ producto }: { producto: ProductoCatalogo }) {
  const { addItem } = useCart();
  const router = useRouter();
  const [agregado, setAgregado] = useState(false);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const handleAddToCart = () => {
    if (producto.puedeComprar === false) return;
    addItem({ id: producto.slug, nombre: producto.nombre, precio: producto.precio, imagen: producto.imagen });
    setAgregado(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAgregado(false), 1400);
  };
  const goToDetail = () => router.push(`/producto/${producto.slug}`);

  const tipoBadge = producto.descripcion?.split("·")[0]?.trim();
  const variaciones = producto.variacionesColor ?? [];
  const imagenActual = hoveredColor
    ? (variaciones.find((v) => v.color === hoveredColor)?.image ?? producto.imagen)
    : producto.imagen;

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={goToDetail}
      onKeyDown={(event) => {
        if (event.currentTarget !== event.target) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          goToDetail();
        }
      }}
      className="interactive-lift group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-black/8 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#27B1B8]"
      aria-label={`Ver detalle de ${producto.nombre}`}
    >
      {/* Badge */}
      {producto.destacado && (
        <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#f5a623] px-2.5 py-1 text-[10px] font-bold text-white">
          Más vendido
        </span>
      )}

      {/* Image */}
      <div className="relative flex h-44 items-center justify-center bg-white px-6 py-4">
        {/* Preload variant images */}
        {variaciones.map((v) => v.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={v.color} src={v.image} alt="" aria-hidden className="hidden" />
        ))}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenActual || "/product-placeholder.png"}
          alt={producto.nombre}
          loading="lazy"
          className="image-lift max-h-36 w-auto max-w-full object-contain transition-opacity duration-150"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/product-placeholder.png";
          }}
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col border-t border-black/5 p-4">
        <h3 className="line-clamp-3 h-[54px] text-sm font-semibold leading-snug text-[#111]">
          {producto.nombre}
        </h3>

        {/* Description */}
        <p className="mt-1 line-clamp-3 h-[48px] text-[11px] leading-snug text-[#6e7379]">
          {tipoBadge ?? ""}
        </p>

        {/* Color swatches */}
        {variaciones.length > 0 ? (
          <div className="flex min-h-[20px] items-center gap-1.5">
            {variaciones.map((v) => (
              <button
                key={v.color}
                type="button"
                title={v.label}
                onClick={(event) => event.stopPropagation()}
                onMouseEnter={() => setHoveredColor(v.color)}
                onMouseLeave={() => setHoveredColor(null)}
                className={`h-4 w-4 rounded-full border transition-transform duration-150 hover:scale-125 ${
                  hoveredColor === v.color ? "border-[#27B1B8] scale-125" : "border-black/20"
                }`}
                style={{ background: v.color }}
              />
            ))}
            {hoveredColor && (
              <span className="ml-1 text-[10px] font-medium text-[#64748B]">
                {variaciones.find((v) => v.color === hoveredColor)?.label}
              </span>
            )}
          </div>
        ) : <div className="min-h-[20px]" />}

        <p className="mt-auto pt-2 text-lg font-bold text-[#111]">{producto.precio}</p>

        <div className="flex gap-2 pt-2">
          <Link
            href={`/producto/${producto.slug}`}
            onClick={(event) => event.stopPropagation()}
            className="shine-sweep flex-1 rounded-full border border-[#27B1B8] px-3 py-2 text-center text-xs font-semibold text-[#27B1B8] transition-colors hover:bg-[#27B1B8] hover:text-white"
          >
            Ver detalle
          </Link>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleAddToCart();
            }}
            disabled={producto.puedeComprar === false}
            aria-label={`Agregar ${producto.nombre} al carrito`}
            className={`pulse-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
              agregado ? "bg-[#d4621a] text-white" : "bg-[#F07826] text-white hover:bg-[#d4621a]"
            }`}
          >
            {agregado ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

/* ─────────────────────── Vista landing categorías ─────────────────────── */
function LandingCategorias({ onSelect }: { onSelect: (cat: string) => void }) {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero sub-banner */}
      <section className="home-reveal border-b border-black/8 bg-[#f8f8f7] px-6 py-10">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="animated-heading text-3xl font-extrabold tracking-tight text-[#0C535B]">
            Encuentra tu dispensador ideal
          </h1>
          <p className="mt-2 text-sm text-[#6e7379]">
            Selecciona la categoría que necesitas
          </p>
        </div>
      </section>

      {/* Category cards */}
      <section className="home-reveal px-6 py-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="motion-list grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {categoriasData.filter((cat) => cat.nombre !== "Outlet" && cat.nombre !== "Insumos/Repuesto").map((cat) => (
              <button
                key={cat.nombre}
                type="button"
                onClick={() => onSelect(cat.nombre)}
                className="motion-card interactive-lift group flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-black/8 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-[#27B1B8]/40 hover:shadow-md"
              >
                <div className="flex h-36 w-full items-center justify-center overflow-hidden rounded-xl bg-white px-4 py-3">
                  {cat.iconoImagen && (
                    <Image
                      src={cat.iconoImagen}
                      alt={cat.nombre}
                      width={190}
                      height={120}
                      className="image-lift max-h-[112px] w-auto max-w-full object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  )}
                </div>
                <p className="text-sm font-semibold text-[#0C535B] group-hover:text-[#27B1B8]">
                  {cat.nombre}
                </p>
              </button>
            ))}

            {/* CTA card */}
            <div className="motion-card interactive-lift flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#27B1B8]/25 bg-[#e8f5f5] p-6 text-center">
              <Image
                src="/kliniu-loader-logo.png"
                alt="Kliniu"
                width={64}
                height={64}
                className="image-lift object-contain"
              />
              <div>
                <p className="text-sm font-bold leading-snug text-[#0C535B]">
                  ¿No sabes cuál necesitas?
                </p>
                <p className="mt-1 text-xs text-[#3a7a80]">
                  Te ayudamos a elegir la mejor solución para tu espacio.
                </p>
              </div>
              <WhatsAppAsesor className="shine-sweep inline-flex items-center gap-1.5 rounded-full bg-[#0C535B] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90">
                Te asesoramos
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                </svg>
              </WhatsAppAsesor>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

/* ─────────────────────── helpers filtro ─────────────────────── */
function getSpec(p: ProductoCatalogo, etiqueta: string) {
  const target = etiqueta.toLowerCase();
  return (
    p.especificacionesTecnicas?.find(
      (e) => e.etiqueta.trim().toLowerCase() === target,
    )?.valor.trim() ?? ""
  );
}

function getProductText(p: ProductoCatalogo, includeApplication = true) {
  return [
    p.nombre,
    p.descripcion,
    includeApplication ? p.aplicacion : "",
    p.especificacionesTecnicas
      ?.map((e) => `${e.etiqueta}: ${e.valor}`)
      .join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

function getAutoManual(p: ProductoCatalogo): string | null {
  const text = getProductText(p).toLowerCase();
  if (text.includes("automático") || text.includes("automatico")) return "Automático";
  if (text.includes("manual")) return "Manual";
  return null;
}

function normalizeFilterValue(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeCapacity(value: string) {
  const match = value.match(
    /\b(\d{1,4}(?:[.,]\d{1,3})?)\s*(ml|l|lt|litro|litros|cepillo|cepillos|c[aá]mara|c[aá]maras)\b/i,
  );
  if (!match) return normalizeFilterValue(value);

  const numeric = match[1].replace(/[.,]/g, "");
  const unitMap: Record<string, string> = {
    litro: "L",
    litros: "L",
    lt: "L",
    l: "L",
    ml: "ml",
    cepillo: "cepillo",
    cepillos: "cepillos",
    camara: "cámaras",
    "cámara": "cámaras",
    camaras: "cámaras",
    "cámaras": "cámaras",
  };
  const unit = unitMap[match[2].toLowerCase()] ?? match[2].toLowerCase();
  const amount = Number(numeric);
  const formatted = Number.isFinite(amount)
    ? new Intl.NumberFormat("es-CO").format(amount)
    : match[1];

  return `${formatted} ${unit}`;
}

function getCapacidad(p: ProductoCatalogo) {
  const spec = getSpec(p, "Capacidad");
  if (spec) return normalizeCapacity(spec);

  const text = [p.nombre, p.descripcion].filter(Boolean).join(" ");
  const match = text.match(
    /\b\d{1,4}(?:[.,]\d{1,3})?\s*(?:ml|l|lt|litro|litros|cepillo|cepillos|c[aá]mara|c[aá]maras)\b/i,
  );
  return match ? normalizeCapacity(match[0]) : "";
}

const MATERIAL_MATCHERS: Array<[string, RegExp]> = [
  ["Acero inoxidable", /\bacero\s+inoxidable\b|\binoxidable\b/i],
  ["ABS", /\babs\b/i],
  ["Aluminio", /\baluminio\b/i],
  ["Brass", /\bbrass\b/i],
  ["Metal", /\bmetal(?:ico|ico)?\b/i],
  ["PET", /\bpet\b/i],
  ["Policarbonato", /\bpolicarbonato\b/i],
  ["Polietileno", /\bpolietileno\b|\bpe\b/i],
  ["Polipropileno", /\bpolipropileno\b|\bpp\b/i],
  ["Plástico", /\bpl[aá]stico\b/i],
];

function getMateriales(p: ProductoCatalogo): string[] {
  const explicit = getSpec(p, "Material")
    .split(/[,/]+| y /i)
    .map(normalizeFilterValue)
    .filter(Boolean);
  const text = getProductText(p);
  const found = MATERIAL_MATCHERS.filter(([, matcher]) => matcher.test(text)).map(
    ([label]) => label,
  );

  return [...new Set([...explicit, ...found])];
}

const COLOR_MATCHERS: Array<[string, RegExp]> = [
  ["Amarillo", /\bamarillo\b/i],
  ["Azul", /\bazul\b/i],
  ["Beige", /\bbeige\b/i],
  ["Blanco", /\bblanc[oa]s?\b/i],
  ["Cromado", /\bcromad[oa]s?\b/i],
  ["Gris", /\bgris(?:es)?\b/i],
  ["Negro", /\bnegr[oa]s?\b/i],
  ["Plateado", /\bplatead[oa]s?\b/i],
  ["Rojo", /\broj[oa]s?\b/i],
  ["Transparente", /\btransparente(?:s)?\b/i],
  ["Verde", /\bverde(?:s)?\b/i],
];

function getColores(p: ProductoCatalogo): string[] {
  const text = getProductText(p);
  const explicit = getSpec(p, "Color")
    .split(/[,/]+| y /i)
    .map(normalizeFilterValue)
    .filter(Boolean);
  const inferred = COLOR_MATCHERS.filter(([, matcher]) => matcher.test(text)).map(
    ([label]) => label,
  );
  const variants = (p.variacionesColor ?? []).map((v) => v.label);

  return [...new Set([...explicit, ...inferred, ...variants].filter(Boolean))];
}

function derivarOpcionesFiltros(productos: ProductoCatalogo[]) {
  const am = [...new Set(productos.map(getAutoManual).filter(Boolean) as string[])].sort();
  const cap = [...new Set(productos.map(getCapacidad).filter(Boolean))].sort();
  const mat = [...new Set(productos.flatMap(getMateriales).filter(Boolean))].sort();
  const col = [...new Set(productos.flatMap(getColores).filter(Boolean))].sort();
  return { "Automático / Manual": am, Capacidad: cap, Material: mat, Color: col };
}

function aplicarFiltros(productos: ProductoCatalogo[], filtros: FiltrosState) {
  return productos.filter((p) => {
    if (filtros["Automático / Manual"]?.length > 0) {
      const val = getAutoManual(p);
      if (!val || !filtros["Automático / Manual"].includes(val)) return false;
    }
    if (filtros["Capacidad"]?.length > 0) {
      const cap = getCapacidad(p);
      if (!filtros["Capacidad"].includes(cap)) return false;
    }
    if (filtros["Material"]?.length > 0) {
      const materiales = getMateriales(p);
      if (!filtros["Material"].some((m) => materiales.includes(m))) return false;
    }
    if (filtros["Color"]?.length > 0) {
      const colores = getColores(p);
      if (!filtros["Color"].some((c) => colores.includes(c))) return false;
    }
    return true;
  });
}

type FiltrosState = Record<string, string[]>;

function InsumosRepuestosPage({
  productosPagina,
  totalPaginas,
  pagina,
  setPagina,
  filtros,
  setFiltros,
  hayFiltros,
  opcionesFiltros,
}: {
  productosPagina: ProductoCatalogo[];
  totalPaginas: number;
  pagina: number;
  setPagina: (pagina: number) => void;
  filtros: FiltrosState;
  setFiltros: Dispatch<SetStateAction<FiltrosState>>;
  hayFiltros: boolean;
  opcionesFiltros: Record<string, string[]>;
}) {
  return (
    <main className="min-h-screen bg-white text-[#073F43]">
      <section className="home-reveal bg-white">
        <div className="relative aspect-[2400/500] overflow-hidden bg-[#ead0bd] md:aspect-[2400/500] aspect-[4/3]">
          <Image
            src="/insumos/banner-insumos-repuestos.jpg"
            alt="Insumos y repuestos Kliniu"
            fill
            priority
            sizes="100vw"
            className="hero-drift hidden object-cover object-center md:block"
          />
          <Image
            src="/resp-banner-insumos.jpg"
            alt="Insumos y repuestos Kliniu"
            fill
            priority
            sizes="100vw"
            className="hero-drift object-cover object-center md:hidden"
          />
          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto flex h-full w-full max-w-[1440px] items-center px-6 sm:px-10 lg:px-14">
            <div className="flex w-[48%] flex-col justify-center">
            <h1 className="hero-pop text-[clamp(1.8rem,3.5vw,4.2rem)] font-black leading-[0.98] tracking-tight text-[#073F43]">
              Insumos
              <br />
              <span className="text-[#16A6AE]">y repuestos</span>
            </h1>
            <p className="mt-4 max-w-[320px] text-[11px] font-semibold leading-5 text-[#073F43] sm:text-sm">
              Todo lo que tu espacio necesita para operar de forma eficaz y continua.
            </p>
            <div className="motion-list mt-6 hidden w-fit items-center gap-0 rounded-sm bg-white/92 px-3 py-2 shadow-[0_8px_18px_rgba(7,63,67,0.08)] md:flex">
              {[
                { label: "Calidad Kliniu", icon: "/iconos/garantia.png" },
                { label: "Compatibilidad garantizada", icon: "/iconos/compatibilidad.png" },
                { label: "Entrega rápida", icon: "/iconos/envio-rapido.png" },
              ].map((beneficio, index) => (
                <div key={beneficio.label} className="motion-card flex items-center gap-2 px-3 text-[10px] font-bold leading-tight text-[#073F43]">
                  {index > 0 && <span className="-ml-3 mr-1 h-7 border-l border-[#073F43]/15" />}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={beneficio.icon} alt="" className="feature-icon-pop h-7 w-7 shrink-0 object-contain" />
                  <span className="max-w-[86px]">{beneficio.label}</span>
                </div>
              ))}
            </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-reveal mx-auto max-w-[1440px] px-4 pb-12 pt-10 sm:px-6">
        <h2 className="animated-heading mb-6 text-xl font-black text-[#16A6AE]">
          Encuentra tus insumos y repuestos ideales.
        </h2>

        <div className="mb-7 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-[#073F43] px-3 py-1.5 text-xs font-black text-[#073F43]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Filtro
          </span>
          <button
            type="button"
            onClick={() => setFiltros({})}
            disabled={!hayFiltros}
            className="rounded-md px-2 py-1.5 text-xs font-bold text-[#073F43] transition-opacity disabled:cursor-default disabled:opacity-70"
          >
            Borrar Filtros
          </button>
          <div className="ml-auto flex flex-wrap gap-2">
            {Object.entries(opcionesFiltros).filter(([, opts]) => opts.length > 0).map(([label, opciones]) => (
              <DropdownFiltro
                key={label}
                label={label}
                opciones={opciones}
                activos={filtros[label] ?? []}
                onChange={(vals) => setFiltros((prev) => ({ ...prev, [label]: vals }))}
              />
            ))}
          </div>
        </div>

        {productosPagina.length > 0 ? (
          <div className="motion-list grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {productosPagina.map((producto) => (
              <TarjetaProducto key={producto.slug} producto={producto} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/12 bg-[#f8f8f7] p-12 text-center text-[#6e7379]">
            No encontramos productos con esos filtros.
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="mt-10 flex justify-end gap-1.5">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPagina(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex h-7 min-w-7 items-center justify-center rounded-md border px-2 text-xs font-black transition-colors ${
                  pagina === p
                    ? "border-[#073F43] bg-[#073F43] text-white"
                    : "border-[#073F43] bg-white text-[#073F43] hover:bg-[#EAF8F7]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6">
        <div className="home-reveal interactive-lift relative aspect-[1611/336] overflow-hidden rounded-2xl bg-[#ead0bd] shadow-[0_8px_24px_rgba(7,63,67,0.10)]">
          <Image
            src="/insumos/banner-reposicion.png"
            alt="Reposición fácil Kliniu"
            fill
            sizes="100vw"
            className="hero-drift object-cover object-center"
          />
          <div className="absolute inset-y-0 left-0 flex w-[48%] flex-col justify-center px-7 sm:px-10 lg:px-14">
            <p className="hero-pop text-[clamp(1.05rem,2.1vw,2rem)] font-black leading-none text-[#073F43]">
              Reposición fácil,
              <br />
              <span className="text-[#16A6AE]">operación continua</span>
            </p>
            <p className="mt-3 max-w-[300px] text-[11px] font-semibold leading-4 text-[#073F43] sm:text-sm">
              Mantén tus espacios siempre abastecidos con todo lo que necesitas.
            </p>
            <ul className="mt-3 hidden space-y-1.5 text-xs font-bold text-[#073F43] md:block">
              {[
                "Compatible con todos nuestros dispensadores",
                "Insumos de alto rendimiento y calidad",
                "Pedidos ágiles y entregas confiables",
              ].map((item) => (
                <li key={item} className="puntos-check-row flex items-center gap-2">
                  <span className="pulse-ring flex h-4 w-4 items-center justify-center rounded-full bg-[#16A6AE] text-[9px] text-white">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="home-reveal px-6" style={{ paddingTop: 160, paddingBottom: 140 }}>
        <div className="mx-auto max-w-[1440px]">
          <AsesorBanner />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

export default function CategoriasPage() {
  const { products } = useProducts();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tipoActivo = searchParams.get("tipo");
  const categoriaActiva = categoriaDesdeSlug(searchParams.get("categoria"));
  const catMeta = categoriaMeta(categoriaActiva ?? categorias[0]);
  const queryActiva = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const [filtros, setFiltros] = useState<FiltrosState>({});
  const pageKey = `${tipoActivo ?? ""}|${categoriaActiva ?? ""}|${queryActiva}`;
  const [paginaState, setPaginaState] = useState({ key: pageKey, value: 1 });
  const pagina = paginaState.key === pageKey ? paginaState.value : 1;
  const setPagina = (value: number) => setPaginaState({ key: pageKey, value });
  const setFiltrosAndReset: Dispatch<SetStateAction<FiltrosState>> = (updater) => {
    setFiltros((current) =>
      typeof updater === "function"
        ? (updater as (previous: FiltrosState) => FiltrosState)(current)
        : updater,
    );
    setPaginaState({ key: pageKey, value: 1 });
  };

  const productosPorCategoria = products.filter((p) => {
    const esInsumos = tipoActivo === "insumos";
    const coincideCategoria = esInsumos
      ? p.categoria === "Insumos/Repuesto"
      : !categoriaActiva || p.categoria === categoriaActiva;
    const coincideBusqueda =
      !queryActiva ||
      p.nombre.toLowerCase().includes(queryActiva) ||
      p.marca.toLowerCase().includes(queryActiva) ||
      (p.descripcion ?? "").toLowerCase().includes(queryActiva);
    return coincideCategoria && coincideBusqueda;
  });

  const opcionesFiltros = derivarOpcionesFiltros(productosPorCategoria);
  const productosFiltrados = aplicarFiltros(productosPorCategoria, filtros);

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE));
  const productosPagina = productosFiltrados.slice(
    (pagina - 1) * ITEMS_PER_PAGE,
    pagina * ITEMS_PER_PAGE,
  );

  const hayFiltros = Object.values(filtros).some((v) => v.length > 0);

  const irACategoria = (categoria: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("categoria", slugCategoria(categoria));
    params.delete("tipo");
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  // Hero title
  const tituloLinea1 = catMeta.heroTitulo1 ?? catMeta.nombre.split(" ").slice(0, 2).join(" ");
  const tituloLinea2 = catMeta.heroTitulo2 ?? "";
  const tituloDestacado = catMeta.heroDestacado ?? catMeta.nombre.split(" ").slice(2).join(" ");
  const dark = catMeta.textoDark ?? false;

  // Heading for product grid
  const headingCategoria: Record<string, string> = {
    "Dispensadores para líquidos": "Encuentra el dispensador de líquidos ideal",
    "Dispensadores de papel, toalla y servilletas": "Encuentra el dispensador de papel ideal",
    "KlinOx Acero Inoxidable": "Encuentra tu dispensador de acero inoxidable ideal",
    "Dispensador de crema dental": "Encuentra tu dispensador de crema dental ideal",
    "Hoteles y Restaurantes": "Encuentra tu dispensador de acero inoxidable ideal",
  };

  if (tipoActivo === "insumos") {
    return (
      <InsumosRepuestosPage
        productosPagina={productosPagina}
        totalPaginas={totalPaginas}
        pagina={pagina}
        setPagina={setPagina}
        filtros={filtros}
        setFiltros={setFiltrosAndReset}
        hayFiltros={hayFiltros}
        opcionesFiltros={opcionesFiltros}
      />
    );
  }

  // Show landing if no category selected
  if (!categoriaActiva && !queryActiva) {
    return <LandingCategorias onSelect={irACategoria} />;
  }

  return (
    <main className="min-h-screen bg-white text-[#111]">
      {/* ── Hero banner ── */}
      <section className={`home-reveal hero-energy relative overflow-hidden ${dark ? "bg-white" : "bg-[#0a0f14]"}`}>
        {/* Imagen desktop */}
        {(catMeta.heroBannerImagen ?? catMeta.bannerImagen) && (
          <Image
            src={(catMeta.heroBannerImagen ?? catMeta.bannerImagen)!}
            alt={catMeta.nombre}
            fill
            priority
            sizes="100vw"
            className={`hero-drift object-cover object-center ${catMeta.heroBannerMovil ? "hidden md:block" : ""} ${dark ? "opacity-100" : "opacity-60"}`}
          />
        )}
        {/* Imagen móvil */}
        {catMeta.heroBannerMovil && (
          <Image
            src={catMeta.heroBannerMovil}
            alt={catMeta.nombre}
            fill
            priority
            sizes="100vw"
            className={`hero-drift object-cover object-center md:hidden ${dark ? "opacity-100" : "opacity-60"}`}
          />
        )}
        <div className="relative mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8 md:py-10">
          <h1 className={`hero-pop text-2xl font-extrabold leading-tight tracking-tight sm:text-4xl md:text-5xl ${dark ? "text-[#0a0f14]" : "text-white"}`}>
            {tituloLinea1}
            <br />
            {tituloLinea2}<span className="text-[#27B1B8]">{tituloDestacado}</span>
          </h1>
          <p className={`mt-2 max-w-md text-xs leading-5 sm:mt-3 sm:text-sm sm:leading-6 ${dark ? "text-[#3a4a4b]" : "text-white/70"}`}>
            {catMeta.bannerCopy}
          </p>
          {catMeta.beneficiosHero && (
            <div className="motion-list mt-4 flex flex-wrap gap-2">
              {catMeta.beneficiosHero.map((b) => (
                <div
                  key={b.texto}
                  className={`motion-card interactive-lift flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold leading-tight sm:gap-2.5 sm:px-3 sm:py-2 sm:text-xs ${
                    dark
                      ? "border-black/12 bg-white/80 text-[#1A1A1A]"
                      : "border-white/20 bg-white/10 text-white"
                  }`}
                >
                  {b.imagen ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={b.imagen} alt="" className="feature-icon-pop h-6 w-6 shrink-0 object-contain sm:h-7 sm:w-7" />
                  ) : (
                    <span className="text-base leading-none sm:text-lg">{b.icono}</span>
                  )}
                  <span className="max-w-[100px] sm:max-w-[120px]">{b.texto}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Products ── */}
      <section className="home-reveal mx-auto max-w-[1440px] px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-10">
        {/* Section heading */}
        <h2 className="animated-heading mb-6 text-xl font-bold text-[#27B1B8]">
          {headingCategoria[categoriaActiva ?? ""] ?? `Explora ${categoriaActiva ?? "el catálogo"}`}
        </h2>

        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="pulse-ring inline-flex items-center gap-1.5 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-[#111]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filtros
          </span>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => setFiltrosAndReset({})}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-100"
            >
              Borrar Filtros
            </button>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {Object.entries(opcionesFiltros).filter(([, opts]) => opts.length > 0).map(([label, opciones]) => (
              <DropdownFiltro
                key={label}
                label={label}
                opciones={opciones}
                activos={filtros[label] ?? []}
                onChange={(vals) => setFiltrosAndReset((prev) => ({ ...prev, [label]: vals }))}
              />
            ))}
          </div>
        </div>

        {/* Product grid */}
        {productosPagina.length > 0 ? (
          <div className="motion-list grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {productosPagina.map((producto) => (
              <TarjetaProducto key={producto.slug} producto={producto} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/12 bg-[#f8f8f7] p-12 text-center text-[#6e7379]">
            No encontramos productos con esos filtros.
          </div>
        )}

        {/* Pagination */}
        {totalPaginas > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => { setPagina(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-3 text-sm font-medium transition-colors ${
                  pagina === p
                    ? "bg-[#27B1B8] text-white"
                    : "border border-black/10 bg-white text-[#5d6167] hover:border-[#27B1B8]/50 hover:text-[#27B1B8]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ── Cómo elegir ── */}
      {catMeta.comoElegir && catMeta.comoElegir.length > 0 && (
        catMeta.comoElegirDark ? (
          /* Dark variant — Hoteles y Restaurantes */
          <section className="home-reveal bg-[#f8f8f7] px-4 py-8 sm:px-6 sm:py-12">
            <div className="mx-auto max-w-[1440px]">
              <div
                className="hero-energy interactive-lift relative overflow-hidden rounded-2xl"
                style={{ background: "linear-gradient(to right, #051e22, #0C535B, #0f6e78)" }}
              >
                {/* Foca — solo desktop */}
                <div className="absolute bottom-0 left-0 hidden h-[240px] w-[220px] lg:block">
                  <Image
                    src={catMeta.comoElegirFoca ?? "/foca-ok-kliniu-original.png"}
                    alt="Foca Kliniu"
                    fill
                    className="float-soft object-contain object-bottom"
                  />
                </div>

                {/* Header */}
                <div className="px-6 pt-6 lg:ml-[260px] lg:border-r lg:border-white/10 lg:py-7 lg:w-[250px] lg:flex lg:flex-col lg:justify-center lg:pt-0 lg:mr-0">
                  <h2 className="hero-pop text-base font-black leading-snug text-white sm:text-[18px]">
                    {(() => {
                      const title = catMeta.comoElegirTituloCompleto ?? "¿Cómo elegir el producto ideal?";
                      const parts = title.split("KLINIU");
                      return parts.length === 2 ? (
                        <>{parts[0]}<span className="text-[#27B1B8]">KLINIU</span>{parts[1]}</>
                      ) : title;
                    })()}
                  </h2>
                  {catMeta.comoElegirSubtitulo && (
                    <p className="mt-2 text-[11px] leading-4 text-white/65">
                      {catMeta.comoElegirSubtitulo}
                    </p>
                  )}
                </div>

                {/* Benefit items — grid en móvil, fila en desktop */}
                <div className="motion-list mt-4 grid grid-cols-2 gap-px border-t border-white/10 sm:grid-cols-4 lg:ml-[510px] lg:mt-0 lg:flex lg:border-t-0 lg:border-l">
                  {catMeta.comoElegir.map((factor, i) => (
                    <div
                      key={factor.titulo}
                      className={`motion-card flex flex-col justify-start px-4 py-5 sm:px-5 ${i > 0 ? "border-l border-white/10" : ""}`}
                    >
                      {factor.imagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={factor.imagen} alt="" className="feature-icon-pop h-8 w-8 shrink-0 object-contain brightness-0 invert sm:h-9 sm:w-9" />
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-8 w-8 shrink-0 text-[#27B1B8] sm:h-6 sm:w-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      )}
                      <p className="mt-2 text-xs font-bold text-white sm:text-sm">{factor.titulo}</p>
                      <p className="mt-0.5 text-[10px] leading-4 text-white/60 sm:text-[11px]">{factor.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        ) : (
          /* Light variant — all other categories */
          <section className="home-reveal bg-[#f8f8f7] px-4 py-8 sm:px-6 sm:py-12">
            <div className="mx-auto max-w-[1440px]">
              <div className="interactive-lift overflow-hidden rounded-2xl" style={{ background: "#EAF8F7" }}>

                {/* Header con título y foca */}
                <div className="relative px-6 pt-6 pb-4 pr-32 sm:px-8 sm:pt-7 sm:pb-5 sm:pr-36">
                  <p className="hero-pop text-base font-bold leading-snug text-[#0C535B] sm:text-lg">
                    ¿Cómo elegir el{" "}
                    {catMeta.comoElegirTitulo ?? `${catMeta.heroDestacado?.toLowerCase() ?? "producto"} ideal`}?
                  </p>
                  <p className="mt-1 text-xs text-[#607175] sm:text-sm">
                    Ten en cuenta estos factores para elegir el ideal
                  </p>
                  {/* Foca — absoluta pegada a la esquina inferior derecha del header */}
                  <div className="absolute bottom-0 right-4 hidden sm:flex sm:items-end">
                    {catMeta.comoElegirFoca ? (
                      <Image src={catMeta.comoElegirFoca} alt="Foca Kliniu" width={110} height={110} className="float-soft w-28 object-contain object-bottom" />
                    ) : (
                      <Image src="/foca-ok-kliniu-original.png" alt="Foca Kliniu" width={90} height={90} className="float-soft w-24 object-contain object-bottom" />
                    )}
                  </div>
                </div>

                {/* Criterios — grid responsivo */}
                <div className="motion-list mt-4 grid grid-cols-2 divide-x divide-y divide-black/8 sm:grid-cols-4 sm:divide-y-0" style={{ background: "rgba(255,255,255,0.7)" }}>
                  {catMeta.comoElegir.map((factor) => (
                    <div key={factor.titulo} className="motion-card flex flex-col p-4 sm:p-5">
                      {factor.imagen ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={factor.imagen} alt="" className="feature-icon-pop h-10 w-10 object-contain sm:h-14 sm:w-14" />
                      ) : (
                        <svg viewBox="0 0 24 24" className="h-10 w-10 text-[#27B1B8] sm:h-14 sm:w-14" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                          <circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                      )}
                      <p className="mt-2 text-xs font-bold text-[#073F43] sm:text-sm">{factor.titulo}</p>
                      <p className="mt-1 text-[10px] leading-4 text-[#607175] sm:text-xs sm:leading-5">{factor.descripcion}</p>
                    </div>
                  ))}
                </div>

              </div>
            </div>
          </section>
        )
      )}

      {/* ── ¿Necesitas ayuda? ── */}
      <section className="home-reveal px-6" style={{ paddingTop: 160, paddingBottom: 140 }}>
        <div className="mx-auto max-w-[1440px]">
          <AsesorBanner />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
