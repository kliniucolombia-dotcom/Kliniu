"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ADVISORS, formatAdvisorPhone, type Advisor } from "@/lib/advisors";

/**
 * Muestra el WhatsApp y el correo del mismo asesor elegido al azar, para que
 * ambos datos siempre correspondan a la misma persona.
 */
export default function FooterContact() {
  const [advisor, setAdvisor] = useState<Advisor>(ADVISORS[0]);

  useEffect(() => {
    setAdvisor(ADVISORS[Math.floor(Math.random() * ADVISORS.length)]);
  }, []);

  return (
    <>
      <li>
        <a
          href={`https://wa.me/${advisor.phone}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-start gap-4 whitespace-pre-line text-[16px] leading-[1.12] text-white transition-colors hover:text-white/75 md:text-[18px]"
        >
          <Image
            src="/icono-whatsapp.png"
            alt=""
            width={24}
            height={24}
            className="mt-[-2px] h-6 w-6 shrink-0 brightness-0 invert"
          />
          {formatAdvisorPhone(advisor.phone)}
        </a>
      </li>
      <li>
        <a
          href={`mailto:${advisor.email}`}
          className="flex items-start gap-4 whitespace-pre-line text-[16px] leading-[1.12] text-white transition-colors hover:text-white/75 md:text-[18px]"
        >
          <Image
            src="/icono-correo.png"
            alt=""
            width={24}
            height={24}
            className="mt-[-2px] h-6 w-6 shrink-0 brightness-0 invert"
          />
          {advisor.email}
        </a>
      </li>
    </>
  );
}
