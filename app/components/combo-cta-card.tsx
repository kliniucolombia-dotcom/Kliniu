"use client";

import Image from "next/image";
import { MdAutoAwesome, MdArrowForward } from "react-icons/md";
import WhatsAppAsesor from "./whatsapp-asesor";

export default function ComboCtaCard({ className = "" }: { className?: string }) {
  return (
    <div className={`interactive-lift relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[#b9e5dc] p-5 text-left text-[#0C535B] ${className}`}>
      <div className="relative z-10">
        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/70 text-[#0A5560]">
          <MdAutoAwesome className="h-5 w-5" />
        </span>
        <p className="text-[17px] font-extrabold leading-tight text-[#0A5560]">¿Necesitas algo personalizado?</p>
        <p className="mt-2 text-[13px] font-semibold leading-[1.25] text-[#0A5560]">
          Nuestro equipo te ayuda a crear el combo ideal para tu espacio.
        </p>
      </div>
      <div className="relative z-0 -mx-5 my-3 flex min-h-0 flex-1 items-center">
        <Image
          src="/foca-arma-tu-combo.png"
          alt="Foca Kliniu con productos para armar combo"
          width={260}
          height={174}
          className="image-lift h-full max-h-[200px] w-full object-contain"
        />
      </div>
      <WhatsAppAsesor
        randomAsesor
        message="Hola, quiero armar un combo a la medida de mis espacios"
        className="shine-sweep relative z-10 flex items-center justify-center gap-2 rounded-full bg-[#0C535B] px-5 py-2.5 text-[13px] font-extrabold leading-none text-white transition-opacity hover:opacity-90"
      >
        Cotizar ahora
        <MdArrowForward className="h-4 w-4" />
      </WhatsAppAsesor>
    </div>
  );
}
