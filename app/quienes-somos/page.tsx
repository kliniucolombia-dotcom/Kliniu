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
    icono: "/nosotros-iconos/cumplimiento.png",
  },
  {
    titulo: "Calidad humana",
    descripcion:
      "Creemos firmemente en que las buenas personas aportan buenas ideas y ambiente laboral que permite consentir la elaboración de cada producto.",
    icono: "/nosotros-iconos/calidad-humana.png",
  },
  {
    titulo: "Innovación",
    descripcion:
      "Creamos soluciones nuevas cada mes para mantener la higiene de la manera más segura e inteligente.",
    icono: "/nosotros-iconos/innovacion.png",
  },
  {
    titulo: "Responsabilidad",
    descripcion:
      "Trabajamos con responsabilidad, cercanía y respaldo para aportar valor a cada espacio.",
    icono: "/nosotros-iconos/responsabilidad.png",
  },
  {
    titulo: "Confianza",
    descripcion:
      "Construimos relaciones duraderas basadas en la transparencia y el respeto.",
    icono: "/nosotros-iconos/confianza.png",
  },
  {
    titulo: "Sostenibilidad",
    descripcion:
      "Diseñamos productos pensando en el menor impacto ambiental posible.",
    icono: "/nosotros-iconos/sostenibilidad.png",
  },
  {
    titulo: "Excelencia",
    descripcion:
      "Nos esforzamos por superar las expectativas en cada producto y servicio que ofrecemos.",
    icono: "/nosotros-iconos/excelencia.png",
  },
];

const certificaciones = [
  {
    titulo: "Bureau Veritas",
    imagen: "/nosotros-calidad/bureau-veritas.png",
    ancho: 220,
    alto: 105,
    clase: "max-h-[48px]",
  },
  {
    titulo: "Cámara de Comercio de Bogotá",
    imagen: "/nosotros-calidad/camara-comercio.png",
    ancho: 190,
    alto: 125,
    clase: "max-h-[58px]",
  },
  {
    titulo: "Corferias",
    imagen: "/nosotros-calidad/corferias.png",
    ancho: 180,
    alto: 91,
    clase: "max-h-[54px]",
  },
  {
    titulo: "FDA",
    imagen: "/nosotros-calidad/fda.png",
    ancho: 180,
    alto: 126,
    clase: "max-h-[58px]",
  },
  {
    titulo: "ISO 9001",
    imagen: "/nosotros-calidad/iso-9001.png",
    ancho: 120,
    alto: 154,
    clase: "max-h-[74px]",
  },
  {
    titulo: "ISO 14001",
    imagen: "/nosotros-calidad/iso-14001.png",
    ancho: 120,
    alto: 157,
    clase: "max-h-[74px]",
  },
  {
    titulo: "Válvula patentada",
    imagen: "/nosotros-calidad/valvula-patentada.png",
    ancho: 128,
    alto: 128,
    clase: "max-h-[70px]",
  },
];

export default function QuienesSomosPage() {
  return (
    <main className="min-h-screen bg-white text-[#111]">
      {/* Hero */}
      <section className="nosotros-section-energy home-reveal mx-auto max-w-[1440px] px-4 py-10 sm:px-6 md:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <h1 className="nosotros-title-pop text-3xl font-extrabold leading-tight tracking-tight text-[#111] sm:text-4xl md:text-5xl">
              Acerca de{" "}
              <span className="text-[#27B1B8]">nosotros</span>
            </h1>
            <div className="mt-3 h-1 w-12 rounded-full bg-[#27B1B8]" />
            <p className="mt-5 text-sm leading-7 text-[#555] sm:text-base sm:leading-8">
              Somos Kliniu, una compañía colombiana dedicada a desarrollar y comercializar ideas de
              dispensadores y limpieza. Desarrollamos nuestras ideas haciéndolas realidad a través
              de un proceso de creatividad e industrial en donde hacemos los moldes de inyección de
              plástico para posteriormente su inyección y concepción de los diferentes dispensadores
              que ofrecemos, con el firme propósito de crear mes a mes nuevas soluciones que le
              permitan a nuestros clientes mantener la higiene y desinfección de la manera más
              segura e inteligente.
            </p>
          </div>
          <div className="interactive-lift hidden items-center justify-center overflow-hidden rounded-2xl bg-[#f8f8f7] md:flex">
            <Image
              src="/banner-foto-nosotros.png"
              alt="Productos Kliniu en ambiente de baño"
              width={600}
              height={420}
              className="nosotros-hero-photo h-56 w-full object-cover sm:h-72 lg:h-96"
            />
          </div>
        </div>
      </section>

      {/* Misión / Visión */}
      <section className="nosotros-section-energy mx-auto w-full max-w-[1480px] px-4 pb-20 pt-2 sm:px-5 md:pb-28">
        <div className="mx-auto grid gap-8 md:grid-cols-2 md:gap-9">
          {/* Misión */}
          <div
            className="nosotros-panel relative rounded-[12px] text-white"
            style={{ background: "linear-gradient(150deg, #1D7378 0%, #00383B 100%)" }}
          >
            <div className="flex flex-col gap-4 px-7 pb-10 pt-9 sm:flex-row sm:gap-6 sm:px-12 sm:pt-14 md:gap-7 lg:px-16">
              <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full border-2 border-white/90 sm:h-[108px] sm:w-[108px]">
                <Image
                  src="/nosotros-iconos/mision.png"
                  alt=""
                  width={64}
                  height={64}
                  className="nosotros-icon h-12 w-12 object-contain brightness-0 invert sm:h-16 sm:w-16"
                />
              </div>
              <div className="max-w-[440px] pt-0 sm:pt-3">
                <h2 className="text-[30px] font-black uppercase leading-none tracking-normal sm:text-[36px]">
                  MISIÓN
                </h2>
                <p className="mt-3 max-w-[390px] text-[14px] font-bold leading-[1.25] text-white sm:text-[16px]">
                  Nuestra misión es fabricar ideas en productos que ayuden a la limpieza y
                  desinfección.
                </p>
                <div className="mt-4 h-0.5 w-[70px] bg-white" />
              </div>
            </div>
          </div>

          {/* Visión */}
          <div
            className="nosotros-panel relative rounded-[12px] text-white"
            style={{ background: "linear-gradient(180deg, #2A9D8F 0%, #4AADA8 100%)" }}
          >
            <div className="flex flex-col gap-4 px-7 pb-10 pt-9 sm:flex-row sm:gap-6 sm:px-12 sm:pt-14 md:gap-7 lg:px-16">
              <div className="flex h-[88px] w-[88px] shrink-0 items-center justify-center rounded-full border-2 border-white/90 sm:h-[108px] sm:w-[108px]">
                <Image
                  src="/nosotros-iconos/vision.png"
                  alt=""
                  width={64}
                  height={64}
                  className="nosotros-icon h-12 w-12 object-contain brightness-0 invert sm:h-16 sm:w-16"
                />
              </div>
              <div className="max-w-[440px] pt-0 sm:pt-3">
                <h2 className="text-[30px] font-black uppercase leading-none tracking-normal sm:text-[36px]">
                  VISIÓN
                </h2>
                <p className="mt-3 max-w-[440px] text-[14px] font-bold leading-[1.25] text-white sm:text-[16px]">
                  Nuestra visión es ser líderes en el 2.023 en la fabricación y comercialización en
                  Colombia, Centro América y El Caribe de dispensadores e insumos de aseo personal.
                </p>
                <div className="mt-4 h-0.5 w-[70px] bg-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Valores corporativos */}
      <section className="nosotros-section-energy bg-[#f8f8f7] py-10 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6">
          <h2 className="mb-8 text-center text-2xl font-extrabold tracking-tight text-[#111] sm:text-3xl md:mb-10">
            Valores corporativos
          </h2>
          <div className="nosotros-values-grid grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
            {valores.map((v) => (
              <div
                key={v.titulo}
                className="interactive-lift rounded-2xl border border-black/8 bg-white p-5 text-center shadow-sm"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f5f5]">
                  <Image
                    src={v.icono}
                    alt=""
                    width={30}
                    height={30}
                    className="nosotros-icon h-8 w-8 object-contain"
                  />
                </div>
                <p className="text-sm font-extrabold text-[#0C535B]">{v.titulo}</p>
                <p className="mt-1.5 text-xs leading-5 text-[#6e7379]">{v.descripcion}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Calidad banner */}
      <section className="nosotros-section-energy bg-white px-4 py-10 sm:px-6 md:py-16">
        <div className="mx-auto max-w-[1440px]">
          <div className="nosotros-quality-card interactive-lift relative overflow-hidden rounded-[10px] bg-white pb-8 shadow-[0_18px_40px_rgba(12,83,91,0.08)] md:pb-10">
            <Image
              src="/nosotros-calidad/foca-calidad-cuadro.png"
              alt=""
              width={1352}
              height={376}
              className="nosotros-hero-photo pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-left md:block"
              priority={false}
            />

            <div className="relative z-10 grid min-h-[200px] bg-white md:min-h-[315px] md:grid-cols-[30%_1fr] md:bg-transparent lg:min-h-[330px]">
              <div className="bg-[#0C535B] px-8 py-8 text-center text-white md:bg-transparent md:pl-12 md:pr-8 md:text-left lg:pl-14">
                <h3 className="text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
                  Calidad
                </h3>
                <div className="mx-auto mt-3 h-0.5 w-16 bg-white md:mx-0" />
                <p className="mx-auto mt-4 max-w-[270px] text-sm font-semibold leading-5 md:mx-0 md:text-[13px] md:leading-[1.25]">
                  Trabajamos bajo los más altos estándares de calidad para garantizar soluciones
                  confiables, seguras y duraderas.
                </p>
              </div>

              <div className="relative flex flex-col justify-center gap-7 px-6 py-10 sm:px-10 md:pl-20 md:pr-8 lg:pl-24 lg:pr-12">
                <div className="grid grid-cols-2 items-end gap-x-7 gap-y-7 sm:grid-cols-3 lg:grid-cols-7">
                {certificaciones.map((cert) => (
                  <figure
                    key={cert.titulo}
                    className="nosotros-cert flex min-h-[92px] flex-col items-center justify-end gap-2 text-center"
                  >
                    <Image
                      src={cert.imagen}
                      alt={cert.titulo}
                      width={cert.ancho}
                      height={cert.alto}
                      className={`h-auto w-auto object-contain ${cert.clase} max-w-full`}
                    />
                    <figcaption className="text-[9px] font-medium leading-tight text-[#5f6b72]">
                      {cert.titulo}
                    </figcaption>
                  </figure>
                ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
