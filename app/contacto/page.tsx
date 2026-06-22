import type { Metadata } from "next";
import Image from "next/image";
import SiteFooter from "../components/site-footer";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "Contacto | Kliniu",
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
    value: "Av 28 No. 34-43 Bogotá D.C, Col.",
    href: "https://www.google.com/maps/search/?api=1&query=Av+28+No+34-43+Bogota+Colombia",
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
    direccion: "Av 28 No. 34-43\nBogotá, Col.",
    telefono: "+57 (311) 2088806",
    wa: "https://wa.me/573112088806",
  },
  {
    bandera: "/flag-republica-dominicana.png",
    nombre: "República\nDominicana",
    direccion: "Santo Domingo\nRep. Dominicana",
    telefono: "+1 (809) 850 7005",
    wa: "https://wa.me/18098507005",
  },
  {
    bandera: "/flag-ecuador.png",
    nombre: "Ecuador",
    direccion: "Calle B # 535-205\nVilla Del sur de Quito",
    telefono: "+593 992 573302",
    wa: "https://wa.me/593992573302",
  },
  {
    bandera: "/flag-usa.png",
    nombre: "U.S.A",
    direccion: "Miami\nFlorida",
    telefono: "+1 786 501 5081",
    wa: "https://wa.me/17865015081",
  },
  {
    bandera: "/flag-canada.png",
    nombre: "Canada",
    direccion: "London,\nOntario.",
    telefono: "+1 647 548 8481",
    wa: "https://wa.me/16475488481",
  },
  {
    bandera: "/flag-nicaragua.png",
    nombre: "Nicaragua",
    direccion: "Calle principal de Altamira\nfrente a Ceca contiguo\na farmacia Praga",
    telefono: "+505 82508359",
    wa: "https://wa.me/50582508359",
  },
  {
    bandera: "/flag-honduras.png",
    nombre: "Honduras",
    direccion: "Colonia Miramontes 3ra\ncalle casa 2165\nTegucigalpa, Honduras",
    telefono: "+504 31852275",
    wa: "https://wa.me/50431852275",
  },
  {
    bandera: "/flag-guatemala.png",
    nombre: "Guatemala",
    direccion: "Dirección: calle 3-41\nA sector B5 Zona 8\nde Mixco",
    telefono: "+502 3032 2650",
    wa: "https://wa.me/50230322650",
  },
];

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-white text-[#111]">
      {/* Hero */}
      <section className="home-reveal relative aspect-[4500/2083] md:aspect-[10000/2084]" style={{ overflow: "clip" }}>
        <Image
          src="/banners-web/BANNER-FINALES-09.png"
          alt="Atención Kliniu"
          fill
          priority
          unoptimized
          sizes="100vw"
          className="hidden object-cover object-center md:block"
        />
        <Image
          src="/banners-responsive/BANNER-FINALES-30.png"
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
          <div className="grid grid-cols-2 divide-x divide-black/8 md:grid-cols-4">
            {contactBar.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                className="interactive-lift flex flex-col items-center gap-2 px-4 py-5 text-center transition-colors hover:bg-[#f0f8f8]"
              >
                <span className="text-[#27B1B8]">{item.icon}</span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6e7379]">
                  {item.label}
                </span>
                <span className="text-sm font-bold text-[#0C535B]">{item.value}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Paises donde operamos */}
      <section className="home-reveal bg-white py-10 md:py-14">
        <div className="mx-auto max-w-[1440px] px-5">
          <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-10">
            {/* Left */}
            <div className="hidden flex-col lg:flex lg:min-h-[430px]">
              <h2 className="text-3xl font-black leading-[0.95] tracking-tight text-[#0C535B]">
                Países donde
                <br />
                <span className="text-[#27B1B8]">operamos</span>
              </h2>
              <p className="mt-5 max-w-[270px] text-[15px] font-semibold leading-[1.12] text-black">
                Contamos con presencia y aliados estratégicos en distintos países de América para
                brindarte soluciones de higiene de alto desempeño.
              </p>
              <Image
                src="/foca-senalando-paises.png"
                alt="Foca Kliniu señalando"
                width={300}
                height={275}
                className="hidden w-[220px] object-contain lg:mt-auto lg:block"
              />
            </div>

            {/* Grid de países */}
            <div className="-mx-5 flex gap-4 overflow-x-auto px-5 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4">
              {paises.map((p) => (
                <div
                  key={p.nombre}
                  className="interactive-lift flex min-h-[188px] w-[232px] min-w-[232px] items-center gap-4 rounded-xl border border-black/10 bg-white px-5 py-5 shadow-sm transition-shadow hover:shadow-md sm:w-auto sm:min-w-0"
                >
                  <div className="shrink-0">
                    <Image
                      src={p.bandera}
                      alt={`Bandera ${p.nombre.replace(/\n/g, " ")}`}
                      width={72}
                      height={72}
                      className="h-[72px] w-[72px] rounded-full object-cover shadow-sm"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col">
                    <p className="whitespace-pre-line text-[15px] font-black leading-tight text-black">
                      {p.nombre}
                    </p>
                    <p className="mt-1.5 whitespace-pre-line text-[11px] leading-[1.4] text-gray-600">
                      {p.direccion}
                    </p>
                    <p className="mt-1.5 text-[11px] font-semibold text-gray-800">{p.telefono}</p>
                    <a
                      href={p.wa}
                      target="_blank"
                      rel="noreferrer"
                      className="shine-sweep mt-2 inline-flex items-center gap-1.5 text-[12px] font-black text-[#0C535B] hover:underline"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.073.528 4.024 1.455 5.726L.057 24l6.434-1.383C8.055 23.507 9.987 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.883 0-3.655-.506-5.183-1.393l-.372-.22-3.819.822.839-3.701-.243-.381A9.937 9.937 0 012 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z" />
                      </svg>
                      WhatsApp
                    </a>
                  </div>
                </div>
              ))}
            </div>
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
