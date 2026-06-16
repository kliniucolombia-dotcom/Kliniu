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
      <section className="home-reveal relative overflow-visible bg-[#0C535B] py-6">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <div className="grid flex-1 grid-cols-3 gap-4 sm:grid-cols-5">
              {features.map((f) => (
                <div
                  key={f.titulo}
                  className="flex min-w-0 flex-col items-center gap-2 text-center text-white"
                >
                  <img src={f.icon} alt={f.titulo} className="feature-icon-pop h-9 w-9 object-contain brightness-0 invert sm:h-10 sm:w-10" />
                  <div className="min-w-0">
                    <p className="whitespace-pre-line text-[10px] font-bold leading-tight sm:text-xs">{f.titulo}</p>
                    <p className="mt-0.5 hidden whitespace-pre-line text-[10px] leading-4 text-white/65 sm:block">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden w-44 shrink-0 md:block lg:w-56" style={{ marginTop: "-60px", marginBottom: "-60px" }}>
              <Image
                src="/foca-ok-kliniu-original.png"
                alt="Foca Kliniu"
                width={224}
                height={280}
                className="h-auto w-full object-contain"
                style={{ height: "auto" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Dos CTAs ── */}
      <section className="home-reveal bg-white px-4 py-10 sm:px-6 md:py-16">
        <div className="mx-auto grid max-w-[1440px] gap-4 md:grid-cols-2 md:gap-5">
          {/* Asesoría */}
          <div className="motion-card interactive-lift flex overflow-hidden rounded-2xl border border-black/8" style={{ background: "#EAF8F7" }}>
            <div className="flex flex-1 flex-col justify-center p-6 sm:p-8 md:max-w-[52%]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#27B1B8]">
                Asesoría personalizada
              </p>
              <h3 className="mt-3 text-lg font-extrabold leading-snug tracking-tight text-[#0C535B] sm:text-xl">
                Te ayudamos a elegir la mejor solución
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#5a7a7c]">
                Nuestro equipo experto te acompaña en cada paso.
              </p>
              <WhatsAppAsesor className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#0C535B] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90">
                Hablar con un asesor
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.073.528 4.024 1.455 5.726L.057 24l6.434-1.383C8.055 23.507 9.987 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.883 0-3.655-.506-5.183-1.393l-.372-.22-3.819.822.839-3.701-.243-.381A9.937 9.937 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/>
                </svg>
              </WhatsAppAsesor>
            </div>
            <div className="relative hidden min-h-[210px] flex-1 md:block">
              <Image
                src="/banner-asesoria-kliniu.png"
                alt="Asesor Kliniu"
                fill
                sizes="(min-width: 768px) 420px, 0px"
                className="image-lift object-cover object-center"
              />
            </div>
          </div>

          {/* Reposición */}
          <div className="motion-card interactive-lift flex overflow-hidden rounded-2xl border border-black/8" style={{ background: "#EAF8F7" }}>
            <div className="flex flex-1 flex-col justify-center p-6 sm:p-8 md:max-w-[52%]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#27B1B8]">
                Reposición fácil y rápida
              </p>
              <h3 className="mt-3 text-lg font-extrabold leading-snug tracking-tight text-[#111] sm:text-xl">
                Insumos que tu espacio necesita, siempre a tiempo
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#6e7379]">
                Compra recurrente que facilita tu operación.
              </p>
              <Link
                href="/categorias"
                className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-[#0C535B] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                Ver insumos y repuestos →
              </Link>
            </div>
            <div className="relative hidden min-h-[210px] flex-1 md:block">
              <Image
                src="/bodegon-insumos.png"
                alt="Insumos Kliniu"
                fill
                sizes="(min-width: 768px) 420px, 0px"
                className="image-lift object-contain object-center p-2"
              />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
