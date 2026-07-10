import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteFooter from "@/app/components/site-footer";

export const metadata: Metadata = {
  title: "Servicio de reparación",
  description: "Soporte, agenda y aliados del servicio de reparación de Kliniu.",
};

export default function ServicioDeReparacionPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f6] text-[#0C535B]">
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/servicio-reparacion/banner.gif"
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-[78%_center] lg:object-right"
          />
        </div>

        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.995)_0%,rgba(255,255,255,0.99)_36%,rgba(255,255,255,0.94)_50%,rgba(255,255,255,0.72)_60%,rgba(255,255,255,0.26)_74%,rgba(255,255,255,0.03)_88%,rgba(255,255,255,0)_100%)]" />

        <div className="relative mx-auto max-w-[1440px] px-5 pb-12 pt-12 sm:px-6 sm:pb-14 sm:pt-14 lg:px-8 lg:pb-14 lg:pt-16">
          <div className="mx-auto max-w-[430px] text-left lg:ml-[8%] lg:max-w-[620px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#27B1B8] sm:text-xs">
              Soporte especializado
            </p>
            <h1 className="mt-3 text-[3.2rem] font-semibold leading-[0.96] tracking-[-0.06em] text-[#27B1B8] sm:mt-4 sm:text-5xl lg:max-w-[12ch] lg:text-[4rem] lg:leading-[0.94]">
              Servicio de reparacion
            </h1>

            <div className="mt-3 min-h-[320px] sm:mt-5 lg:min-h-[470px] lg:pt-8">
              <h2 className="max-w-[9ch] text-[3.05rem] font-semibold leading-[0.96] tracking-[-0.06em] text-[#2E4E49] sm:text-5xl sm:leading-[1.02] lg:max-w-[11ch] lg:text-[3.55rem]">
                Aqui estamos para atender tu necesidad
              </h2>
              <p className="mt-5 max-w-[30rem] text-[1.02rem] leading-8 text-[#596873] sm:text-base sm:leading-7">
                Completa el formulario y uno de nuestros asesores se pondra en contacto contigo en breve. Estamos para ayudarte con mejor atencion y cuidado.
              </p>
              <div className="mt-8">
                <Link
                  href="/contacto"
                  className="inline-flex h-14 items-center justify-center rounded-full bg-[#27B1B8] px-8 text-base font-semibold text-white transition-colors duration-200 hover:bg-[#1E969B] sm:text-lg"
                >
                  Agenda tu cita
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-black/6 bg-white">
        <div className="mx-auto max-w-[1440px] px-5 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#2E4E49] sm:text-4xl">
              Nuestros aliados
            </h2>
          </div>

          <div className="mt-10">
            <Image
              src="/servicio-reparacion/logos.png"
              alt="Marcas aliadas de Kliniu"
              width={4868}
              height={648}
              className="h-auto w-full object-contain"
              priority
            />
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
