"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type AsesorBannerData = {
  desktopImage: string | null;
  mobileImage: string | null;
  link: string | null;
};

const ASESORES = ["573112088806", "573226556454", "573105750449"];

export default function AsesorBanner({ banner }: { banner?: AsesorBannerData }) {
  const [phone, setPhone] = useState(ASESORES[0]);

  useEffect(() => {
    setPhone(ASESORES[Math.floor(Math.random() * ASESORES.length)]);
  }, []);

  const link = banner?.link ?? `https://wa.me/${phone}`;
  const desktopImage = banner?.desktopImage ?? "/banners-web/BANNER-FINALES-20.png";

  return (
    <section className="relative left-1/2 w-screen -translate-x-1/2 bg-[#f0f0ee]">

      {/* MÓVIL */}
      <div className="flex items-center md:hidden">
        <div className="relative mb-[-20px] h-[200px] w-[160px] shrink-0 self-center">
          <Image
            src="/foca-celular-ayuda.png"
            alt="Foca Kliniu"
            fill
            unoptimized
            sizes="160px"
            className="object-contain object-bottom"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-start justify-center px-4 py-8">
          <p className="text-[26px] font-extrabold leading-[1.0] text-[#0C535B]">
            ¿Necesitas ayuda<br />para elegir?
          </p>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0C535B] px-5 py-2.5 text-sm font-extrabold text-white transition-opacity hover:opacity-90"
          >
            <span>Hablar con un asesor</span>
            <Image src="/icono-whatsapp.png" alt="" width={16} height={16} className="h-4 w-4 brightness-0 invert" />
          </a>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="mx-auto hidden w-full max-w-[1440px] px-4 md:block md:px-2">
        <a href={link} target="_blank" rel="noreferrer" className="block w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={desktopImage}
            alt="¿Necesitas ayuda para elegir? Habla con un asesor"
            className="h-auto w-full"
            style={{ aspectRatio: "10000 / 1137", objectFit: "cover" }}
          />
        </a>
      </div>

    </section>
  );
}
