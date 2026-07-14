"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  message?: string;
  randomAsesor?: boolean;
  /** Link de panel/admin (ej. banner.link); si viene distinto del wa.me por defecto, gana sobre el random */
  overrideLink?: string | null;
};

const FALLBACK = "573125860921";
const ASESORES = ["573112088806", "573226556454", "573105750449"];

export default function WhatsAppAsesor({ children, className, message, randomAsesor, overrideLink }: Props) {
  const [href, setHref] = useState(`https://wa.me/${FALLBACK}`);
  const hasCustomLink = Boolean(overrideLink) && overrideLink !== `https://wa.me/${FALLBACK}`;

  useEffect(() => {
    if (randomAsesor || hasCustomLink) return;
    fetch("/api/seller/contact")
      .then((r) => r.json())
      .then((d: { phone: string; name: string }) => {
        const text = message ?? `Hola ${d.name}, tengo una consulta sobre un producto de Kliniu`;
        setHref(`https://wa.me/${d.phone}?text=${encodeURIComponent(text)}`);
      })
      .catch(() => {});
  }, [message, randomAsesor, hasCustomLink]);

  const handleClick = (e: React.MouseEvent) => {
    if (hasCustomLink || !randomAsesor) return;
    e.preventDefault();
    const phone = ASESORES[Math.floor(Math.random() * ASESORES.length)];
    const text = message ?? "Hola, tengo una consulta sobre un producto de Kliniu";
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const finalHref = hasCustomLink ? overrideLink! : randomAsesor ? "#" : href;

  return (
    <a href={finalHref} onClick={handleClick} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
