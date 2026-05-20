"use client";

import { useEffect, useState } from "react";

type Props = {
  children: React.ReactNode;
  className?: string;
  message?: string;
};

const FALLBACK = "573125860921";

export default function WhatsAppAsesor({ children, className, message }: Props) {
  const [href, setHref] = useState(`https://wa.me/${FALLBACK}`);

  useEffect(() => {
    fetch("/api/seller/contact")
      .then((r) => r.json())
      .then((d: { phone: string; name: string }) => {
        const text = message ?? `Hola ${d.name}, tengo una consulta sobre un producto de Kliniu`;
        setHref(`https://wa.me/${d.phone}?text=${encodeURIComponent(text)}`);
      })
      .catch(() => {});
  }, [message]);

  return (
    <a href={href} target="_blank" rel="noreferrer" className={className}>
      {children}
    </a>
  );
}
