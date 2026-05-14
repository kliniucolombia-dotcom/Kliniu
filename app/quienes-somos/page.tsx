import type { Metadata } from "next";
import Image from "next/image";
import SiteFooter from "../components/site-footer";

export const metadata: Metadata = {
  title: "Quiénes somos | Kliniu",
  description:
    "Somos Kliniu, una compañía colombiana dedicada a desarrollar y comercializar dispensadores e insumos de higiene.",
};

const valores = [
  {
    titulo: "Cumplimiento",
    descripcion:
      "Desde el propio con nuestro equipo e trabajo reflejado a todos nuestros clientes.",
  },
  {
    titulo: "Calidad humana",
    descripcion:
      "Creemos firmemente en que las buenas personas aportan buenas ideas y ambiente laboral que permite consentir la elaboración de cada producto.",
  },
  {
    titulo: "Innovación",
    descripcion:
      "Creamos soluciones nuevas cada mes para mantener la higiene de la manera más segura e inteligente.",
  },
  {
    titulo: "Responsabilidad",
    descripcion:
      "Trabajamos con responsabilidad, cercanía y respaldo para aportar valor a cada espacio.",
  },
  {
    titulo: "Confianza",
    descripcion:
      "Construimos relaciones duraderas basadas en la transparencia y el respeto.",
  },
  {
    titulo: "Sostenibilidad",
    descripcion:
      "Diseñamos productos pensando en el menor impacto ambiental posible.",
  },
  {
    titulo: "Excelencia",
    descripcion:
      "Nos esforzamos por superar las expectativas en cada producto y servicio que ofrecemos.",
  },
];

export default function QuienesSomosPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-white text-[#111]">
      {/* Hero */}
      <section className="mx-auto max-w-[1440px] px-6 py-16">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-[#111] md:text-5xl">
              Acerca de{" "}
              <span className="text-[#27B1B8]">nosotros</span>
            </h1>
            <div className="mt-3 h-1 w-12 rounded-full bg-[#27B1B8]" />
            <p className="mt-6 text-base leading-8 text-[#555]">
              Somos Kliniu, una compañía colombiana dedicada a desarrollar y comercializar ideas de
              dispensadores y limpieza. Desarrollamos nuestras ideas haciéndolas realidad a través
              de un proceso de creatividad e industrial en donde hacemos los moldes de inyección de
              plástico para posteriormente su inyección y concepción de los diferentes dispensadores
              que ofrecemos, con el firme propósito de crear mes a mes nuevas soluciones que le
              permitan a nuestros clientes mantener la higiene y desinfección de la manera más
              segura e inteligente.
            </p>
          </div>
          <div className="flex items-center justify-center overflow-hidden rounded-2xl bg-[#f8f8f7]">
            <Image
              src="/hero-banner-1.jpg"
              alt="Dispensador Kliniu"
              width={600}
              height={420}
              className="h-72 w-full object-cover lg:h-96"
            />
          </div>
        </div>
      </section>

      {/* Misión / Visión */}
      <section className="mx-auto w-full max-w-[1440px] px-6 pb-20">
        <div className="grid max-w-[820px] gap-5 md:grid-cols-2">
          {/* Misión */}
          <div className="relative pb-6">
            <div
              className="relative min-h-[225px] overflow-visible rounded-lg px-14 py-8 text-white"
              style={{
                background: "linear-gradient(150deg, #145F64 0%, #003E42 100%)",
                minHeight: 225,
              }}
            >
              <div className="ml-6 flex items-start gap-4">
                <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border border-white">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 17l4-8 4 4 3-6 4 10" /><path d="M3 21h18" />
                  </svg>
                </div>
                <div className="pt-1">
                  <h2 className="text-[20px] font-black uppercase leading-none tracking-tight">MISIÓN</h2>
                  <p
                    className="mt-2 text-[12px] font-semibold leading-[1.08] text-white"
                    style={{ maxWidth: 205 }}
                  >
                    Nuestra misión es fabricar ideas en productos que ayuden a la limpieza y
                    desinfección.
                  </p>
                  <div className="mt-2 h-0.5 w-9 bg-white" />
                </div>
              </div>
              <Image
                src="/foca-vision-cutout.png"
                alt=""
                width={320}
                height={205}
                className="absolute object-contain"
                style={{
                  bottom: -38,
                  left: "58%",
                  width: 300,
                  transform: "translateX(-50%)",
                }}
              />
            </div>
          </div>

          {/* Visión */}
          <div className="relative pb-6">
            <div
              className="relative min-h-[225px] overflow-visible rounded-lg px-14 py-8 text-white"
              style={{
                background: "linear-gradient(150deg, #45B9AD 0%, #7ABCB9 100%)",
                minHeight: 225,
              }}
            >
              <div className="ml-6 flex items-start gap-4">
                <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border border-white">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" /><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
                  </svg>
                </div>
                <div className="pt-1">
                  <h2 className="text-[20px] font-black uppercase leading-none tracking-tight">VISIÓN</h2>
                  <p
                    className="mt-2 text-[12px] font-semibold leading-[1.08] text-white"
                    style={{ maxWidth: 230 }}
                  >
                    Nuestra visión es ser líderes en el 2.023 en la fabricación y comercialización
                    en Colombia, Centro América y El Caribe de dispensadores e insumos de aseo
                    personal.
                  </p>
                  <div className="mt-2 h-0.5 w-9 bg-white" />
                </div>
              </div>
              <Image
                src="/foca-mision-cutout.png"
                alt=""
                width={330}
                height={245}
                className="absolute object-contain"
                style={{
                  bottom: -54,
                  right: 24,
                  width: 320,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Valores corporativos */}
      <section className="bg-[#f8f8f7] py-16">
        <div className="mx-auto max-w-[1440px] px-6">
          <h2 className="mb-10 text-center text-3xl font-extrabold tracking-tight text-[#111]">
            Valores corporativos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {valores.map((v) => (
              <div
                key={v.titulo}
                className="rounded-2xl border border-black/8 bg-white p-5 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#e8f5f5]">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#27B1B8]" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-extrabold text-[#0C535B]">{v.titulo}</p>
                <p className="mt-1.5 text-xs leading-5 text-[#6e7379]">{v.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calidad banner */}
      <section className="bg-[#0C535B] py-12">
        <div className="mx-auto max-w-[1440px] px-6">
          <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
            <div className="max-w-sm text-white">
              <p className="text-sm font-bold uppercase tracking-wider opacity-70">Certificaciones</p>
              <h3 className="mt-2 text-3xl font-extrabold">Calidad</h3>
              <p className="mt-3 text-sm leading-6 opacity-80">
                Trabajamos bajo los más altos estándares de calidad para garantizar soluciones
                confiables, seguras y duraderas.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6">
              {[
                { label: "ISO 9001", color: "bg-white" },
                { label: "ISO 14001", color: "bg-white" },
                { label: "FDA", color: "bg-white" },
                { label: "Cámara de Comercio\nde Bogotá", color: "bg-white" },
                { label: "Corferias", color: "bg-white" },
              ].map((cert) => (
                <div
                  key={cert.label}
                  className="flex h-16 min-w-[80px] items-center justify-center rounded-xl bg-white px-4 shadow-sm"
                >
                  <span className="whitespace-pre-line text-center text-xs font-bold text-[#0C535B]">
                    {cert.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="hidden lg:block">
              <Image
                src="/kliniu-loader-logo.png"
                alt="Kliniu"
                width={100}
                height={100}
                className="object-contain opacity-60"
              />
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
