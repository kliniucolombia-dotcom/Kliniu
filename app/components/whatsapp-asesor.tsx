"use client";

import { fbContact } from "@/lib/fbpixel";
import { whatsappUrl } from "@/lib/site";

type Props = {
  children: React.ReactNode;
  className?: string;
  message?: string;
  /** Link de panel/admin (ej. banner.link); si viene distinto del wa.me por defecto viejo, gana */
  overrideLink?: string | null;
  /** WhatsApp del vendedor asignado (ej. combo con "Vendedor" en panel); gana sobre el número único */
  phone?: string | null;
};

// Valor por defecto que quedó guardado en banners antiguos; no cuenta como link personalizado.
const LEGACY_DEFAULT_LINK = "https://wa.me/573125860921";

export default function WhatsAppAsesor({ children, className, message, overrideLink, phone }: Props) {
  const href =
    overrideLink && overrideLink !== LEGACY_DEFAULT_LINK
      ? overrideLink
      : whatsappUrl(message, phone || undefined);

  return (
    <a
      href={href}
      onClick={() => fbContact()}
      target="_blank"
      rel="noreferrer"
      className={`btn-whatsapp ${className ?? ""}`}
    >
      {children}
    </a>
  );
}
