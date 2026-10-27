export const WHATSAPP_COUNTRIES = [
  { code: "HN", label: "Honduras", dial: "504" },
  { code: "GT", label: "Guatemala", dial: "502" },
  { code: "NI", label: "Nicaragua", dial: "505" },
] as const;

export type WhatsappCountry = (typeof WHATSAPP_COUNTRIES)[number]["code"];
// Solo el número local (8 dígitos), sin indicativo. Vacío = país sin WhatsApp.
export type CountryWhatsapp = Record<WhatsappCountry, string>;
