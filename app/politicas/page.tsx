import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "../components/site-footer";

export const metadata: Metadata = {
  title: "Políticas y términos legales",
  description:
    "Términos y condiciones, privacidad, cookies, garantía, devoluciones, retracto, envíos, habeas data y PQRS de KLINIU S.A.S.",
};

const items = [
  {
    href: "/politicas/terminos-y-condiciones",
    title: "Términos y Condiciones",
    desc: "Condiciones de uso del sitio y de las compras realizadas en él.",
  },
  {
    href: "/politicas/privacidad",
    title: "Política de Privacidad",
    desc: "Cómo protegemos y usamos tu información personal.",
  },
  {
    href: "/politicas/cookies",
    title: "Política de Cookies",
    desc: "Qué cookies usamos, con qué fin y cómo gestionarlas.",
  },
  {
    href: "/politicas/garantia",
    title: "Garantía de Productos",
    desc: "Manual de garantía conforme a la Ley 1480 de 2011.",
  },
  {
    href: "/politicas/devoluciones",
    title: "Devoluciones",
    desc: "Requisitos y trámite para devolver un producto.",
  },
  {
    href: "/politicas/retracto-y-reversion",
    title: "Retracto y reversión del pago",
    desc: "Tus derechos en compras a distancia (Arts. 47 y 51).",
  },
  {
    href: "/politicas/envios",
    title: "Envíos y entregas",
    desc: "Cobertura, costos, tiempos y condiciones de entrega.",
  },
  {
    href: "/politicas/tratamiento-datos",
    title: "Tratamiento de datos personales",
    desc: "Finalidades del tratamiento y derechos del titular.",
  },
  {
    href: "/politicas/habeas-data",
    title: "Habeas Data",
    desc: "Cómo consultar, corregir o suprimir tus datos.",
  },
  {
    href: "/politicas/pqrs",
    title: "PQRS",
    desc: "Canales y tiempos de respuesta de atención al consumidor.",
  },
];

export default function PoliticasIndexPage() {
  return (
    <main className="min-h-screen bg-white text-[#111]">
      <section className="bg-[#061117] px-6 py-16 text-white">
        <div className="mx-auto max-w-[980px]">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#27B1B8]">
            Políticas Kliniu
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
            Políticas y términos legales
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/70">
            Documentos que rigen la relación comercial entre KLINIU S.A.S. y sus
            clientes, conforme a la normativa colombiana vigente.
          </p>
        </div>
      </section>

      <section className="px-6 py-14">
        <div className="mx-auto grid max-w-[980px] gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-2xl border border-black/8 bg-[#f8f8f7] p-6 transition-colors hover:border-[#27B1B8]/40 hover:bg-[#e8f5f5]"
            >
              <h2 className="text-base font-black text-[#0C535B]">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#5d6167]">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
