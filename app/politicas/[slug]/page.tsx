import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";

const policies = {
  privacidad: {
    title: "Políticas de privacidad",
    summary:
      "Conoce cómo Kliniu protege la información que compartes al navegar, cotizar o comprar en nuestros canales digitales.",
    sections: [
      {
        heading: "Información que recopilamos",
        body: "Podemos solicitar datos de contacto, información de entrega, datos de facturación y detalles necesarios para atender solicitudes comerciales, compras, garantías o soporte.",
      },
      {
        heading: "Uso de la información",
        body: "Usamos tus datos para gestionar pedidos, responder cotizaciones, prestar soporte, mejorar la experiencia de compra y enviarte comunicaciones relacionadas con productos o servicios de Kliniu.",
      },
      {
        heading: "Protección y confidencialidad",
        body: "Tratamos la información con medidas razonables de seguridad y acceso restringido. No vendemos tus datos personales a terceros.",
      },
    ],
  },
  garantia: {
    title: "Garantía de Productos",
    summary:
      "Nuestros productos cuentan con respaldo comercial y acompañamiento para revisar novedades de fabricación o funcionamiento.",
    sections: [
      {
        heading: "Cobertura",
        body: "La garantía aplica sobre fallas atribuibles a defectos de fabricación, de acuerdo con el tipo de producto, condiciones de uso y diagnóstico del equipo comercial o técnico.",
      },
      {
        heading: "Condiciones",
        body: "Para gestionar una garantía se debe presentar soporte de compra, evidencia del producto y una descripción clara de la novedad. Daños por mal uso, golpes, instalaciones incorrectas o manipulación no autorizada pueden quedar por fuera de cobertura.",
      },
      {
        heading: "Proceso",
        body: "Nuestro equipo revisará el caso y te indicará si corresponde reparación, cambio, reposición de parte o recomendación de mantenimiento.",
      },
    ],
  },
  devoluciones: {
    title: "Devoluciones",
    summary:
      "Si necesitas revisar una devolución, nuestro equipo comercial te acompaña para validar el caso y darte una respuesta clara.",
    sections: [
      {
        heading: "Solicitud",
        body: "Comunícate con Kliniu indicando número de pedido, producto, motivo de devolución y evidencia fotográfica si aplica.",
      },
      {
        heading: "Estado del producto",
        body: "El producto debe conservar sus partes, accesorios y empaque cuando sea posible. Productos usados, instalados o deteriorados serán revisados antes de aprobar una devolución.",
      },
      {
        heading: "Tiempos y respuesta",
        body: "Una vez recibida la solicitud, el equipo comercial validará la información y te indicará los pasos para cambio, nota crédito o solución aplicable.",
      },
    ],
  },
  "tratamiento-datos": {
    title: "Tratamiento de datos personales",
    summary:
      "Kliniu trata los datos personales de clientes, prospectos y aliados conforme a finalidades comerciales, operativas y de servicio.",
    sections: [
      {
        heading: "Finalidades",
        body: "Los datos pueden ser usados para contacto comercial, gestión de compras, entregas, soporte, garantías, campañas informativas y cumplimiento de obligaciones legales.",
      },
      {
        heading: "Derechos del titular",
        body: "Puedes solicitar consulta, actualización, corrección o eliminación de tus datos cuando corresponda, escribiendo a nuestro canal de atención.",
      },
      {
        heading: "Canal de atención",
        body: "Para solicitudes relacionadas con datos personales, escribe a ventas@kliniu.com o comunícate con el departamento comercial.",
      },
    ],
  },
} as const;

type PolicySlug = keyof typeof policies;

export function generateStaticParams() {
  return Object.keys(policies).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const policy = policies[slug as PolicySlug];
  if (!policy) return {};

  return {
    title: `${policy.title} | Kliniu`,
    description: policy.summary,
  };
}

export default async function PoliticaPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const policy = policies[slug as PolicySlug];
  if (!policy) notFound();

  return (
    <main className="min-h-screen bg-white text-[#111]">
      <section className="bg-[#061117] px-6 py-16 text-white">
        <div className="mx-auto max-w-[980px]">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#27B1B8]">
            Políticas Kliniu
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            {policy.title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
            {policy.summary}
          </p>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto grid max-w-[980px] gap-5">
          {policy.sections.map((section) => (
            <article
              key={section.heading}
              className="rounded-2xl border border-black/8 bg-[#f8f8f7] p-6"
            >
              <h2 className="text-lg font-black text-[#0C535B]">{section.heading}</h2>
              <p className="mt-3 text-sm leading-7 text-[#5d6167]">{section.body}</p>
            </article>
          ))}

          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-[#27B1B8]/20 bg-[#e8f5f5] p-6">
            <div className="min-w-0 flex-1">
              <p className="font-black text-[#0C535B]">¿Necesitas ayuda con esta política?</p>
              <p className="mt-1 text-sm text-[#3a7a80]">
                Nuestro equipo comercial puede revisar tu caso y orientarte.
              </p>
            </div>
            <Link
              href="/contacto"
              className="rounded-full bg-[#0C535B] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              Contactar a Kliniu
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
