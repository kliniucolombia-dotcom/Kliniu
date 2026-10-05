"use client";

import Image from "next/image";
import { MAIN_ADVISOR, formatAdvisorPhone } from "@/lib/advisors";
import { MAIN_WHATSAPP, whatsappUrl } from "@/lib/site";

/** WhatsApp único del sitio y el correo del asesor que lo atiende. */
export default function FooterContact() {
  return (
    <>
      <li>
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noreferrer"
          className="btn-whatsapp flex items-start gap-4 whitespace-pre-line text-[16px] leading-[1.12] text-white transition-colors hover:text-white/75 md:text-[18px]"
        >
          <Image
            src="/icono-whatsapp.png"
            alt=""
            width={24}
            height={24}
            className="mt-[-2px] h-6 w-6 shrink-0 brightness-0 invert"
          />
          {formatAdvisorPhone(MAIN_WHATSAPP)}
        </a>
      </li>
      <li>
        <a
          href={`mailto:${MAIN_ADVISOR.email}`}
          className="flex items-start gap-4 whitespace-pre-line text-[16px] leading-[1.12] text-white transition-colors hover:text-white/75 md:text-[18px]"
        >
          <Image
            src="/icono-correo.png"
            alt=""
            width={24}
            height={24}
            className="mt-[-2px] h-6 w-6 shrink-0 brightness-0 invert"
          />
          {MAIN_ADVISOR.email}
        </a>
      </li>
    </>
  );
}
