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

export function institutionalQuoteReply(firstName?: string | null) {
  const hello = firstName ? `👋 ¡Hola, ${firstName}!` : "👋 ¡Hola!";
  return `${hello} Gracias por escribir a Kliniu.

Fabricamos e importamos dispensadores institucionales y atendemos a empresas, hoteles, restaurantes, clínicas e instituciones, con precios especiales por volumen.

Para tu cotización cuéntame:
1. Qué productos necesitas (jabón, líquidos, toallas, papel higiénico, servilletas…)
2. Cantidad aproximada
3. Ciudad de entrega

Pago contra entrega y envío gratis en Bogotá D.C. Un asesor te acompaña en el proceso. ¿Empezamos?`;
}
