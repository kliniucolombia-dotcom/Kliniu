import Image from "next/image";
import Link from "next/link";
import ComboCarousel from "./components/combo-carousel";
import HeroCarousel from "./components/hero-carousel";
import ProductosCarousel from "./components/productos-carousel";
import SiteFooter from "./components/site-footer";
import VideoModal from "./components/video-modal";
import { getFeaturedProducts } from "@/lib/products";
import WhatsAppAsesor from "./components/whatsapp-asesor";

const combos = [
  {
    id: "kit-alto-trafico",
    nombre: "Kit alto tráfico",
    imagen: "/combo-productos-kliniu.png",
    destacado: true,
    items: ["Dispensador de toalla", "Dispensador de jabón", "Servilletas"],
    precio: "$149.900",
    href: "/categorias",
  },
  {
    id: "kit-banos-publicos",
    nombre: "Kit baños públicos",
    imagen: "/combo-productos-kliniu.png",
    destacado: false,
    items: ["Dispensador papel", "Dispensador jabón", "Dispensador alcohol"],
    precio: "$189.900",
    href: "/categorias",
  },
  {
    id: "kit-hotel-premium",
    nombre: "Kit hotel premium",
    imagen: "/combo-productos-kliniu.png",
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
    icon: "/icono-alto-trafico.png",
  },
  {
    titulo: "Higiene que\ngenera confianza",
    desc: "Mejores experiencias\npara tus usuarios.",
    icon: "/icono-higiene.png",
  },
  {
    titulo: "Compatibilidad\ntotal",
    desc: "Insumos y repuestos\ngarantizados.",
    icon: "/icono-compatibilidad.png",
  },
  {
    titulo: "Ahorro\ny eficiencia",
    desc: "Sistemas que optimizan\nconsumo y mantenimiento",
    icon: "/icono-ahorro.png",
  },
  {
    titulo: "Garantía\nKLINIU",
    desc: "Calidad respaldada\npor más de 40 años",
    icon: "/icono-garantia.png",
  },
];

const REEL_DEFAULT = "https://www.instagram.com/reel/DTQToikk3vI/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==";

const videos = [
  { id: 1, titulo: "Dispensador automático", href: REEL_DEFAULT, thumb: "/foca-video-1.png" },
  { id: 2, titulo: "Kit alto tráfico", href: REEL_DEFAULT, thumb: "/foca-video-2.png" },
  { id: 3, titulo: "KlinOx Inoxidable", href: REEL_DEFAULT, thumb: "/foca-video-3.png" },
  { id: 4, titulo: "Soluciones hotel", href: REEL_DEFAULT, thumb: "/foca-video-4.png" },
  { id: 5, titulo: "Instalación rápida", href: REEL_DEFAULT, thumb: "/foca-video-5.png" },
];

export default async function Home() {
  const productos = await getFeaturedProducts();

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <HeroCarousel />

      {/* ── Productos destacados ── */}
      <section className="home-reveal py-10 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex items-baseline justify-between lg:block lg:w-56 lg:shrink-0 lg:pt-1">
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-[#27B1B8] md:text-3xl">
                Productos destacados
              </h2>
              <p className="hidden text-sm leading-5 text-[#6e7379] lg:mt-2 lg:block">
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
      <section className="home-reveal home-delay-1 bg-[#f0f8f8] py-10 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="mb-6 text-center md:mb-8">
            <h2 className="text-xl font-extrabold tracking-tight text-[#27B1B8] sm:text-2xl">
              Soluciones para cada necesidad
            </h2>
            <p className="mt-2 text-sm text-[#6e7379]">
              Descubre cómo nuestras soluciones mejoran la experiencia,
              optimizan recursos y elevan cada espacio.
            </p>
          </div>

          {/* Video cards carousel */}
          <div className="relative mx-auto max-w-[940px]">
            <VideoModal videos={videos} />
          </div>
        </div>
      </section>

      {/* ── Combos recomendados ── */}
      <section className="home-reveal bg-white py-10 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-10">
            <div className="flex items-baseline justify-between lg:block lg:w-56 lg:shrink-0 lg:pt-1">
              <h2 className="text-2xl font-extrabold leading-tight tracking-tight text-[#27B1B8] md:text-3xl">
                Combos recomendados
              </h2>
              <p className="hidden text-sm leading-5 text-[#6e7379] lg:mt-2 lg:block">
                Todo lo que necesitas en
                <br />
                un solo combo
              </p>
            </div>
            <ComboCarousel combos={combos} />
          </div>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section className="home-reveal">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/banners-web/BANNER-FINALES-12.png" alt="Kliniu" className="hidden w-full object-cover md:block" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/banners-responsive/BANNER-FINALES-34.png" alt="Kliniu" className="w-full object-cover md:hidden" />
      </section>

      {/* ── Dos CTAs ── */}
      <section className="home-reveal bg-white px-4 py-10 sm:px-6 md:py-16">
        <div className="mx-auto grid max-w-[1440px] gap-4 md:grid-cols-2 md:gap-5">
          {/* Asesoría → WhatsApp */}
          <a href="https://wa.me/573125860921" target="_blank" rel="noreferrer" className="interactive-lift block overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/banners-web/BANNER-FINALES-13.png" alt="Asesoría Kliniu" className="hidden w-full object-cover md:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/banners-responsive/BANNER-FINALES-32.png" alt="Asesoría Kliniu" className="w-full object-cover md:hidden" />
          </a>

          {/* Insumos → /categorias?tipo=insumos */}
          <Link href="/categorias?tipo=insumos" className="interactive-lift block overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/banners-web/BANNER-FINALES-14.png" alt="Insumos Kliniu" className="hidden w-full object-cover md:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/banners-responsive/BANNER-FINALES-33.png" alt="Insumos Kliniu" className="w-full object-cover md:hidden" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
