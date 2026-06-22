import Image from "next/image";

const advisorFeatures = [
  {
    title: "Asesoría gratuita",
    text: "sin compromiso.",
    icon: (
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M10 28v-5a14 14 0 0 1 28 0v5" strokeLinecap="round" />
        <path d="M10 27h5v10h-5a4 4 0 0 1-4-4v-2a4 4 0 0 1 4-4Z" />
        <path d="M38 27h-5v10h5a4 4 0 0 0 4-4v-2a4 4 0 0 0-4-4Z" />
        <path d="M30 39h-4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Respuesta rápida",
    text: "por WhatsApp",
    icon: (
      <Image
        src="/icono-whatsapp.png"
        alt=""
        width={34}
        height={34}
        className="h-8 w-8 brightness-0"
        style={{ filter: "brightness(0) saturate(100%) invert(23%) sepia(46%) saturate(1140%) hue-rotate(143deg) brightness(89%) contrast(94%)" }}
      />
    ),
  },
  {
    title: "Cotizaciones",
    text: "personalizadas",
    icon: (
      <svg viewBox="0 0 48 48" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M15 10h18l5 5v24a3 3 0 0 1-3 3H15a3 3 0 0 1-3-3V13a3 3 0 0 1 3-3Z" />
        <path d="M32 10v7h7" />
        <path d="M18 22h12M18 29h9M18 36h8" strokeLinecap="round" />
        <circle cx="35" cy="34" r="7" />
        <path d="M32 34h6M35 31v6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function AsesorBanner() {
  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 bg-[#f3f3f3] px-5 pb-6 pt-8 md:px-0 md:py-0">
      <div className="mx-auto grid w-full max-w-[1296px] items-center gap-5 px-4 md:min-h-[136px] md:grid-cols-[230px_minmax(260px,1fr)_minmax(430px,1.35fr)_220px] md:gap-7 md:px-8">
        <div className="relative mx-auto -mb-5 -mt-10 h-[190px] w-[170px] self-end md:-mb-6 md:-mt-8 md:h-[180px] md:w-[190px]">
          <Image
            src="/foca-celular-ayuda.png"
            alt="Foca Kliniu"
            fill
            unoptimized
            sizes="180px"
            className="object-contain"
          />
        </div>

        <div className="text-center md:text-left">
          <p className="text-2xl font-black leading-none text-[#0C535B] md:text-[24px]">
            ¿Necesitas ayuda para elegir?
          </p>
          <p className="mt-3 hidden text-[15px] font-semibold leading-[1.05] text-[#0C535B] md:block md:max-w-[360px] md:text-[17px]">
            Nuestro equipo de expertos está listo para asesorarte sin compromiso
          </p>
        </div>

        <div className="hidden gap-4 text-[#0C535B] md:grid md:grid-cols-3 md:gap-5">
          {advisorFeatures.map((feature) => (
            <div key={feature.title} className="flex items-center gap-3 md:justify-center">
              <span className="shrink-0">{feature.icon}</span>
              <p className="text-[13px] font-semibold leading-[1.15] text-[#666]">
                {feature.title}
                <br />
                {feature.text}
              </p>
            </div>
          ))}
        </div>

        <a
          href="https://wa.me/573214198831"
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-h-8 items-center justify-center gap-2 rounded-lg bg-[#0C535B] px-7 text-sm font-extrabold text-white transition-opacity hover:opacity-90 md:min-h-[28px] md:px-8 md:text-[13px]"
        >
          <span>Hablar con un asesor</span>
          <Image
            src="/icono-whatsapp.png"
            alt=""
            width={15}
            height={15}
            className="h-4 w-4 brightness-0 invert"
          />
        </a>
      </div>
    </section>
  );
}
