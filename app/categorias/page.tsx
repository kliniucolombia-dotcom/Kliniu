"use client";

import {
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCart } from "../components/cart-provider";
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
  const [agregado, setAgregado] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  const handleAddToCart = () => {
    if (producto.puedeComprar === false) return;
    addItem({ id: producto.slug, nombre: producto.nombre, precio: producto.precio, imagen: producto.imagen });
    setAgregado(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAgregado(false), 1400);
  };

  // Parse tipo badge from descripcion (e.g. "Interdobladas · 600 toallas · Alto tráfico")
  const tipoBadge = producto.descripcion?.split("·")[0]?.trim();

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-black/8 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
      {/* Badge */}
      {producto.destacado && (
        <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#f5a623] px-2.5 py-1 text-[10px] font-bold text-white">
          Más vendido
        </span>
      )}

      {/* Image */}
      <div className="flex h-44 items-center justify-center bg-white px-6 py-4">
        <Image
          src={producto.imagen}
          alt={producto.nombre}
          width={160}
          height={140}
          className="max-h-36 w-auto max-w-full object-contain"
        />
      </div>

      {/* Info */}
      <div className="space-y-1.5 border-t border-black/5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#111]">
          {producto.nombre}
        </h3>

        {/* Type badge + uso */}
        {tipoBadge && (
          <span className="inline-block rounded-md bg-[#e8f5f5] px-2 py-0.5 text-[11px] font-semibold text-[#0C535B]">
            {tipoBadge}
          </span>
        )}
        <p className="text-xs text-[#888]">Uso: Alto tráfico</p>

        {/* Color swatches */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <span className="h-4 w-4 rounded-full border border-black/20 bg-[#222]" />
          <span className="h-4 w-4 rounded-full border border-black/20 bg-white" />
        </div>

        <p className="pt-0.5 text-lg font-bold text-[#111]">{producto.precio}</p>

        <div className="flex gap-2 pt-1">
          <Link
            href={`/producto/${producto.slug}`}
            className="flex-1 rounded-full border border-[#27B1B8] px-3 py-2 text-center text-xs font-semibold text-[#27B1B8] transition-colors hover:bg-[#27B1B8] hover:text-white"
          >
            Ver detalle
          </Link>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={producto.puedeComprar === false}
            aria-label={`Agregar ${producto.nombre} al carrito`}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
              agregado ? "bg-[#0C535B] text-white" : "bg-[#27B1B8] text-white hover:bg-[#1E969B]"
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
      <section className="border-b border-black/8 bg-[#f8f8f7] px-6 py-10">
        <div className="mx-auto max-w-[1440px]">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0C535B]">
            Encuentra tu dispensador ideal
          </h1>
          <p className="mt-2 text-sm text-[#6e7379]">
            Selecciona la categoría que necesitas
          </p>
        </div>
      </section>

      {/* Category cards */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {categoriasData.map((cat) => (
              <button
                key={cat.nombre}
                type="button"
                onClick={() => onSelect(cat.nombre)}
                className="group flex flex-col items-center gap-4 overflow-hidden rounded-2xl border border-black/8 bg-white p-6 text-center transition-all hover:-translate-y-0.5 hover:border-[#27B1B8]/40 hover:shadow-md"
              >
                <div className="relative h-32 w-full overflow-hidden rounded-xl bg-[#f8f8f7]">
                  {cat.bannerImagen && (
                    <Image
                      src={cat.bannerImagen}
                      alt={cat.nombre}
                      fill
                      sizes="220px"
                      className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="text-sm font-semibold text-[#0C535B] group-hover:text-[#27B1B8]">
                  {cat.nombre}
                </p>
              </button>
            ))}

            {/* CTA card */}
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-[#27B1B8]/25 bg-[#e8f5f5] p-6 text-center">
              <Image
                src="/kliniu-loader-logo.png"
                alt="Kliniu"
                width={64}
                height={64}
                className="object-contain"
              />
              <div>
                <p className="text-sm font-bold leading-snug text-[#0C535B]">
                  ¿No sabes cuál necesitas?
                </p>
                <p className="mt-1 text-xs text-[#3a7a80]">
                  Te ayudamos a elegir la mejor solución para tu espacio.
                </p>
              </div>
              <a
                href="https://wa.me/573125860921"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0C535B] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                Te asesoramos
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

/* ─────────────────────── Page ─────────────────────── */
const filtrosDisponibles = {
  "Automático / Manual": ["Automático", "Manual"],
  Capacidad: ["500 ml", "800 ml", "1000 ml", "1200 ml", "600 toallas", "400 hojas"],
  Material: ["Plástico ABS", "Acero inoxidable", "Policarbonato"],
  Color: ["Blanco", "Negro", "Plateado"],
} as const;

export default function CategoriasPage() {
  const { products } = useProducts();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categoriaActiva = categoriaDesdeSlug(searchParams.get("categoria"));
  const catMeta = categoriaMeta(categoriaActiva ?? categorias[0]);
  const queryActiva = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const [filtros, setFiltros] = useState<Record<string, string[]>>({});
  const [pagina, setPagina] = useState(1);

  useEffect(() => { setPagina(1); }, [categoriaActiva, queryActiva]);

  const productosFiltrados = useMemo(
    () =>
      products.filter((p) => {
        const coincideCategoria = !categoriaActiva || p.categoria === categoriaActiva;
        const coincideBusqueda =
          !queryActiva ||
          p.nombre.toLowerCase().includes(queryActiva) ||
          p.marca.toLowerCase().includes(queryActiva) ||
          (p.descripcion ?? "").toLowerCase().includes(queryActiva);
        return coincideCategoria && coincideBusqueda;
      }),
    [products, categoriaActiva, queryActiva],
  );

  const totalPaginas = Math.max(1, Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE));
  const productosPagina = productosFiltrados.slice(
    (pagina - 1) * ITEMS_PER_PAGE,
    pagina * ITEMS_PER_PAGE,
  );

  const hayFiltros = Object.values(filtros).some((v) => v.length > 0);

  const irACategoria = (categoria: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("categoria", slugCategoria(categoria));
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  };

  // Hero title
  const tituloLinea1 = catMeta.nombre.split(" ").slice(0, 2).join(" ");
  const tituloLinea2 = catMeta.heroDestacado ?? catMeta.nombre.split(" ").slice(2).join(" ");

  // Heading for product grid
  const headingCategoria: Record<string, string> = {
    "Dispensadores para líquidos": "Encuentra el dispensador de líquidos ideal",
    "Dispensadores de papel, toalla y servilletas": "Encuentra el dispensador de papel ideal",
    "KlinOx Acero Inoxidable": "Encuentra tu dispensador de acero inoxidable ideal",
    "Dispensador de crema dental": "Encuentra tu dispensador de crema dental ideal",
    "Hoteles y Restaurantes": "Encuentra tu dispensador de acero inoxidable ideal",
  };

  // Show landing if no category selected
  if (!categoriaActiva && !queryActiva) {
    return <LandingCategorias onSelect={irACategoria} />;
  }

  return (
    <main className="min-h-screen bg-white text-[#111]">
      {/* ── Hero banner ── */}
      <section className="relative overflow-hidden bg-[#0a0f14]">
        {catMeta.bannerImagen && (
          <Image
            src={catMeta.bannerImagen}
            alt={catMeta.nombre}
            fill
            priority
            sizes="100vw"
            className="object-cover object-center opacity-30"
          />
        )}
        <div className="relative mx-auto max-w-[1440px] px-8 py-14 md:py-20">
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl">
            {tituloLinea1}
            <br />
            <span className="text-[#27B1B8]">{tituloLinea2}</span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-white/70">
            {catMeta.bannerCopy}
          </p>
          {catMeta.beneficiosHero && (
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-5">
              {catMeta.beneficiosHero.map((b, i) => (
                <div key={b.texto} className="flex items-center gap-3 text-xs text-white/80">
                  {i > 0 && <span className="hidden h-4 border-l border-white/20 sm:block" />}
                  <span className="text-sm">{b.icono}</span>
                  <span>{b.texto}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Products ── */}
      <section className="mx-auto max-w-[1440px] px-6 pb-16 pt-10">
        {/* Section heading */}
        <h2 className="mb-6 text-xl font-bold text-[#27B1B8]">
          {headingCategoria[categoriaActiva ?? ""] ?? `Explora ${categoriaActiva ?? "el catálogo"}`}
        </h2>

        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold text-[#111]">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filtros
          </span>
          {hayFiltros && (
            <button
              type="button"
              onClick={() => setFiltros({})}
              className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-100"
            >
              Borrar Filtros
            </button>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            {Object.entries(filtrosDisponibles).map(([label, opciones]) => (
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

        {/* Product grid */}
        {productosPagina.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
        <section className="bg-[#f8f8f7] px-6 py-12">
          <div className="mx-auto max-w-[1440px]">
            <div className="grid gap-4 md:grid-cols-[240px_1fr]">
              <div className="flex flex-col justify-between rounded-2xl bg-white p-6 shadow-sm">
                <div>
                  <p className="font-bold leading-snug text-[#111]">
                    ¿Cómo elegir el{" "}
                    {catMeta.heroDestacado?.toLowerCase() ?? "producto"} ideal?
                  </p>
                  <p className="mt-1.5 text-sm text-[#6e7379]">
                    Ten en cuenta estos factores para elegir el ideal
                  </p>
                </div>
                <Image
                  src="/kliniu-loader-logo.png"
                  alt="Kliniu"
                  width={72}
                  height={72}
                  className="mt-6 self-end object-contain"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {catMeta.comoElegir.map((factor, i) => (
                  <div key={factor.titulo} className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8f5f5] text-[#27B1B8] font-bold text-sm">
                      {i + 1}
                    </div>
                    <p className="mt-3 font-semibold text-[#111]">{factor.titulo}</p>
                    <p className="mt-1 text-sm leading-5 text-[#6e7379]">{factor.descripcion}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── ¿Necesitas ayuda? ── */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex flex-col items-center gap-6 rounded-2xl border border-black/8 bg-[#f8f8f7] p-8 md:flex-row">
            <Image
              src="/kliniu-loader-logo.png"
              alt="Kliniu"
              width={80}
              height={80}
              className="shrink-0 object-contain"
            />
            <div className="flex-1 text-center md:text-left">
              <p className="text-lg font-bold text-[#0C535B]">¿Necesitas ayuda para elegir?</p>
              <p className="mt-1 text-sm text-[#6e7379]">
                Nuestro equipo de expertos está listo para asesorarte sin compromiso
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-[#555]">
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#27B1B8]" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
                Asesoría gratuita sin compromiso.
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#27B1B8]" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
                Respuesta rápida por WhatsApp
              </span>
              <span className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#27B1B8]" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
                Cotizaciones personalizadas
              </span>
            </div>
            <a
              href="https://wa.me/573125860921"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 rounded-full bg-[#0C535B] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Hablar con un asesor 💬
            </a>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
