import Link from "next/link";
import ComboCarousel from "./components/combo-carousel";
import HeroCarousel from "./components/hero-carousel";
import ProductosCarousel from "./components/productos-carousel";
import SiteFooter from "./components/site-footer";
import VideoModal from "./components/video-modal";
import WhatsAppAsesor from "./components/whatsapp-asesor";
import { getFeaturedProducts } from "@/lib/products";
import { getActiveCombos } from "@/lib/combos";
import { getBannersByKeys } from "@/lib/banners";
import { formatearMoneda } from "./data/catalog";

const REEL_DEFAULT = "https://www.instagram.com/reel/DTQToikk3vI/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==";

const videos = [
  { id: 1, titulo: "Dispensadores para líquidos", href: "https://www.instagram.com/reel/DYiUdCLEd8A/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==", thumb: "/foca-video-1.png" },
  { id: 2, titulo: "Dispensadores de papel, toalla y servilletas", href: "https://www.instagram.com/reel/Da0qOpgiHua/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==", thumb: "/foca-video-2.png" },
  { id: 3, titulo: "KlinOx Acero Inoxidable", href: "https://www.instagram.com/reel/DSKh2tCjfgf/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==", thumb: "/foca-video-3.png" },
  { id: 4, titulo: "Dispensadores de pasta dental", href: REEL_DEFAULT, thumb: "/foca-video-4.png" },
  { id: 5, titulo: "Hoteles y Restaurantes", href: "https://www.instagram.com/reel/DVOelzuDWWd/?utm_source=ig_web_copy_link&igsh=MzRlODBiNWFlZA==", thumb: "/foca-video-5.png" },
];

export default async function Home() {
  const productos = await getFeaturedProducts();
  const combosDb = await getActiveCombos();
  const banners = await getBannersByKeys([
    "home_banner_features",
    "home_banner_asesoria",
    "home_banner_insumos",
    "home_hero_slide_1",
    "home_hero_slide_2",
    "home_hero_slide_3",
  ]);
  const heroSlides = [1, 2, 3].map((i) => {
    const b = banners.get(`home_hero_slide_${i}`);
    return b ? { desktopImage: b.desktopImage, mobileImage: b.mobileImage, link: b.link } : undefined;
  });

  const combos = combosDb.map((combo) => ({
    id: combo.id,
    nombre: combo.name,
    imagen: combo.image ?? "/combo-productos-kliniu.png",
    destacado: false,
    items: combo.items.map((i) => `${i.quantity}× ${i.product.name}`),
    productos: combo.items.map((i) => ({
      nombre: i.product.name,
      cantidad: i.quantity,
      imagen: i.product.image || "/product-placeholder.png",
      precio: formatearMoneda(i.product.price),
    })),
    precio: formatearMoneda(combo.price),
    precioNumero: combo.price,
    sku: combo.sku,
  }));

  const bannerFeatures = banners.get("home_banner_features");
  const bannerAsesoria = banners.get("home_banner_asesoria");
  const bannerInsumos = banners.get("home_banner_insumos");

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <HeroCarousel banners={heroSlides} />

      {/* ── Productos destacados ── */}
      <section className="home-reveal pb-10 pt-10 md:py-16">
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
      <section className="home-reveal hidden md:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bannerFeatures?.desktopImage ?? "/banners-web/BANNER-FINALES-12.png"} alt="Kliniu" className="hidden w-full object-cover md:block" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bannerFeatures?.mobileImage ?? "/banners-responsive/BANNER-FINALES-34.png"} alt="Kliniu" className="hidden" />
      </section>

      {/* ── Dos CTAs ── */}
      <section className="home-reveal bg-white px-4 py-10 sm:px-6 md:py-16">
        <div className="mx-auto grid max-w-[1440px] gap-4 md:grid-cols-2 md:gap-5">
          {/* Asesoría → WhatsApp */}
          <WhatsAppAsesor randomAsesor overrideLink={bannerAsesoria?.link} className="interactive-lift block overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerAsesoria?.desktopImage ?? "/banners-web/BANNER-FINALES-13.png"} alt="Asesoría Kliniu" className="hidden w-full object-cover md:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerAsesoria?.mobileImage ?? "/banners-responsive/BANNER-FINALES-32.png"} alt="Asesoría Kliniu" className="w-full object-cover md:hidden" />
          </WhatsAppAsesor>

          {/* Insumos → /categorias?tipo=insumos */}
          <Link href={bannerInsumos?.link ?? "/categorias?tipo=insumos"} className="interactive-lift block overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerInsumos?.desktopImage ?? "/banners-web/BANNER-FINALES-14.png"} alt="Insumos Kliniu" className="hidden w-full object-cover md:block" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={bannerInsumos?.mobileImage ?? "/banners-responsive/BANNER-FINALES-33.png"} alt="Insumos Kliniu" className="w-full object-cover md:hidden" />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
