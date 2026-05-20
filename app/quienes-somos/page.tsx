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
              src="/banner-foto-nosotros.png"
              alt="Productos Kliniu en ambiente de baño"
              width={600}
              height={420}
              className="h-72 w-full object-cover lg:h-96"
            />
          </div>
        </div>
      </section>

      {/* Misión / Visión */}
      <section className="mx-auto w-full max-w-[1440px] px-6 pb-20">
        <div className="mx-auto grid max-w-[1080px] gap-5 md:grid-cols-2">
          {/* Misión */}
          <div className="relative pb-6">
            <div
              className="relative min-h-[270px] overflow-hidden rounded-lg px-7 py-8 text-white sm:min-h-[290px] sm:px-10 md:px-8 lg:px-10"
              style={{
                background: "linear-gradient(150deg, #145F64 0%, #003E42 100%)",
              }}
            >
              <div className="absolute inset-y-0 left-0 z-[1] w-[72%] bg-gradient-to-r from-[#145F64] via-[#145F64]/95 to-transparent" />
              <div className="relative z-10 flex max-w-[235px] items-start gap-4 sm:max-w-[260px] md:max-w-[230px] lg:max-w-[280px]">
                <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border border-white/90">
                  <Image
                    src="/nosotros-iconos/mision.png"
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain brightness-0 invert"
                  />
                </div>
                <div className="pt-1">
                  <h2 className="text-[21px] font-black uppercase leading-none tracking-tight">MISIÓN</h2>
                  <p
                    className="mt-2 text-[13px] font-semibold leading-[1.12] text-white"
                    style={{ maxWidth: 215 }}
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
                className="pointer-events-none absolute bottom-[-42px] right-[-42px] z-0 w-[250px] object-contain sm:bottom-[-48px] sm:right-[-48px] sm:w-[315px] md:right-[-70px] md:w-[295px] lg:right-[-58px] lg:w-[345px]"
                style={{
                  height: "auto",
                }}
              />
            </div>
          </div>

          {/* Visión */}
          <div className="relative pb-6">
            <div
              className="relative min-h-[270px] overflow-hidden rounded-lg px-7 py-8 text-white sm:min-h-[290px] sm:px-10 md:px-8 lg:px-10"
              style={{
                background: "linear-gradient(150deg, #45B9AD 0%, #7ABCB9 100%)",
              }}
            >
              <div className="absolute inset-y-0 left-0 z-[1] w-[74%] bg-gradient-to-r from-[#45B9AD] via-[#45B9AD]/95 to-transparent" />
              <div className="relative z-10 flex max-w-[235px] items-start gap-4 sm:max-w-[270px] md:max-w-[230px] lg:max-w-[285px]">
                <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full border border-white/90">
                  <Image
                    src="/nosotros-iconos/vision.png"
                    alt=""
                    width={36}
                    height={36}
                    className="h-9 w-9 object-contain brightness-0 invert"
                  />
                </div>
                <div className="pt-1">
                  <h2 className="text-[21px] font-black uppercase leading-none tracking-tight">VISIÓN</h2>
                  <p
                    className="mt-2 text-[13px] font-semibold leading-[1.13] text-white"
                    style={{ maxWidth: 235 }}
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
                className="pointer-events-none absolute bottom-[-64px] right-[-54px] z-0 w-[250px] object-contain sm:bottom-[-76px] sm:right-[-66px] sm:w-[330px] md:right-[-96px] md:w-[300px] lg:bottom-[-92px] lg:right-[-78px] lg:w-[360px]"
                style={{
                  height: "auto",
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
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#e8f5f5]">
                  <Image
                    src={v.icono}
                    alt=""
                    width={30}
                    height={30}
                    className="h-8 w-8 object-contain"
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
      <section className="bg-white px-6 py-16">
        <div className="mx-auto max-w-[1440px]">
          <div className="relative overflow-hidden rounded-[10px] bg-white pb-8 shadow-[0_18px_40px_rgba(12,83,91,0.08)] md:pb-10">
            <Image
              src="/nosotros-calidad/foca-calidad-cuadro.png"
              alt=""
              width={1352}
              height={376}
              className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover object-left md:block"
              priority={false}
            />

            <div className="relative z-10 grid min-h-[280px] bg-white md:min-h-[315px] md:grid-cols-[30%_1fr] md:bg-transparent lg:min-h-[330px]">
              <div className="bg-[#0C535B] px-8 py-10 text-white md:bg-transparent md:pl-12 md:pr-8 lg:pl-14">
                <h3 className="text-3xl font-extrabold tracking-tight md:text-4xl">
                  Calidad
                </h3>
                <div className="mt-3 h-0.5 w-16 bg-white" />
                <p className="mt-4 max-w-[250px] text-sm font-semibold leading-5 md:text-[13px] md:leading-[1.25]">
                  Trabajamos bajo los más altos estándares de calidad para garantizar soluciones
                  confiables, seguras y duraderas.
                </p>
              </div>

              <div className="flex flex-col justify-center gap-7 px-6 py-10 sm:px-10 md:pl-20 md:pr-8 lg:pl-24 lg:pr-12">
                <div className="grid grid-cols-2 items-end gap-x-7 gap-y-7 sm:grid-cols-3 lg:grid-cols-7">
                {certificaciones.map((cert) => (
                  <figure
                    key={cert.titulo}
                    className="flex min-h-[92px] flex-col items-center justify-end gap-2 text-center"
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
