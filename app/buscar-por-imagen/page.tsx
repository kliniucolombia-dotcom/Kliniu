
import Image from "next/image";
import Link from "next/link";
import { slugCategoria } from "../data/catalog";
import { getProducts } from "@/lib/products";

export const metadata = {
  title: "Buscar por imagen | Kliniu",
  description: "Concepto visual de búsqueda de repuestos por imagen en Kliniu.",
};

export default async function BuscarPorImagenPage() {
  const products = await getProducts();
  const selectedProduct = products[0];

  if (!selectedProduct) {
    return (
      <main className="min-h-[calc(100vh-90px)] bg-[#f5f6f8] px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-[2rem] border border-black/8 bg-white p-10 text-center shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8b8d91]">
            Buscar por imagen
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-[#0C535B]">
            Aún no hay productos cargados
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[calc(100vh-90px)] bg-[linear-gradient(180deg,#f5f6f8_0%,#eef2f5_100%)] px-6 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-6xl">
        <section className="overflow-hidden rounded-[2rem] border border-black/8 bg-white shadow-[0_28px_70px_rgba(15,23,42,0.1)]">
          <div className="border-b border-black/6 px-6 py-6 md:px-10 md:py-8">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[#fff3e8] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#c36517]">
                Próxima función
              </span>
              <span className="rounded-full border border-black/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6d737a]">
                Concepto UI
              </span>
            </div>

            <div className="mt-5 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div>
                <h1 className="max-w-[13ch] text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-[#0C535B] md:text-6xl">
                  Busca repuestos con una foto
                </h1>
                <p className="mt-5 max-w-[34rem] text-base leading-8 text-[#6b737c]">
                  En vez de escribir el nombre exacto, el cliente subiría una
                  imagen y el sistema propondría la categoría y el producto más
                  cercano del catálogo.
                </p>
              </div>

              <div className="rounded-[1.6rem] bg-[#0C535B] p-5 text-white shadow-[0_18px_40px_rgba(22,56,79,0.18)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">
                  Flujo simple
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-[1.1rem] border border-white/12 bg-white/8 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      1. Subir
                    </p>
                    <p className="mt-2 text-sm text-white/84">
                      El cliente comparte una foto del repuesto.
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/12 bg-white/8 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      2. Detectar
                    </p>
                    <p className="mt-2 text-sm text-white/84">
                      La IA estima la línea o categoría más cercana.
                    </p>
                  </div>
                  <div className="rounded-[1.1rem] border border-white/12 bg-white/8 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
                      3. Sugerir
                    </p>
                    <p className="mt-2 text-sm text-white/84">
                      Se propone un producto real para abrir la compra.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 md:px-10 md:py-10 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="rounded-[1.6rem] bg-[#0C535B] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/58">
                    Imagen de referencia
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">
                    Detección visual
                  </h2>
                </div>
                <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
                  Demo
                </span>
              </div>

              <div className="mt-5 overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/8 p-3">
                <Image
                  src={selectedProduct.imagen}
                  alt={selectedProduct.nombre}
                  width={520}
                  height={360}
                  className="h-52 w-full rounded-[1rem] object-cover"
                />
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-[1.15rem] border border-white/10 bg-white/8 px-4 py-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M14.5 4H9.5L8 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3l-1.5-2Z" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    Categoría detectada
                  </p>
                  <p className="mt-1 text-sm text-white/74">
                    Luces y direccionales
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.6rem] border border-black/8 bg-[#fbfbfa] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8b8d91]">
                Vista del cliente
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-[#0C535B]">
                Así se vería en la página
              </h2>

              <div className="mt-5 rounded-[1.3rem] border border-dashed border-black/10 bg-white p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0C535B] text-white">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <path d="M7 10 12 15l5-5" />
                        <path d="M12 15V3" />
                      </svg>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-[#0C535B]">
                        Sube una foto del repuesto
                      </p>
                      <p className="mt-1 text-sm text-[#6d737a]">
                        JPG, PNG o WEBP. Ideal hasta 1 MB.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full bg-[#27B1B8] px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B]"
                  >
                    Elegir imagen
                  </button>
                </div>
              </div>

              <div className="mt-5 rounded-[1.3rem] border border-black/8 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.05)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <Image
                    src={selectedProduct.imagen}
                    alt={selectedProduct.nombre}
                    width={128}
                    height={96}
                    className="h-24 w-32 rounded-[1rem] object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-2xl font-semibold tracking-[-0.04em] text-[#1f2328]">
                      {selectedProduct.nombre}
                    </p>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8b8d91]">
                      {selectedProduct.categoria}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#eef6ff] px-3 py-1 text-[11px] font-semibold text-[#0C535B]">
                        Coincidencia 94%
                      </span>
                      <span className="rounded-full bg-[#eff8f0] px-3 py-1 text-[11px] font-semibold text-[#2d7b48]">
                        {selectedProduct.disponibilidad}
                      </span>
                    </div>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-3xl font-semibold tracking-[-0.05em] text-[#27B1B8]">
                      {selectedProduct.precio}
                    </p>
                    <button
                      type="button"
                      className="mt-3 rounded-full border border-black/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                    >
                      Ver
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={`/producto/${selectedProduct.slug}`}
                  className="rounded-full bg-[#0C535B] px-5 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-[#073D43]"
                >
                  Abrir producto sugerido
                </Link>
                <Link
                  href={`/categorias?categoria=${slugCategoria(selectedProduct.categoria)}`}
                  className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-[#0C535B] transition-colors duration-200 hover:bg-[#0C535B] hover:text-white"
                >
                  Ver categoría detectada
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
