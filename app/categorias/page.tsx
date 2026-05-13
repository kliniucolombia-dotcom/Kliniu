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
  categoriaMeta,
  categorias,
  type ProductoCatalogo,
  slugCategoria,
} from "../data/catalog";

const ITEMS_PER_PAGE = 10;
const disponibilidades = [
  "Entrega inmediata",
  "Disponible por pedido",
  "Recoger en tienda",
  "Agotado",
] as const;

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
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const alternar = (valor: string) => {
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
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-medium text-[#111] transition-colors hover:border-[#27B1B8]/50"
      >
        {label}
        {activos.length > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#27B1B8] text-[10px] font-bold leading-none text-white">
            {activos.length}
          </span>
        )}
        <span className="text-[10px] text-[#aaa]">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 min-w-[210px] rounded-2xl border border-black/8 bg-white p-2 shadow-[0_8px_28px_rgba(0,0,0,0.12)]">
          {opciones.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-[#333] transition-colors hover:bg-[#f5f5f5]"
            >
              <input
                type="checkbox"
                checked={activos.includes(opt)}
                onChange={() => alternar(opt)}
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

function TarjetaProducto({ producto }: { producto: ProductoCatalogo }) {
  const { addItem } = useCart();
  const [agregado, setAgregado] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleAddToCart = () => {
    if (producto.puedeComprar === false) return;
    addItem({
      id: producto.slug,
      nombre: producto.nombre,
      precio: producto.precio,
      imagen: producto.imagen,
    });
    setAgregado(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAgregado(false), 1400);
  };

  return (
    <article className="group overflow-hidden rounded-2xl border border-black/8 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.10)]">
      <div className="relative">
        {producto.destacado && (
          <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#f5a623] px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
            Más vendido
          </span>
        )}
        <div className="flex h-44 items-center justify-center bg-white px-6 py-4">
          <Image
            src={producto.imagen}
            alt={producto.nombre}
            width={180}
            height={160}
            className="max-h-36 w-auto max-w-full object-contain"
          />
        </div>
      </div>

      <div className="space-y-2 border-t border-black/5 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[#111]">
          {producto.nombre}
        </h3>

        {(producto.descripcion ?? producto.aplicacion) && (
          <p className="line-clamp-1 text-xs text-[#888]">
            {producto.descripcion ?? producto.aplicacion}
          </p>
        )}

        <p className="text-xl font-bold text-[#111]">{producto.precio}</p>

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
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 ${
              agregado
                ? "bg-[#0C535B] text-white"
                : "bg-[#27B1B8] text-white hover:bg-[#1E969B]"
            }`}
          >
            {agregado ? "✓" : "🛒"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function CategoriasPage() {
  const { products } = useProducts();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const marcas = useMemo(
    () => Array.from(new Set(products.map((p) => p.marca))).sort(),
    [products],
  );

  const categoriaActiva = categoriaDesdeSlug(searchParams.get("categoria"));
  const catMeta = categoriaMeta(categoriaActiva ?? categorias[0]);
  const queryActiva = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const [marcasActivas, setMarcasActivas] = useState<string[]>([]);
  const [disponibilidadActiva, setDisponibilidadActiva] = useState<string[]>([]);
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    setPagina(1);
  }, [categoriaActiva, marcasActivas, disponibilidadActiva, queryActiva]);

  const productosFiltrados = useMemo(
    () =>
      products.filter((p) => {
        const coincideCategoria = !categoriaActiva || p.categoria === categoriaActiva;
        const coincideBusqueda =
          !queryActiva ||
          p.nombre.toLowerCase().includes(queryActiva) ||
          p.marca.toLowerCase().includes(queryActiva) ||
          p.categoria.toLowerCase().includes(queryActiva) ||
          (p.descripcion ?? "").toLowerCase().includes(queryActiva);
        const coincideMarca =
          marcasActivas.length === 0 || marcasActivas.includes(p.marca);
        const coincideDisponibilidad =
          disponibilidadActiva.length === 0 ||
          disponibilidadActiva.includes(p.disponibilidad);
        return (
          coincideCategoria &&
          coincideBusqueda &&
          coincideMarca &&
          coincideDisponibilidad
        );
      }),
    [products, categoriaActiva, queryActiva, marcasActivas, disponibilidadActiva],
  );

  const totalPaginas = Math.max(
    1,
    Math.ceil(productosFiltrados.length / ITEMS_PER_PAGE),
  );
  const productosPagina = productosFiltrados.slice(
    (pagina - 1) * ITEMS_PER_PAGE,
    pagina * ITEMS_PER_PAGE,
  );

  const hayFiltros = marcasActivas.length > 0 || disponibilidadActiva.length > 0;

  const cambiarCategoria = (categoria: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("categoria", slugCategoria(categoria));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  };

  // Hero title split
  const nombrePalabras = catMeta.nombre.split(" ");
  const mitad = Math.ceil(nombrePalabras.length / 2);
  const tituloLinea1 = nombrePalabras.slice(0, mitad).join(" ");
  const tituloLinea2 = catMeta.heroDestacado ?? nombrePalabras.slice(mitad).join(" ");

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-[#111]">
      {/* ── Hero ── */}
      <section className="px-4 pb-4 pt-4 sm:px-6">
        <div className="overflow-hidden rounded-[1.9rem] border border-black/8 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
          <div className="grid md:grid-cols-2">
            {/* Text */}
            <div className="flex flex-col justify-center px-8 py-10 md:px-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-[#27B1B8]">
                Catálogo Kliniu
              </p>
              <h1 className="mt-3 text-4xl font-extrabold leading-tight tracking-tight text-[#111] md:text-5xl">
                {tituloLinea1}
                <br />
                <span className="text-[#27B1B8]">{tituloLinea2}</span>
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-7 text-[#6e7379]">
                {catMeta.bannerCopy}
              </p>
              {catMeta.beneficiosHero && (
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2.5">
                  {catMeta.beneficiosHero.map((b) => (
                    <div
                      key={b.texto}
                      className="flex items-center gap-1.5 text-xs font-medium text-[#555]"
                    >
                      <span className="text-base">{b.icono}</span>
                      <span>{b.texto}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Image */}
            {catMeta.bannerImagen && (
              <div className="relative hidden min-h-[300px] md:block">
                <Image
                  src={catMeta.bannerImagen}
                  alt={catMeta.nombre}
                  fill
                  priority
                  sizes="50vw"
                  className="object-cover object-center"
                />
              </div>
            )}
          </div>

          {/* Category pills */}
          <div className="border-t border-black/6 px-4 py-3">
            <div className="scrollbar-hidden flex gap-2 overflow-x-auto">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => cambiarCategoria(cat)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                    categoriaActiva === cat
                      ? "border-[#27B1B8] bg-[#27B1B8] text-white"
                      : "border-black/10 bg-[#f8f8f7] text-[#5d6167] hover:border-[#27B1B8]/40 hover:text-[#27B1B8]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Products ── */}
      <section className="mx-auto max-w-[1680px] px-4 pb-16 pt-6 sm:px-6">
        {/* Section title */}
        <h2 className="mb-5 text-2xl font-bold text-[#27B1B8]">
          {categoriaActiva
            ? `Encuentra el producto ideal en ${categoriaActiva}`
            : "Explora todo el catálogo Kliniu"}
        </h2>

        {/* Filter bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-black/12 bg-white px-4 py-2 text-sm font-semibold text-[#111]">
            Filtros
          </span>

          {hayFiltros && (
            <button
              type="button"
              onClick={() => {
                setMarcasActivas([]);
                setDisponibilidadActiva([]);
              }}
              className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-500 transition-colors hover:bg-red-100"
            >
              Borrar Filtros
            </button>
          )}

          <div className="ml-auto flex flex-wrap gap-2">
            <DropdownFiltro
              label="Marca"
              opciones={marcas}
              activos={marcasActivas}
              onChange={setMarcasActivas}
            />
            <DropdownFiltro
              label="Disponibilidad"
              opciones={disponibilidades}
              activos={disponibilidadActiva}
              onChange={setDisponibilidadActiva}
            />
          </div>
        </div>

        {/* Grid */}
        {productosPagina.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {productosPagina.map((producto) => (
              <TarjetaProducto key={producto.slug} producto={producto} />
            ))}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border border-dashed border-black/12 bg-white p-12 text-center text-[#6e7379]">
            No encontramos productos con esos filtros. Prueba cambiando marca
            o disponibilidad.
          </div>
        )}

        {/* Pagination */}
        {totalPaginas > 1 && (
          <div className="mt-10 flex justify-center gap-2">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setPagina(p);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className={`flex h-9 min-w-[2.25rem] items-center justify-center rounded-full px-3 text-sm font-medium transition-colors ${
                  pagina === p
                    ? "bg-[#27B1B8] text-white shadow-md"
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
        <section className="bg-[#eaf8f8] px-4 py-12 sm:px-6">
          <div className="mx-auto max-w-[1680px]">
            <div className="grid gap-4 md:grid-cols-[260px_1fr]">
              {/* Left card */}
              <div className="flex flex-col justify-between rounded-[1.75rem] bg-white p-6 shadow-sm">
                <div>
                  <p className="text-base font-bold leading-snug text-[#111]">
                    ¿Como elegir el{" "}
                    {categoriaActiva?.toLowerCase() ?? "producto"} ideal?
                  </p>
                  <p className="mt-2 text-sm text-[#6e7379]">
                    Ten en cuenta estos factores para elegir el ideal
                  </p>
                </div>
                <div className="mt-6 flex justify-end">
                  <Image
                    src="/robot-kliniu.jpg"
                    alt="Asesor Kliniu"
                    width={96}
                    height={96}
                    className="rounded-xl object-cover"
                  />
                </div>
              </div>

              {/* Factor cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {catMeta.comoElegir.map((factor) => (
                  <div
                    key={factor.titulo}
                    className="rounded-[1.75rem] bg-white p-5 shadow-sm"
                  >
                    <span className="text-2xl">{factor.icono}</span>
                    <p className="mt-2 font-semibold text-[#111]">
                      {factor.titulo}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#6e7379]">
                      {factor.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── WhatsApp CTA ── */}
      <section className="bg-[#0C535B] px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col items-center gap-6 text-center md:flex-row md:text-left">
          <Image
            src="/robot-kliniu.jpg"
            alt="Asesor Kliniu"
            width={104}
            height={104}
            className="shrink-0 rounded-2xl object-cover shadow-lg"
          />
          <div className="flex-1">
            <p className="text-2xl font-bold text-white">
              ¿Necesitas ayuda para elegir?
            </p>
            <p className="mt-1 text-sm text-white/70">
              Nuestro equipo de expertos está listo para asesorarte sin
              compromiso.
            </p>
          </div>
          <div className="hidden flex-wrap items-center gap-6 text-sm text-white/80 lg:flex">
            <span className="flex items-center gap-1.5">📱 Asesoría gratuita</span>
            <span className="flex items-center gap-1.5">
              ⚡ Respuesta rápida por WhatsApp
            </span>
            <span className="flex items-center gap-1.5">
              📋 Cotizaciones personalizadas
            </span>
          </div>
          <a
            href="https://wa.me/573057249454"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-full bg-white px-6 py-3 text-sm font-bold text-[#0C535B] shadow-md transition-opacity hover:opacity-90"
          >
            Hablar con un asesor 💬
          </a>
        </div>
      </section>
    </main>
  );
}
