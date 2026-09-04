import type { Metadata } from "next";
import Image from "next/image";
import SiteFooter from "../components/site-footer";
import ContactForm from "./contact-form";
import ContactBar from "./contact-bar";
import CountryCards from "./country-cards";
import { getBannerByKey } from "@/lib/banners";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Canales de contacto y presencia internacional de Kliniu.",
};

const contactBar = [
  {
    label: "Llámanos",
    value: "+57 311 531 2623",
    href: "tel:+573115312623",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
  {
    label: "Escríbenos",
    value: "ventas@kliniu.com",
    href: "mailto:ventas@kliniu.com",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
  {
    label: "WhatsApp",
    value: "+57 311 531 2623",
    href: "https://wa.me/573115312623",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .84h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
      </svg>
    ),
  },
  {
    label: "Dirección",
    value: "Cra. 28 #34-43, Bogotá",
    href: "https://www.google.com/maps/search/?api=1&query=Cra.+28+%2334-43+Bogota+Colombia",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
  },
];

const paises = [
  {
    bandera: "/flag-colombia.png",
    nombre: "Colombia",
    direccion: "Cra. 28 #34-43, Bogotá",
    contacto: "Kliniu Colombia",
    telefono: "+57 (311) 208 8806",
    wa: "https://wa.me/573112088806",
  },
  {
    bandera: "/flag-republica-dominicana.png",
    nombre: "República\nDominicana",
    direccion: "Santo Domingo\nRep. Dominicana",
    contacto: "Juan O. Mateo R.",
    telefono: "+1 (809) 850-7005",
    wa: "https://wa.me/18098507005",
  },
  {
    bandera: "/flag-ecuador.png",
    nombre: "Ecuador",
    direccion: "Calle B # 535-205\nVilla Del sur de Quito",
    contacto: "Kliniu Ecuador",
    telefono: "+593 992 573302",
    wa: "https://wa.me/593992573302",
  },
  {
    bandera: "/flag-usa.png",
    nombre: "U.S.A",
    direccion: "Miami\nFlorida",
    contacto: "Alejo Ibarra",
    telefono: "+1 (786) 501-5081",
    wa: "https://wa.me/17865015081",
  },
  {
    bandera: "/flag-canada.png",
    nombre: "Canada",
    direccion: "London,\nOntario.",
    contacto: "Raymond",
    telefono: "+1 (289) 886-3086",
    wa: "https://wa.me/12898863086",
  },
  {
    bandera: "/flag-nicaragua.png",
    nombre: "Nicaragua",
    direccion: "Calle principal de Altamira\nfrente a Ceca contiguo\na farmacia Praga",
    contacto: "Kliniu Nicaragua (Li Nicaragua Claro)",
    telefono: "+505 8549 4976",
    wa: "https://wa.me/50585494976",
  },
  {
    bandera: "/flag-honduras.png",
    nombre: "Honduras",
    direccion: "Colonia Miramontes 3ra\ncalle casa 2165\nTegucigalpa, Honduras",
    contacto: "Kliniu Honduras (Li Honduras Claro)",
    telefono: "+504 3185-2275",
    wa: "https://wa.me/50431852275",
  },
  {
    bandera: "/flag-guatemala.png",
    nombre: "Guatemala",
    direccion: "Dirección: calle 3-41\nA sector B5 Zona 8\nde Mixco",
    contacto: "Bodega Li Guatemala",
    telefono: "+502 5510 0279",
    wa: "https://wa.me/50255100279",
  },
  {
    bandera: "/flag-venezuela.png",
    nombre: "Venezuela",
    direccion: "Kliniu Venezuela\nwww.kliniu.com",
    contacto: "Kliniu Venezuela",
    telefono: "+58 424-8706099",
    wa: "https://wa.me/584248706099",
  },
  {
    bandera: "/flag-peru.png",
    nombre: "Perú",
    direccion: "Kliniu\nPerú",
    contacto: "Kliniu Perú",
    telefono: "+51 978 328 508",
    wa: "https://wa.me/51978328508",
  },
];

export default async function ContactoPage() {
  const heroBanner = await getBannerByKey("contacto_hero");
  const heroDesktop = heroBanner?.desktopImage ?? "/banners-web/BANNER-FINALES-09.png";
  const heroMobile = heroBanner?.mobileImage ?? "/banners-responsive/BANNER-FINALES-30.png";
  return (
    <main className="min-h-screen bg-white text-[#111]">
      {/* Hero */}
      <section className="home-reveal relative aspect-[4500/2083] md:aspect-[10000/2084]" style={{ overflow: "clip" }}>
        <Image
          src={heroDesktop}
          alt="Atención Kliniu"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="hidden object-cover object-center md:block"
        />
        <Image
          src={heroMobile}
          alt="Atención Kliniu"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="object-cover object-center md:hidden"
        />
      </section>

      {/* Contact bar */}
      <section className="home-reveal border-y border-black/8 bg-white">
        <div className="mx-auto max-w-[1440px] px-5">
          <ContactBar items={contactBar} />
        </div>
      </section>

      {/* Paises donde operamos */}
      <section className="home-reveal bg-white py-10 md:py-14">
        <div className="mx-auto max-w-[1440px] px-5">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
            {/* Left */}
            <div className="hidden flex-col lg:flex lg:min-h-[430px]">
              <h2 className="text-[32px] font-black leading-[0.95] tracking-tight text-[#0C535B] xl:text-[36px]">
                Países donde
                <br />
                <span className="text-[#27B1B8]">operamos</span>
              </h2>
              <p className="mt-6 max-w-[270px] text-[17px] font-semibold leading-[1.25] text-black xl:text-[18px]">
                Contamos con presencia y aliados estratégicos en distintos países de América para
                brindarte soluciones de higiene de alto desempeño.
              </p>
              <Image
                src="/foca-senalando-paises.png"
                alt="Foca Kliniu señalando"
                width={300}
                height={275}
                className="hidden w-[260px] object-contain lg:mt-auto lg:block"
              />
            </div>

            {/* Grid de países */}
            <CountryCards paises={paises} />
          </div>
        </div>
      </section>

      {/* Formulario */}
      <div className="home-reveal border-t border-black/8 bg-white">
        <ContactForm />
      </div>

      <SiteFooter />
    </main>
  );
}
