import Image from "next/image";

export default function AsesorBanner() {
  return (
    <>
      {/* Desktop — imagen original, contenedor 50% más alto para más presencia */}
      <a
        href="https://wa.me/573214198831"
        target="_blank"
        rel="noreferrer"
        className="relative hidden overflow-hidden rounded-2xl md:block md:aspect-[10000/1350]"
      >
        <Image
          src="/banners-web/BANNER-FINALES-20.png"
          alt="Asesoría Kliniu"
          fill
          unoptimized
          sizes="100vw"
          className="object-cover object-center"
        />
      </a>

      {/* Mobile */}
      <a
        href="https://wa.me/573214198831"
        target="_blank"
        rel="noreferrer"
        className="flex flex-col items-center gap-4 rounded-2xl bg-[#EAF7F7] px-6 py-8 md:hidden"
      >
        <div className="relative h-44 w-44 shrink-0">
          <Image
            src="/foca-celular-ayuda.png"
            alt="Foca con celular"
            fill
            unoptimized
            sizes="176px"
            className="object-contain"
          />
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold leading-tight text-[#0C535B]">
            ¿Necesitas ayuda<br />para elegir?
          </p>
          <p className="mt-2 text-sm text-[#3a4a4b]">
            Un asesor te guía sin costo y sin compromiso.
          </p>
          <span className="mt-4 inline-block rounded-full bg-[#27B1B8] px-6 py-2.5 text-sm font-semibold text-white">
            Hablar con un asesor
          </span>
        </div>
      </a>
    </>
  );
}
