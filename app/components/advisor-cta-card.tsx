"use client";

import Image from "next/image";
import WhatsAppAsesor from "./whatsapp-asesor";

type AdvisorCtaCardProps = {
  className?: string;
  imagePriority?: boolean;
};

export default function AdvisorCtaCard({
  className = "",
  imagePriority = false,
}: AdvisorCtaCardProps) {
  return (
    <WhatsAppAsesor
      randomAsesor
      className={`group relative block overflow-hidden rounded-[14px] border border-transparent bg-transparent text-[#111827] transition-opacity hover:opacity-95 ${className}`}
    >
      <div className="absolute inset-0 flex flex-col items-center justify-between rounded-[14px] bg-[#a9dcd5] px-5 py-5 text-center lg:inset-y-0 lg:left-1/2 lg:w-[160px] lg:-translate-x-1/2 lg:px-4 lg:py-3 xl:w-[150px]">
        <p className="max-w-[13rem] text-[18px] font-black leading-[0.98] tracking-normal xl:max-w-[8rem] xl:text-[14px]">
          ¿No sabes cuál necesitas?
        </p>

        <div className="relative my-1 h-[82px] w-[112px] shrink-0 xl:h-[92px] xl:w-[126px]">
          <Image
            src="/foca-pensativa.png"
            alt=""
            fill
            priority={imagePriority}
            sizes="140px"
            className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </div>

        <p className="max-w-[13rem] text-[14px] font-semibold leading-[1.05] xl:max-w-[8rem] xl:text-[10px]">
          Te ayudamos a elegir
          <br />
          la mejor solución
          <br />
          para tu espacio.
        </p>

        <span className="mt-1 inline-flex h-9 w-full max-w-[170px] items-center justify-center gap-1.5 rounded-[4px] bg-[#075762] px-3 text-[13px] font-extrabold leading-none text-white shadow-[0_8px_14px_rgba(7,87,98,0.12)] xl:h-7 xl:max-w-[128px] xl:text-[10px]">
          Te asesoramos
          <Image
            src="/icono-whatsapp.png"
            alt=""
            width={14}
            height={14}
            className="h-3.5 w-3.5 brightness-0 invert xl:h-3 xl:w-3"
          />
        </span>
      </div>
    </WhatsAppAsesor>
  );
}
