const KLINIU_WHATSAPP_NUMBER = "573057249454";

export function buildWhatsAppProductUrl(input: {
  nombre: string;
  sku?: string;
  oemReferencia?: string;
  precio?: string;
  url?: string;
}) {
  const message = [
    `Hola Kliniu, quiero cotizar este repuesto: ${input.nombre}.`,
    input.sku ? `SKU: ${input.sku}.` : null,
    input.oemReferencia ? `OEM/Referencia: ${input.oemReferencia}.` : null,
    input.precio ? `Precio publicado: ${input.precio}.` : null,
    input.url ? `Producto: ${input.url}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return `https://wa.me/${KLINIU_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
