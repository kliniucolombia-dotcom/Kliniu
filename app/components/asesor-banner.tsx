import Image from "next/image";

export default function AsesorBanner() {
  return (
    <a
      href="https://wa.me/573214198831"
      target="_blank"
      rel="noreferrer"
      className="relative block aspect-[4500/1137] overflow-hidden rounded-2xl md:aspect-[10000/1137]"
    >
      <Image
        src="/banners-web/BANNER-FINALES-20.png"
        alt="Asesoría Kliniu"
        fill
        unoptimized
        sizes="100vw"
        className="hidden object-cover object-center md:block"
      />
      <Image
        src="/banners-responsive/BANNER-FINALES-41.png"
        alt="Asesoría Kliniu"
        fill
        unoptimized
        sizes="100vw"
        className="object-cover object-center md:hidden"
      />
    </a>
  );
}
