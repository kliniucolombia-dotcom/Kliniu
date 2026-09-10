export const LATAM_CURRENCIES = [
  { code: "COP", locale: "es-CO", label: "COP · Colombia" },
  { code: "USD", locale: "en-US", label: "USD · Dólar" },
  { code: "MXN", locale: "es-MX", label: "MXN · México" },
  { code: "PEN", locale: "es-PE", label: "PEN · Perú" },
  { code: "CLP", locale: "es-CL", label: "CLP · Chile" },
  { code: "ARS", locale: "es-AR", label: "ARS · Argentina" },
  { code: "BRL", locale: "pt-BR", label: "BRL · Brasil" },
  { code: "UYU", locale: "es-UY", label: "UYU · Uruguay" },
  { code: "PYG", locale: "es-PY", label: "PYG · Paraguay" },
  { code: "BOB", locale: "es-BO", label: "BOB · Bolivia" },
  { code: "GTQ", locale: "es-GT", label: "GTQ · Guatemala" },
  { code: "HNL", locale: "es-HN", label: "HNL · Honduras" },
  { code: "NIO", locale: "es-NI", label: "NIO · Nicaragua" },
  { code: "CRC", locale: "es-CR", label: "CRC · Costa Rica" },
  { code: "PAB", locale: "es-PA", label: "PAB · Panamá" },
  { code: "DOP", locale: "es-DO", label: "DOP · Rep. Dominicana" },
] as const;

export type LatamCurrencyCode = (typeof LATAM_CURRENCIES)[number]["code"];
