"use client";

import { FaWhatsapp } from "react-icons/fa";
import { fbContact } from "@/lib/fbpixel";
import { pickAdvisor } from "@/lib/advisors";

const TEXT = encodeURIComponent("Hola, tengo una consulta sobre un producto de Kliniu");

export default function WhatsAppFloat() {
  const handleClick = () => {
    fbContact();
    const { phone } = pickAdvisor();
    window.open(`https://wa.me/${phone}?text=${TEXT}`, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Contactar por WhatsApp"
      className="fixed left-6 bottom-20 sm:bottom-6 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
    >
      <FaWhatsapp className="h-8 w-8" />
    </button>
  );
}
