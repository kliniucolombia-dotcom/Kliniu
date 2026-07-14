"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const ASESORES = ["573112088806", "573226556454", "573105750449"];
const FALLBACK = "573112088806";

function formatPhone(phone: string) {
  const country = phone.slice(0, 2);
  const rest = phone.slice(2);
  return `+${country} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`;
}

export default function FooterWhatsapp() {
  const [phone, setPhone] = useState(FALLBACK);

  useEffect(() => {
    setPhone(ASESORES[Math.floor(Math.random() * ASESORES.length)]);
  }, []);

  return (
    <li>
      <a
        href={`https://wa.me/${phone}`}
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
        {formatPhone(phone)}
      </a>
    </li>
  );
}
