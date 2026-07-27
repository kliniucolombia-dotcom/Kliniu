"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const EMAILS = ["ventas@kliniu.com", "david.avila@kliniu.com"];

export default function FooterEmail() {
  const [email, setEmail] = useState(EMAILS[0]);

  useEffect(() => {
    setEmail(EMAILS[Math.floor(Math.random() * EMAILS.length)]);
  }, []);

  return (
    <li>
      <a
        href={`mailto:${email}`}
        className="flex items-start gap-4 whitespace-pre-line text-[16px] leading-[1.12] text-white transition-colors hover:text-white/75 md:text-[18px]"
      >
        <Image
          src="/icono-correo.png"
          alt=""
          width={24}
          height={24}
          className="mt-[-2px] h-6 w-6 shrink-0 brightness-0 invert"
        />
        {email}
      </a>
    </li>
  );
}
