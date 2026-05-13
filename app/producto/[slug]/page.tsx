"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import AddToCartButton from "../../components/add-to-cart-button";
import { useProducts } from "../../components/products-provider";
import type { ProductoEspecificacion } from "../../data/catalog";

function ProductImageGallery({
  nombre,
  images,
}: {
  nombre: string;
  images: string[];
}) {
  const [activeImage, setActiveImage] = useState(images[0] || "");
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const activeImageIndex = Math.max(images.indexOf(activeImage), 0);

  const goToPreviousImage = () => {
    const previousIndex =
      activeImageIndex === 0 ? images.length - 1 : activeImageIndex - 1;
    setActiveImage(images[previousIndex]);
  };

  const goToNextImage = () => {
    const nextIndex =
      activeImageIndex === images.length - 1 ? 0 : activeImageIndex + 1;
    setActiveImage(images[nextIndex]);
  };

  return (
    <div className="grid gap-4 md:grid-cols-[100px_minmax(0,1fr)]">
      <div className="order-2 flex gap-3 md:order-1 md:flex-col">
        {images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            onClick={() => setActiveImage(image)}
            className={`overflow-hidden rounded-[1.1rem] border-2 bg-white p-2 shadow-sm transition-all duration-200 ${
              activeImage === image
                ? "border-[#2d7af0] shadow-[0_12px_24px_rgba(45,122,240,0.18)]"
                : "border-black/8 hover:border-[#2d7af0]/35"
            }`}
          >
            <Image
              src={image}
              alt={`${nombre} vista ${index + 1}`}
              width={84}
              height={84}
              className="h-16 w-16 object-contain md:h-20 md:w-20"
            />
          </button>
        ))}
      </div>

      <div className="order-1 rounded-[1.6rem] bg-white md:order-2">
        <div className="flex justify-end">
          <span className="rounded-full bg-[#edf4ff] px-4 py-2 text-sm font-medium text-[#2d7af0]">
            Envío disponible
          </span>
        </div>
        <div className="flex items-center justify-center px-4 py-6 md:px-10 md:py-10">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(true)}
            className="group relative w-full"
          >
            <Image
              src={activeImage}
              alt={nombre}
              width={1200}
              height={900}
              className="h-auto max-h-[620px] w-full object-contain transition-transform duration-300 group-hover:scale-[1.01]"
            />
            <span className="absolute bottom-4 right-4 rounded-full bg-[#0C535B]/85 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              Ampliar
            </span>
          </button>
        </div>
      </div>

      {isLightboxOpen && (
        <div className="fixed inset-0 z-[120] bg-[#0f1a24]/88 backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute inset-0 h-full w-full cursor-default"
            aria-label="Cerrar vista ampliada"
          />

          <div className="relative z-[121] flex h-full w-full items-center justify-center px-4 py-8 md:px-8">
            <div className="grid max-h-full w-full max-w-6xl gap-4 md:grid-cols-[110px_minmax(0,1fr)]">
              <div className="order-2 flex gap-3 overflow-x-auto md:order-1 md:flex-col md:overflow-visible">
                {images.map((image, index) => (
                  <button
                    key={`lightbox-${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    className={`overflow-hidden rounded-[1.1rem] border-2 bg-white/95 p-2 shadow-sm transition-all duration-200 ${
                      activeImage === image
                        ? "border-[#2d7af0] shadow-[0_12px_24px_rgba(45,122,240,0.18)]"
                        : "border-white/10 hover:border-[#2d7af0]/35"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${nombre} ampliada ${index + 1}`}
                      width={84}
                      height={84}
                      className="h-16 w-16 object-contain md:h-20 md:w-20"
                    />
                  </button>
                ))}
              </div>

              <div className="order-1 flex min-h-[60vh] items-center justify-center rounded-[2rem] border border-white/10 bg-white/6 p-6 md:order-2 md:p-10">
                <button
                  type="button"
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute right-6 top-6 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/10 text-xl text-white transition-colors duration-200 hover:bg-white/18"
                  aria-label="Cerrar lightbox"
                >
                  ×
                </button>

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={goToPreviousImage}
                      className="absolute left-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-white/10 text-2xl text-white transition-colors duration-200 hover:bg-white/18 md:left-6"
                      aria-label="Imagen anterior"
                    >
                      ‹
                    </button>

                    <button
                      type="button"
                      onClick={goToNextImage}
                      className="absolute right-4 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-white/10 text-2xl text-white transition-colors duration-200 hover:bg-white/18 md:right-6"
                      aria-label="Imagen siguiente"
                    >
                      ›
                    </button>
                  </>
                )}

                <Image
                  src={activeImage}
                  alt={`${nombre} ampliada`}
                  width={1600}
                  height={1200}
                  className="max-h-[78vh] w-full object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductoDetallePage() {
  const params = useParams<{ slug: string }>();
  const { products } = useProducts();
  const [cantidad, setCantidad] = useState(1);
  const [fichaAbierta, setFichaAbierta] = useState(true);
  const slug = params.slug;
  const producto = products.find((item) => item.slug === slug);
  const galleryImages = useMemo(
    () =>
      producto
        ? [producto.imagen, ...(producto.imagenesExtra || [])].filter(Boolean)
        : [],
    [producto],
  );

  const maxCantidad = Math.max(1, producto?.stock ?? 1);

  if (!producto) {
    return (
      <main className="min-h-screen bg-[#f5f5f5] text-[#111]">
        <section className="mx-auto max-w-[960px] px-6 py-20 text-center">
          <div className="rounded-[2rem] border border-dashed border-black/12 bg-white p-12 shadow-[0_14px_28px_rgba(15,23,42,0.05)]">
            <h1 className="text-4xl font-semibold tracking-[-0.04em] text-[#4f545a]">
              Producto no encontrado
            </h1>
            <p className="mt-4 text-lg text-[#6e7379]">
              Puede que este producto ya no exista o todavía no esté disponible.
            </p>
            <Link
              href="/categorias"
              className="mt-8 inline-flex rounded-full bg-[#27B1B8] px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B]"
            >
              Volver al catálogo
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const ajustarCantidad = (delta: number) => {
    setCantidad((actual) => {
      const siguiente = actual + delta;
      if (siguiente < 1) return 1;
      if (siguiente > maxCantidad) return maxCantidad;
      return siguiente;
    });
  };

  const relacionados = products
    .filter(
      (item) =>
        item.categoria === producto.categoria && item.slug !== producto.slug,
    )
    .slice(0, 3);
  const fichaTecnica: ProductoEspecificacion[] =
    producto.especificacionesTecnicas && producto.especificacionesTecnicas.length > 0
      ? producto.especificacionesTecnicas
      : [
          {
            etiqueta: "Observaciones",
            valor:
              "La imagen de este producto es de referencia visual y puede variar levemente frente a la versión final entregada.",
          },
          {
            etiqueta: "Categoría",
            valor: producto.categoria,
          },
          {
            etiqueta: "Marca",
            valor: producto.marca,
          },
          {
            etiqueta: "Disponibilidad",
            valor: producto.disponibilidad,
          },
          {
            etiqueta: "Garantía",
            valor: producto.garantia || "1 año de garantía del fabricante",
          },
          {
            etiqueta: "Aplicación",
            valor: producto.aplicacion || "Uso técnico, industrial y de reposición especializada",
          },
        ];
  const resumenGeneral =
    producto.descripcion ||
    `Producto de la línea ${producto.categoria} con disponibilidad ${producto.disponibilidad.toLowerCase()} y respaldo comercial de ${producto.marca}.`;

  return (
    <main className="min-h-screen bg-[#f5f5f5] text-[#111]">
      <section className="mx-auto max-w-[1440px] px-6 py-12">
        <div className="mb-8 flex flex-wrap items-center gap-3 text-sm text-[#6e7379]">
          <Link
            href={`/categorias?categoria=${encodeURIComponent(
              producto.categoria
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, ""),
            )}`}
            className="font-medium text-[#0C535B] transition-colors duration-200 hover:text-[#27B1B8]"
          >
            Volver a categoría
          </Link>
          <span>·</span>
          <span>{producto.categoria}</span>
          <span>·</span>
          <span>{producto.marca}</span>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <div className="rounded-[2rem] border border-black/8 bg-white p-4 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <ProductImageGallery
              key={producto.slug}
              nombre={producto.nombre}
              images={galleryImages}
            />

            <div
              id="ficha-tecnica"
              className="mt-6 overflow-hidden rounded-[1.6rem] border border-black/8"
            >
              <button
                type="button"
                onClick={() => setFichaAbierta((actual) => !actual)}
                className="flex w-full items-center justify-between bg-[linear-gradient(180deg,#fbfbfa_0%,#f3f3f2_100%)] px-6 py-5 text-left transition-colors duration-200 hover:bg-[#f4f4f2]"
                aria-expanded={fichaAbierta}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#27B1B8]">
                    Información técnica
                  </p>
                  <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.03em] text-[#33373d]">
                    Ficha técnica
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#6e7379]">
                    Datos clave para validar compatibilidad, uso y respaldo del producto.
                  </p>
                </div>
                <span
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white text-xl text-[#4f545a] transition-transform duration-300 ${
                    fichaAbierta ? "rotate-0" : "-rotate-180"
                  }`}
                >
                  ⌃
                </span>
              </button>

              {fichaAbierta && (
                <div className="bg-white p-4 md:p-5">
                  <div className="rounded-[1.4rem] border border-black/8 overflow-hidden">
                    <div className="grid gap-px bg-black/6 md:grid-cols-[220px_minmax(0,1fr)]">
                      {fichaTecnica.map((item) => (
                        <div
                          key={item.etiqueta}
                          className="contents"
                        >
                          <div
                            className="bg-[#f6f6f4] px-5 py-4 text-sm font-semibold uppercase tracking-[0.08em] text-[#5d6670]"
                          >
                            {item.etiqueta}
                          </div>
                          <div
                            className="bg-white px-5 py-4 text-base font-medium leading-7 text-[#22262b]"
                          >
                            {item.valor}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-black/8 bg-white p-8 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="text-sm font-medium text-[#2d7af0]">
                  {producto.marca}
                </p>
                <h1 className="mt-2 text-4xl font-medium leading-tight tracking-[-0.04em] text-[#33373d] md:text-5xl">
                  {producto.nombre}
                </h1>
                <p className="mt-3 text-sm text-[#6e7379]">
                  Código {producto.sku || producto.slug.toUpperCase().replace(/-/g, "")}
                </p>
              </div>

              <button className="text-sm font-medium text-[#2d7af0] transition-colors duration-200 hover:text-[#0C535B]">
                Guardar
              </button>
            </div>

            <div className="text-[#d8dbe0]">★★★★★</div>
            <p className="text-sm text-[#6e7379]">0.0 (0)</p>

            <div className="pt-2">
              <p className="text-5xl font-semibold tracking-[-0.04em] text-[#33373d]">
                {producto.precio}
              </p>
              <p className="mt-2 text-2xl text-[#a0a3a8] line-through">
                {producto.precioAnterior}
              </p>
              <p className="mt-3 text-sm font-medium text-[#6e7379]">
                Stock disponible: {producto.stock ?? 0}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-4">
              <div className="flex items-center overflow-hidden rounded-xl border border-black/10">
                <button
                  type="button"
                  onClick={() => ajustarCantidad(-1)}
                  className="px-5 py-3 text-2xl text-[#4f545a] transition-colors duration-200 hover:bg-[#f5f5f5]"
                  aria-label="Disminuir cantidad"
                >
                  −
                </button>
                <div className="border-x border-black/10 px-7 py-3 text-xl text-[#33373d]">
                  {cantidad}
                </div>
                <button
                  type="button"
                  onClick={() => ajustarCantidad(1)}
                  className="px-5 py-3 text-2xl text-[#4f545a] transition-colors duration-200 hover:bg-[#f5f5f5]"
                  aria-label="Aumentar cantidad"
                >
                  +
                </button>
              </div>

              <AddToCartButton
                id={producto.slug}
                nombre={producto.nombre}
                precio={producto.precio}
                imagen={producto.imagen}
                cantidad={cantidad}
                disabled={!producto.puedeComprar}
              />
            </div>

            <div className="rounded-[1.4rem] border border-black/6 bg-[linear-gradient(180deg,#f8f9fb_0%,#f2f4f7_100%)] p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#27B1B8]">
                Resumen rápido
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-[#33373d]">
                Especificaciones generales
              </h2>
              <div className="mt-5 rounded-xl bg-white/78 px-5 py-5 shadow-[0_10px_22px_rgba(15,23,42,0.04)]">
                <p className="text-[15px] leading-7 text-[#4f545a]">
                  {resumenGeneral}
                </p>
              </div>
              <a
                href="#ficha-tecnica"
                className="mt-5 inline-flex text-sm font-medium text-[#2d7af0] transition-colors duration-200 hover:text-[#0C535B]"
              >
                Ver más especificaciones
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-6 py-16">
        <div className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.35em] text-[#8b8d91]">
            Relacionados
          </p>
          <h2 className="text-3xl font-semibold uppercase tracking-[-0.04em] text-[#4f545a] md:text-5xl">
            Más productos de esta categoría
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {relacionados.map((item) => (
            <article
              key={item.slug}
              className="overflow-hidden rounded-[1.75rem] border border-black/8 bg-white shadow-[0_16px_35px_rgba(15,23,42,0.05)]"
            >
              <Image
                src={item.imagen}
                alt={item.nombre}
                width={900}
                height={700}
                className="h-52 w-full object-cover"
              />
              <div className="space-y-4 p-5">
                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-[0.24em] text-[#8b8d91]">
                    {item.categoria} · {item.marca}
                  </p>
                  <h3 className="text-xl font-semibold leading-tight tracking-[-0.03em] text-[#1f2328]">
                    {item.nombre}
                  </h3>
                </div>

                <p className="text-2xl font-semibold text-[#27B1B8]">
                  {item.precio}
                </p>

                <Link
                  href={`/producto/${item.slug}`}
                  className="inline-flex rounded-full bg-[#0C535B] px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43]"
                >
                  Ver producto
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
