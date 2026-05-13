import Image from "next/image";
import Link from "next/link";
import HeroCarousel from "./components/hero-carousel";
import OfferRoulette from "./components/offer-roulette";
import ProductosCarousel from "./components/productos-carousel";
import SiteFooter from "./components/site-footer";
import { getFeaturedProducts } from "@/lib/products";

const combos = [
  {
    id: "kit-luces-completo",
    nombre: "Kit Iluminación Completo",
    imagen: "/hero-kliniu.jpg",
    destacado: true,
    items: ["Farola LED Pulse S1", "Kit direccional Orbit Pro", "Luz auxiliar Nexo"],
    precio: "$489.900",
    href: "/categorias?categoria=luces-y-direccionales",
  },
  {
    id: "kit-motor-ventilacion",
    nombre: "Kit Motor y Ventilación",
    imagen: "/motor-ventilador-axis-compact.png",
    destacado: false,
    items: ["Motor ventilador Axis", "Ventilador Flux One", "Rotor Magna Air"],
    precio: "$799.900",
    href: "/categorias?categoria=motores-y-ventiladores",
  },
  {
    id: "kit-cauchos-industriales",
    nombre: "Kit Cauchos Industriales",
    imagen: "/hero-kliniu.jpg",
    destacado: false,
    items: ["Kit sello Flex Guard", "Juego cauchos Heavy Grip", "Aro técnico Black Seal"],
    precio: "$399.900",
    href: "/categorias?categoria=linea-cauchos",
  },
];

const features = [
  {
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    titulo: "Diseñados para alto tráfico",
    desc: "Resistentes, eficientes y de larga duración.",
  },
  {
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    titulo: "Higiene que genera confianza",
    desc: "Mejores experiencias para tus usuarios.",
  },
  {
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>
        <path d="M9 12h6"/>
        <circle cx="12" cy="12" r="9"/>
      </svg>
    ),
    titulo: "Compatibilidad total",
    desc: "Insumos y repuestos garantizados.",
  },
  {
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
      </svg>
    ),
    titulo: "Ahorro y eficiencia",
    desc: "Sistemas que optimizan consumo y mantenimiento.",
  },
  {
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    titulo: "Garantía KLINIU",
    desc: "Calidad respaldada por más de 40 años.",
  },
];

export default async function Home() {
  const productos = await getFeaturedProducts();

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <OfferRoulette
        offers={productos.slice(0, 6).map((p) => ({
          slug: p.slug,
          nombre: p.nombre,
          marca: p.marca,
          descuento: p.descuento,
          imagen: p.imagen,
          precio: p.precio,
        }))}
      />

      <HeroCarousel />

      {/* ── Productos destacados ── */}
      <section className="py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="flex items-center gap-12">
            {/* Label */}
            <div className="w-64 shrink-0">
              <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-[#27B1B8]">
                Productos
                <br />
                destacados
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6e7379]">
                Los más elegidos
                <br />
                por nuestros clientes
              </p>
            </div>

            {/* Carousel */}
            <ProductosCarousel products={productos} />
          </div>
        </div>
      </section>

      {/* ── Combos recomendados ── */}
      <section className="bg-[#f3f4f6] py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="flex items-start gap-12">
            {/* Label */}
            <div className="w-64 shrink-0 pt-2">
              <h2 className="text-4xl font-extrabold leading-tight tracking-tight text-[#27B1B8]">
                Combos
                <br />
                recomendados
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#6e7379]">
                Todo lo que necesitas en
                <br />
                un solo combo
              </p>
            </div>

            {/* Combo cards */}
            <div className="scrollbar-hidden flex min-w-0 flex-1 gap-4 overflow-x-auto pb-2">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="relative w-[220px] min-w-[220px] shrink-0 overflow-hidden rounded-2xl border border-black/8 bg-white"
                >
                  {combo.destacado && (
                    <span className="absolute left-3 top-3 z-10 rounded-lg bg-[#f5a623] px-2.5 py-1 text-[11px] font-bold text-white">
                      Más vendido
                    </span>
                  )}
                  <div className="flex h-40 items-center justify-center bg-[#f8f8f7] p-4">
                    <Image
                      src={combo.imagen}
                      alt={combo.nombre}
                      width={160}
                      height={130}
                      className="max-h-32 w-auto object-contain"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="font-semibold text-[#111]">{combo.nombre}</p>
                    <ul className="space-y-1">
                      {combo.items.map((item) => (
                        <li key={item} className="flex items-start gap-1.5 text-xs text-[#555]">
                          <span className="mt-px text-[#27B1B8]">✓</span>
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
                  <p className="font-bold leading-snug text-[#0C535B]">
                    ¿Necesitas un combo personalizado?
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#3a7a80]">
                    Te ayudamos a armar la solución perfecta para tus espacios.
                  </p>
                </div>
                <div className="mt-4 flex flex-col items-start gap-3">
                  <Image
                    src="/robot-kliniu.jpg"
                    alt="Kliniu"
                    width={64}
                    height={64}
                    className="rounded-xl object-cover"
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

      {/* ── Video placeholder ── */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-[960px] px-6">
          <div className="flex aspect-video items-center justify-center rounded-3xl bg-[#f3f4f6]">
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#27B1B8] text-2xl text-white shadow-lg">
                ▶
              </div>
              <p className="mt-4 text-5xl font-black tracking-tight text-[#d0d3d8]">
                video
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section className="bg-[#0C535B] py-10">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="flex items-center gap-6 lg:gap-8">
            {features.map((f) => (
              <div key={f.titulo} className="flex flex-1 flex-col items-center gap-2 text-center text-white md:flex-row md:text-left">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/24 bg-white/12 text-white">
                  {f.icono}
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight">{f.titulo}</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-white/70">{f.desc}</p>
                </div>
              </div>
            ))}
            <div className="hidden shrink-0 lg:block">
              <Image
                src="/robot-kliniu.jpg"
                alt="Kliniu"
                width={88}
                height={88}
                className="rounded-xl object-cover opacity-90"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Dos CTAs ── */}
      <section className="bg-white px-6 py-16">
        <div className="mx-auto grid max-w-[1440px] gap-6 md:grid-cols-2">
          {/* Asesoría */}
          <div className="flex overflow-hidden rounded-2xl border border-black/8 bg-[#f0f9f9]">
            <div className="flex flex-1 flex-col justify-center p-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#27B1B8]">
                Asesoría personalizada
              </p>
              <h3 className="mt-3 text-2xl font-extrabold leading-snug tracking-tight text-[#0C535B]">
                Te ayudamos a elegir la mejor solución
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5a7a7c]">
                Nuestro equipo experto te acompaña en cada paso.
              </p>
              <a
                href="https://wa.me/573057249454"
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#0C535B] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Hablar con un asesor 💬
              </a>
            </div>
            <div className="relative hidden w-44 shrink-0 md:block">
              <Image
                src="/chatbot/mockup.jpg"
                alt="Asesor Kliniu"
                fill
                sizes="176px"
                className="object-cover object-top"
              />
            </div>
          </div>

          {/* Reposición */}
          <div className="flex overflow-hidden rounded-2xl border border-black/8 bg-[#f8f8f7]">
            <div className="flex flex-1 flex-col justify-center p-8">
              <p className="text-[11px] font-bold uppercase tracking-widest text-[#27B1B8]">
                Reposición fácil rápida
              </p>
              <h3 className="mt-3 text-2xl font-extrabold leading-snug tracking-tight text-[#111]">
                Insumos que tu espacio necesita, siempre a tiempo
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6e7379]">
                Compra recurrente que facilita tu operación.
              </p>
              <Link
                href="/categorias"
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-[#27B1B8] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#1E969B]"
              >
                Ver insumos y repuestos 💬
              </Link>
            </div>
            <div className="relative hidden w-44 shrink-0 md:block">
              <Image
                src="/category-banner-motor.jpg"
                alt="Repuestos Kliniu"
                fill
                sizes="176px"
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
