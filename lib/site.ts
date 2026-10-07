export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://kliniucolombia.com";

// Base para enlaces que viajan por correo (reset, verificación). En producción sale
// de la configuración y no del Host de la petición, que un atacante puede falsear
// para que el enlace con el token apunte a su dominio.
export function emailLinkOrigin(request: Request): string {
  return process.env.NODE_ENV === "production" ? new URL(SITE_URL).origin : new URL(request.url).origin;
}

/** Único WhatsApp/teléfono comercial público. Todo botón genérico del sitio sale de aquí. */
export const MAIN_WHATSAPP = "573105750449";
export const MAIN_WHATSAPP_TEXT = "Hola, quiero cotizar dispensadores";
export const MAIN_PHONE_HREF = `tel:+${MAIN_WHATSAPP}`;

export function whatsappUrl(text: string = MAIN_WHATSAPP_TEXT, phone: string = MAIN_WHATSAPP) {
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}
