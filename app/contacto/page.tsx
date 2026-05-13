import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import ContactForm from "./contact-form";

export const metadata: Metadata = {
  title: "Contacto | Kliniu",
  description: "Canales de contacto, ubicacion y formulario de atencion de Kliniu.",
};

const contactCards = [
  {
    title: "Numero de contacto",
    value: "3105 161 778",
    href: "tel:+573105161778",
    icon: "/contacto/numero.png",
  },
  {
    title: "Ubicacion",
    value: "Cra. 29 #10-25, Bogota-Colombia",
    href: "https://www.google.com/maps/search/?api=1&query=Cra.+29+%2310-25+Bogota+Colombia",
    icon: "/contacto/ubicacion.png",
  },
  {
    title: "Correo electronico",
    value: "commercial@kliniu.com.co",
    href: "mailto:commercial@kliniu.com.co",
    icon: "/contacto/correo.png",
  },
];

const socialLinks = [
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@grupogeu",
    icon: "/contacto/tiktok.png",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/KliniuColombia?locale=es_LA",
    icon: "/contacto/facebook.png",
  },
  {
    name: "Instagram",
    href: "https://www.instagram.com/kliniu_colombia/",
    icon: "/contacto/instagram.png",
  },
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/company/kliniu-colombia/?viewAsMember=true",
    icon: "/contacto/linkedin.png",
  },
];

const values = [
  {
    title: "Confiable",
    description:
      "Ofrecemos soluciones y repuestos de calidad para un sector donde la seguridad y el rendimiento son clave.",
    icon: "/contacto/confiable.png",
  },
  {
    title: "Especializada",
    description:
      "Nuestro enfoque en transporte masivo nos permite brindar asesoria tecnica y experiencia aplicada al mercado.",
    icon: "/contacto/especializada.png",
  },
  {
    title: "Innovadora",
    description:
      "Impulsamos una presencia digital activa para acercar la marca a nuevos entornos y oportunidades.",
    icon: "/contacto/innovadora.png",
  },
  {
    title: "Comprometida",
    description:
      "Trabajamos con responsabilidad, cercania y respaldo para aportar valor al sistema de transporte publico.",
    icon: "/contacto/comprometida.png",
  },
];

export default function ContactoPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f6] text-[#0C535B]">
      <section className="relative overflow-hidden border-b border-black/6 bg-white">
        <div className="absolute inset-0">
          <Image
            src="/contacto/banner-contacto.jpg"
            alt="Robot de contacto de Kliniu"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[78%_center] md:object-right"
          />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.98)_0%,rgba(255,255,255,0.96)_42%,rgba(255,255,255,0.72)_60%,rgba(255,255,255,0.08)_78%,rgba(255,255,255,0)_100%)]" />

        <div className="relative mx-auto flex min-h-[660px] max-w-[1400px] items-center px-5 py-16 sm:px-6 lg:px-8">
          <div className="max-w-[760px]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#27B1B8]">
              Contacto Kliniu
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-[#27B1B8] sm:text-5xl lg:text-6xl">
              Contactanos
            </h1>
            <p className="mt-4 max-w-[36rem] text-base leading-7 text-[#51606c] sm:text-lg">
              Canales directos para resolver cotizaciones, disponibilidad y atencion comercial especializada para transporte masivo.
            </p>

            <div className="mt-10 overflow-hidden rounded-[18px] border border-black/8 bg-white/94 shadow-[0_18px_40px_rgba(15,23,42,0.09)]">
              <div className="grid sm:grid-cols-3">
                {contactCards.map((item, index) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    target={item.href.startsWith("http") ? "_blank" : undefined}
                    rel={item.href.startsWith("http") ? "noreferrer" : undefined}
                    className={`relative flex min-h-[102px] flex-col items-center justify-center px-5 py-4 text-center transition-colors duration-200 hover:bg-[#EFFAFA] sm:min-h-[110px] ${
                      index < contactCards.length - 1
                        ? "sm:after:absolute sm:after:right-0 sm:after:top-1/2 sm:after:h-[54px] sm:after:w-px sm:after:-translate-y-1/2 sm:after:bg-[#27B1B8]"
                        : ""
                    }`}
                  >
                    <Image
                      src={item.icon}
                      alt=""
                      width={34}
                      height={34}
                      className="h-[34px] w-[34px] object-contain"
                    />
                    <div className="mt-2.5">
                      <p className="text-[11px] font-semibold leading-4 text-[#27B1B8] sm:text-[12px]">
                        {item.title}
                      </p>
                      <p className="mt-1.5 text-[13px] font-medium leading-5 text-[#304556] sm:text-[15px]">
                        {item.value}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {socialLinks.map((social) => (
                <Link
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.name}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_12px_28px_rgba(15,23,42,0.08)] transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <Image
                    src={social.icon}
                    alt={social.name}
                    width={34}
                    height={34}
                    className="h-[34px] w-[34px] object-contain"
                  />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t-[5px] border-[#27B1B8] bg-[#f7f7f6]">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:px-8">
          <div className="overflow-hidden rounded-lg border border-black/8 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.06)]">
            <div className="border-b border-black/6 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#27B1B8]">
                Ubicacion
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#0C535B]">
                Ven a visitarnos
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#61707b]">
                Estamos en Bogota para atender requerimientos comerciales y soporte tecnico para flotas y talleres.
              </p>
            </div>

            <div className="aspect-[1.02/1] min-h-[340px]">
              <iframe
                title="Mapa Kliniu"
                src="https://www.google.com/maps?q=Cra.%2029%20%2310-25%2C%20Bogota%2C%20Colombia&z=16&output=embed"
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>

          <ContactForm />
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#27B1B8]">
              Nuestra esencia
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[#0C535B] sm:text-4xl">
              Lo que sostiene cada relacion con nuestros clientes
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {values.map((item) => (
              <article
                key={item.title}
                className="flex flex-col items-center rounded-lg border border-black/8 bg-[#fbfbfa] px-6 py-8 text-center shadow-[0_18px_38px_rgba(15,23,42,0.05)]"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-[0_10px_20px_rgba(15,23,42,0.06)]">
                  <Image
                    src={item.icon}
                    alt=""
                    width={46}
                    height={46}
                    className="h-[46px] w-[46px] object-contain"
                  />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-[#0C535B]">{item.title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#657480]">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
