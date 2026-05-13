import Image from "next/image";
import Link from "next/link";
import HeroCarousel from "./components/hero-carousel";
import ProductosCarousel from "./components/productos-carousel";
import SiteFooter from "./components/site-footer";
import { getFeaturedProducts } from "@/lib/products";

const combos = [
  {
    id: "kit-alto-trafico",
    nombre: "Kit alto tráfico",
    imagen: "/motor-ventilador-axis-compact.png",
    destacado: true,
    items: ["Dispensador de toalla", "Dispensador de jabón", "Servilletas"],
    precio: "$149.900",
    href: "/categorias",
  },
  {
    id: "kit-banos-publicos",
    nombre: "Kit baños públicos",
    imagen: "/motor-ventilador-axis-compact.png",
    destacado: false,
    items: ["Dispensador papel", "Dispensador jabón", "Dispensador alcohol"],
    precio: "$189.900",
    href: "/categorias",
  },
  {
    id: "kit-hotel-premium",
    nombre: "Kit hotel premium",
    imagen: "/motor-ventilador-axis-compact.png",
    destacado: false,
    items: ["Dispensador triple", "Toallero inox", "Soporte pared"],
    precio: "$249.900",
    href: "/categorias",
  },
];

const features = [
  {
    titulo: "Diseñados para\nalto tráfico",
    desc: "Resistentes, eficientes\ny de larga duración.",
  },
  {
    titulo: "Higiene que\ngenera confianza",
    desc: "Mejores experiencias\npara tus usuarios.",
  },
  {
    titulo: "Compatibilidad\ntotal",
    desc: "Insumos y repuestos\ngarantizados.",
  },
  {
    titulo: "Ahorro\ny eficiencia",
    desc: "Sistemas que optimizan\nconsumo y mantenimiento",
  },
  {
    titulo: "Garantía\nKLINIU",
    desc: "Calidad respaldada\npor más de 40 años",
  },
];

const videos = [
  { id: 1, titulo: "Dispensador automático" },
  { id: 2, titulo: "Kit alto tráfico" },
  { id: 3, titulo: "KlinOx Inoxidable" },
  { id: 4, titulo: "Soluciones hotel" },
  { id: 5, titulo: "Instalación rápida" },
];

export default async function Home() {
  const productos = await getFeaturedProducts();

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <HeroCarousel />

      {/* ── Productos destacados ── */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="flex items-start gap-10">
            <div className="w-56 shrink-0 pt-1">
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#27B1B8]">
                Productos
                <br />
                destacados
              </h2>
              <p className="mt-2 text-sm leading-5 text-[#6e7379]">
                Los más elegidos
                <br />
                por nuestros clientes
              </p>
            </div>
            <ProductosCarousel products={productos} />
          </div>
        </div>
      </section>

      {/* ── Soluciones para cada necesidad (videos) ── */}
      <section className="bg-[#f0f8f8] py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight text-[#27B1B8]">
              Soluciones para cada necesidad
            </h2>
            <p className="mt-2 text-sm text-[#6e7379]">
              Descubre cómo nuestras soluciones mejoran la experiencia,
              optimizan recursos y elevan cada espacio.
            </p>
          </div>

          {/* Video cards carousel */}
          <div className="relative">
            <div className="scrollbar-hidden flex gap-4 overflow-x-auto pb-2">
              {videos.map((v, i) => (
                <div
                  key={v.id}
                  className={`flex shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border border-black/8 bg-white transition-shadow hover:shadow-md ${
                    i === 2 ? "h-52 w-48" : "h-44 w-40"
                  }`}
                >
                  <div className="flex flex-col items-center gap-3 p-4 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#27B1B8] text-[#27B1B8]">
                      <svg viewBox="0 0 24 24" className="h-5 w-5 translate-x-0.5" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                    <p className="text-xs font-medium text-[#0C535B]">{v.titulo}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Nav arrows */}
            <button
              type="button"
              aria-label="Anterior"
              className="absolute -left-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              className="absolute -right-4 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition-colors hover:border-[#27B1B8] hover:text-[#27B1B8]"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {/* ── Combos recomendados ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="flex items-start gap-10">
            <div className="w-56 shrink-0 pt-1">
              <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-[#27B1B8]">
                Combos
                <br />
                recomendados
              </h2>
              <p className="mt-2 text-sm leading-5 text-[#6e7379]">
                Todo lo que necesitas en
                <br />
                un solo combo
              </p>
            </div>

            <div className="scrollbar-hidden flex min-w-0 flex-1 gap-4 overflow-x-auto pb-2">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="relative w-[210px] min-w-[210px] shrink-0 overflow-hidden rounded-2xl border border-black/8 bg-white"
                >
                  {combo.destacado && (
                    <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#f5a623] px-2.5 py-1 text-[10px] font-bold text-white">
                      Más vendido
                    </span>
                  )}
                  <div className="flex h-36 items-center justify-center bg-[#f8f8f7] p-4">
                    <Image
                      src={combo.imagen}
                      alt={combo.nombre}
                      width={120}
                      height={100}
                      className="max-h-28 w-auto object-contain"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="font-semibold text-[#111]">{combo.nombre}</p>
                    <ul className="space-y-1">
                      {combo.items.map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-xs text-[#555]">
                          <span className="mt-px text-[#27B1B8]">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between pt-1">
                      <p className="font-bold text-[#111]">{combo.precio}</p>
                      <Link
                        href={combo.href}
                        className="rounded-full border border-[#27B1B8] px-3 py-1 text-xs font-bold text-[#27B1B8] transition-colors hover:bg-[#27B1B8] hover:text-white"
                      >
                        Ver combo
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {/* CTA card */}
              <div className="flex w-[200px] min-w-[200px] shrink-0 flex-col justify-between rounded-2xl bg-[#e8f5f5] p-5">
                <div>
                  <p className="font-bold leading-snug text-[#0C535B]">Arma tu combo</p>
                  <p className="mt-2 text-xs leading-5 text-[#3a7a80]">
                    Te ayudamos a armar la solución perfecta para tus espacios.
                  </p>
                </div>
                <div className="mt-4 flex flex-col items-start gap-3">
                  <Image
                    src="/logo.png"
                    alt="Kliniu"
                    width={60}
                    height={20}
                    className="opacity-60"
                  />
                  <Link
                    href="/contacto"
                    className="rounded-full bg-[#0C535B] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90"
                  >
                    Cotizar ahora
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section className="bg-[#0C535B] py-10">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            {features.map((f) => (
              <div
                key={f.titulo}
                className="flex items-center gap-3 text-white"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="whitespace-pre-line text-sm font-bold leading-tight">{f.titulo}</p>
                  <p className="mt-0.5 whitespace-pre-line text-[11px] leading-4 text-white/65">{f.desc}</p>
                </div>
              </div>
            ))}
            <div className="hidden shrink-0 lg:block">
              <Image
                src="/kliniu-loader-logo.png"
                alt="Kliniu"
                width={72}
                height={72}
                className="object-contain opacity-90"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Dos CTAs ── */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto grid max-w-[1440px] gap-5 md:grid-cols-2">
          {/* Asesoría */}
          <div className="flex overflow-hidden rounded-2xl border border-black/8">
            <div className="flex flex-1 flex-col justify-center p-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#27B1B8]">
                Asesoría personalizada
              </p>
              <h3 className="mt-3 text-xl font-extrabold leading-snug tracking-tight text-[#0C535B]">
                Te ayudamos a elegir
                <br />
                la mejor solución
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5a7a7c]">
                Nuestro equipo experto te acompaña en cada paso.
              </p>
              <a
                href="https://wa.me/573125860921"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#0C535B] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Hablar con un asesor
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.073.528 4.024 1.455 5.726L.057 24l6.434-1.383C8.055 23.507 9.987 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.883 0-3.655-.506-5.183-1.393l-.372-.22-3.819.822.839-3.701-.243-.381A9.937 9.937 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
                </svg>
              </a>
            </div>
            <div className="relative hidden w-48 shrink-0 md:block">
              <Image
                src="/hero-banner-2.jpg"
                alt="Asesor Kliniu"
                fill
                sizes="192px"
                className="object-cover object-center"
              />
            </div>
          </div>

          {/* Reposición */}
          <div className="flex overflow-hidden rounded-2xl border border-black/8 bg-[#f8f8f7]">
            <div className="flex flex-1 flex-col justify-center p-8">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#27B1B8]">
                Reposición fácil y rápida
              </p>
              <h3 className="mt-3 text-xl font-extrabold leading-snug tracking-tight text-[#111]">
                Insumos que tu espacio
                <br />
                necesita, siempre a tiempo
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6e7379]">
                Compra recurrente que facilita tu operación.
              </p>
              <Link
                href="/categorias"
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#27B1B8] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1E969B]"
              >
                Ver insumos y repuestos →
              </Link>
            </div>
            <div className="relative hidden w-48 shrink-0 md:block">
              <Image
                src="/hero-banner-3.jpg"
                alt="Insumos Kliniu"
                fill
                sizes="192px"
                className="object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
