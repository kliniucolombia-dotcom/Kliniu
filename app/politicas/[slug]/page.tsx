import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "../../components/site-footer";

const policies = {
  privacidad: {
    title: "Política de Privacidad",
    summary:
      "En KLINIU SAS entendemos y valoramos la importancia de proteger su información personal. Estamos comprometidos con mantener la confidencialidad, seguridad y privacidad de los datos que nuestros usuarios, clientes y visitantes nos proporcionan.",
    sections: [
      {
        heading: "Uso de la Información",
        body: "La información personal que usted nos comparte será utilizada exclusivamente para fines de mercadeo y promociones de nuestros productos. KLINIU SAS se compromete a no vender, alquilar, compartir ni divulgar esta información a terceros bajo ninguna circunstancia, salvo que sea requerida por una autoridad judicial competente, en cumplimiento de la ley.",
      },
      {
        heading: "Derecho a la Eliminación de Datos",
        body: "En cualquier momento, usted puede solicitar la eliminación de sus datos de nuestras bases, escribiendo al correo info@kliniu.com e incluyendo su nombre completo y el motivo de su solicitud. Procesaremos su solicitud en el menor tiempo posible.",
      },
      {
        heading: "Protección Legal",
        body: "Según nuestros Términos Legales, su información será tratada bajo estrictas normas de confidencialidad y sólo será divulgada por mandato legal o requerimiento judicial.",
      },
      {
        heading: "Política de Garantías y Derecho de Retracto",
        body: "En KLINIU SAS, nuestro principal compromiso es su total satisfacción. Todos nuestros productos cuentan con garantía, cambio o devolución, siempre que se cumplan las condiciones establecidas.",
      },
      {
        heading: "Condiciones Generales",
        body: "El cambio o devolución podrá realizarse dentro de los primeros 30 días desde la compra. El producto debe encontrarse en perfecto estado, sin señales de mal uso, con su empaque original, manuales y accesorios completos. No aplica para productos manipulados, deteriorados, usados o sin embalaje original.",
      },
      {
        heading: "Trámites y Contacto",
        body: "Para gestionar cualquier tipo de garantía, cambio o devolución, comuníquese con nuestro Centro de Atención al Cliente:\n\nColombia: +57(1) 3682434 / +57 3226556454 — Av. 28 No. 34-43, Barrio La Soledad, Bogotá.\nHonduras: +504 31852275\nRepública Dominicana: +1 (809) 8507005\nNicaragua: +505 82508359\n\nCorreo: info@kliniu.com",
      },
      {
        heading: "1. Garantía por Defectos de Fabricación",
        body: "Aplica para productos con fallas o defectos no atribuibles al uso. Requiere presentación de factura original dentro de los 5 días hábiles desde la compra.",
      },
      {
        heading: "2. Cambio por el Mismo Producto",
        body: "Válido una sola vez por compra. El producto debe presentarse nuevo, con factura, y dentro del plazo estipulado.",
      },
      {
        heading: "3. Cambio por Otro Producto",
        body: "Puede cambiarse por un producto de igual o mayor valor, pagando la diferencia si aplica. No se aceptan cambios por productos usados o abiertos (especialmente productos de uso personal como cápsulas, cremas, geles, etc.).",
      },
      {
        heading: "4. Devolución de Dinero",
        body: "Se puede solicitar dentro de los 5 días hábiles por insatisfacción. El reembolso se realizará en la misma forma de pago original: tarjeta de crédito hasta 20 días hábiles; efectivo o cheque 10 días hábiles; consignación requiere carta con cuenta y banco receptor.",
      },
      {
        heading: "5. Mantenimiento y Repuestos",
        body: "Para mantenimientos fuera de garantía (por mal uso o desgaste), el costo será asumido por el cliente. Incluye 30 días de garantía sobre el mantenimiento realizado.",
      },
      {
        heading: "Política de Reversión – Pagos Wompi",
        body: "Usted reconoce que las ventas no presenciales pueden estar sujetas a reversión de pagos por parte del titular del medio de pago, conforme a la normativa local vigente. Este proceso será gestionado exclusivamente entre el titular, la entidad emisora y la entidad adquirente. En caso de reversión exitosa, KLINIU SAS podrá descontar el valor correspondiente o emitir una factura por el monto, compensándolo con futuros ingresos o generando intereses por mora si no se realiza el pago.",
      },
      {
        heading: "Acerca de Nosotros",
        body: "KLINIU SAS, con el respaldo de GC International, es una empresa colombiana con presencia en México, Nicaragua, Honduras, Guatemala y República Dominicana. Desde 1984 nos dedicamos al diseño, fabricación y comercialización de productos plásticos para el hogar e industria metalmecánica. Contamos con certificaciones ISO 9001 e ISO 14001, y nuestras materias primas están aprobadas por la FDA.",
      },
    ],
  },
  garantia: {
    title: "Garantía de Productos",
    summary:
      "Manual de Garantía de Productos KLINIU S.A.S. — vigente desde julio 2025. Expedido conforme a la Ley 1480 de 2011 (Estatuto del Consumidor) y demás normas concordantes.",
    sections: [
      {
        heading: "1. Marco Legal",
        body: "Este manual se expide conforme a la Ley 1480 de 2011 (Estatuto del Consumidor) y demás normas concordantes. Las garantías ofrecidas por KLINIU S.A.S. respetan los derechos mínimos del consumidor, incluyendo protección al consumidor, derecho a la información, garantía mínima legal y derecho de retracto cuando aplique. También son aplicables a relaciones B2B salvo disposiciones en contrario.",
      },
      {
        heading: "2. Productos Cubiertos",
        body: "Este manual aplica a todos los productos comercializados por KLINIU S.A.S., incluyendo: dispensadores de higiene (incluidos los que contienen componentes electrónicos) y productos plásticos para el hogar y la industria fabricados o importados.",
      },
      {
        heading: "3. Términos de la Garantía",
        body: "Duración: mínima de 3 meses, salvo indicación expresa de mayor plazo. Inicio: fecha de entrega según factura o guía de despacho. Cobertura: defectos de fabricación o materiales, fisuras estructurales no atribuibles al mal uso, fallos en ruedas, tapas, ensamblajes o componentes electrónicos bajo condiciones normales. Responsabilidad: en caso de validarse la garantía, se procederá a reparación, cambio del producto, emisión de nota crédito o cambio total, sin costo adicional.",
      },
      {
        heading: "4. Exclusiones de Garantía",
        body: "Esta garantía no cubre: daños por uso inadecuado, abuso o negligencia; golpes, caídas o arrastre en superficies irregulares; exposición a sustancias químicas corrosivas no compatibles; exposición a climas o ambientes fuertes que deterioren el producto; almacenamiento inadecuado o condiciones extremas (sol intenso, fuego directo, etc.); intervenciones o modificaciones no autorizadas; instalación incorrecta o no realizada por personal calificado.",
      },
      {
        heading: "5. Procedimiento para Hacer Efectiva la Garantía",
        body: "1. Notificar el defecto por correo a ventas@kliniu.com dentro del período de garantía.\n2. Adjuntar: evidencia del daño (fotos/videos), copia de la factura y breve descripción del caso.\n3. Evaluación en máximo 10 días hábiles.\n4. En caso de aprobación, se notificará si el producto será reparado, sustituido o cubierto con nota crédito.\n\nLas reclamaciones deberán hacerse únicamente a través de los canales indicados.",
      },
      {
        heading: "6. Derecho de Retracto (Art. 47 Ley 1480 de 2011)",
        body: "Aplica solo para ventas no presenciales (internet, teléfono, catálogo). Término: 5 días hábiles siguientes a la entrega. Condiciones: producto nuevo, sin uso, con todos sus empaques, etiquetas y accesorios originales. El costo de transporte por devolución será asumido por el consumidor. No aplica para productos personalizados, sanitarios o fabricados a medida. Una vez recibido y verificado el producto, se realizará el reembolso dentro de los 30 días calendario.",
      },
      {
        heading: "7. Canales de Atención",
        body: "Correo: ventas@kliniu.com\nTeléfono: 601 3682434 / 312 5860921\nHorario: lunes a viernes, 8:00 a.m. – 5:00 p.m.",
      },
      {
        heading: "8. Tabla de Garantías por Producto",
        body: "Dispensadores plásticos: 6 meses — uso institucional con instalación adecuada.\nDispensadores con sensor o electrónicos: 3 meses — evitar humedad excesiva y uso continuo severo. Uso en interiores o pavimento uniforme.",
      },
      {
        heading: "9. Consideraciones Finales",
        body: "Este manual hace parte integral de la relación comercial entre KLINIU S.A.S. y sus compradores. Las condiciones pueden ser actualizadas; prevalecerá la versión vigente al momento de la compra. En caso de controversias, las partes podrán acudir a la Superintendencia de Industria y Comercio (SIC). KLINIU S.A.S. garantiza procesos transparentes, confiables y sin letra pequeña. Consulte nuestros planes de instalación o mantenimiento preventivo.",
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
