export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kliniucolombia.com";

/** Único WhatsApp/teléfono comercial público. Todo botón genérico del sitio sale de aquí. */
export const MAIN_WHATSAPP = "573105750449";
export const MAIN_WHATSAPP_TEXT = "Hola, quiero cotizar dispensadores";
export const MAIN_PHONE_HREF = `tel:+${MAIN_WHATSAPP}`;

export function whatsappUrl(text: string = MAIN_WHATSAPP_TEXT, phone: string = MAIN_WHATSAPP) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
