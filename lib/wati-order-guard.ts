/** Guardas puras del cierre de pedido por WhatsApp (sin DB ni OpenAI, testeables). */

export const ORDER_SUMMARY_TITLE = "Resumen de tu pedido";

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const money = (value: number) => `$${value.toLocaleString("es-CO")}`;

export type OrderPreview = {
  lines: { name: string; unitPrice: number; quantity: number }[];
  subtotal: number;
  shippingCost: number;
};

export function buildOrderSummary(
  preview: OrderPreview,
  data: { customerName: string; addressLine1: string; addressLine2?: string | null; city: string },
) {
  const first = data.customerName.trim().split(/\s+/)[0];
  const lines = preview.lines
    .map((l) => `• ${l.quantity} × ${l.name}: ${money(l.unitPrice)} c/u`)
    .join("\n");
  const shipping = preview.shippingCost === 0 ? "envío gratis" : `envío ${money(preview.shippingCost)}`;
  const address = [data.addressLine1, data.addressLine2, data.city].filter(Boolean).join(", ");
  return `${ORDER_SUMMARY_TITLE}, ${first}:\n${lines}\nSubtotal ${money(preview.subtotal)} · ${shipping} · Total ${money(preview.subtotal + preview.shippingCost)}.\nEntrega: ${address}.\n\n¿Lo registro así? Responde "sí" para confirmarlo o dime qué cambiar.`;
}

/** El último mensaje del bot ya trajo este mismo resumen (productos y dirección) y el cliente lo vio. */
export function summaryAlreadyShown(
  lastAssistant: string,
  preview: OrderPreview,
  data: { addressLine1: string; city: string },
) {
  const text = normalize(lastAssistant);
  return (
    text.includes(normalize(ORDER_SUMMARY_TITLE)) &&
    preview.lines.every((l) => text.includes(normalize(l.name))) &&
    text.includes(normalize(data.addressLine1)) &&
    text.includes(normalize(data.city))
  );
}

const DISPUTE =
  /\b(pero dice|porque dices|por que dices|por que me cobras|porque me cobras|no es (ese|el|la|lo)\b|no era (ese|el|la|lo)\b|no pedi|no corresponde|no coincide|esta mal|otro precio|precio (diferente|distinto)|se equivoc|equivocad)/;

/** Reclamo por precio o producto equivocado cuando ya hay pedido o un total cotizado. */
export function isOrderDispute(userMessage: string, hasOrderOrTotal: boolean) {
  return hasOrderOrTotal && DISPUTE.test(normalize(userMessage));
}
