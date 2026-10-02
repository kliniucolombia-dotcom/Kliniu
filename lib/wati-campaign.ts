/** Primer mensaje típico de campaña B2B (ads / catálogo): pide cotización
 * institucional. Se detecta para responder directo en vez del saludo genérico. */
export function isInstitutionalQuoteRequest(message: string): boolean {
  const normalized = message
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const wantsQuote = /(cotiz|presupuest|precio)/.test(normalized);
  const product = /dispensador/.test(normalized);
  return wantsQuote && product;
}

export function institutionalQuoteReply(firstName?: string | null, formal = false) {
  // Guía de upselling v2, sección 3: sin ofertas ni promesas no verificadas; tipo y cantidad juntos.
  const hello = firstName ? `¡Claro, ${firstName}! 😊` : "¡Claro! 😊";
  if (formal) {
    return `${hello} Con gusto le cotizo. Fabricamos e importamos diferentes referencias de dispensadores.

¿Qué tipo necesita y cuántas unidades? Así le comparto las opciones y precios que aplican.`;
  }
  return `${hello} Con gusto te cotizo. Fabricamos e importamos diferentes referencias de dispensadores.

¿Qué tipo necesitas y cuántas unidades? Así te comparto las opciones y precios que aplican.`;
}
