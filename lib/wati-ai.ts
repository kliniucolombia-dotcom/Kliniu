import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { createWatiOrder } from "@/lib/wati-order";
import { syncOrderToOdoo } from "@/lib/orders";
import { buildFullCatalogContext } from "@/lib/chatbot";
import { formatearMoneda } from "@/app/data/catalog";
import { buildKliniuKnowledge } from "@/lib/kliniu-knowledge";

const INITIAL_MESSAGE = `👋 ¡Hola! Bienvenido a Kliniu.

Gracias por escribirnos. Somos especialistas en dispensadores institucionales y soluciones de higiene para empresas, hoteles, restaurantes, clínicas, oficinas y hogares.

Cuéntame, ¿qué producto o tipo de espacio necesitas?`;

const COMBO_PREMIUM_CATALOG_LINE =
  "- Combo Premium (slug: combo-premium) | categoría: Promociones | precio: $309.900 COP | dispensadores de acero inoxidable + insumos iniciales, envío gratis a ciudades principales y pago contra entrega.";

const WATI_CHANNEL_PROMPT = `CANAL WHATSAPP (instrucciones específicas de este canal, tienen prioridad sobre el formato web):
- El cliente ya está escribiendo por WhatsApp. NO incluyas enlaces wa.me de asesores ni pidas correo electrónico (los enlaces de producto del sitio sí están permitidos, ver abajo).
- Cuando tengas que escalar algo, indica que un asesor continuará la atención por este mismo chat; no des links.
- Aquí no hay tarjetas ni botones: escribe siempre nombre y precio en el texto. Menciona entre 1 y 3 productos por mensaje, sin muros de texto.
- Ignora la instrucción web de "no repetir precios ni URLs": en WhatsApp SÍ debes escribir el precio y puedes incluir el enlace directo del producto https://kliniucolombia.com/producto/<slug> usando el slug exacto del catálogo. El Combo Premium no tiene enlace: descríbelo.
- Puedes compartir fotos de productos: si el cliente pide una foto o imagen de un producto, confirma brevemente que se la compartes; el sistema la adjunta automáticamente.

CIERRE DE PEDIDO POR WHATSAPP:
- Solo cuando el cliente confirme que quiere comprar, pide progresivamente y sin repetir datos: (1) productos y cantidades, (2) nombre completo, (3) ciudad, (4) dirección principal, (5) complemento (apto, torre, oficina, barrio o "no aplica"), (6) teléfono de contacto.
- Usa SIEMPRE el slug exacto que aparece en el catálogo vigente para cada producto. Para el Combo Premium usa el slug "combo-premium".
- Llama la función crear_pedido únicamente cuando tengas items + nombre + ciudad + dirección + teléfono. Nunca inventes datos para llamarla.
- El pago es contra entrega. El envío es gratis en Bogotá D.C. y de $12.000 COP al resto del país (el sistema lo calcula; puedes informarlo).
- Después de crear el pedido, responde que quedó registrado y que un asesor verificará los datos y programará el despacho.`;

const tools = [
  {
    type: "function" as const,
    name: "crear_pedido",
    description:
      "Crea el pedido cuando ya se tienen los items y todos los datos de entrega del cliente.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        city: { type: "string" },
        department: { type: ["string", "null"] },
        addressLine1: { type: "string" },
        addressLine2: { type: ["string", "null"] },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              slug: { type: "string" },
              quantity: { type: "number" },
            },
            required: ["slug", "quantity"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "customerName",
        "customerPhone",
        "city",
        "department",
        "addressLine1",
        "addressLine2",
        "items",
      ],
      additionalProperties: false,
    },
  },
];

type WatiOrderArgs = {
  customerName: string;
  customerPhone: string;
  city: string;
  department: string | null;
  addressLine1: string;
  addressLine2: string | null;
  items: Array<{ slug: string; quantity: number }>;
};

async function getSellerContext(sellerId: string | null | undefined) {
  if (!sellerId || !prisma) return { styleExamples: null as string | null, whatsappPhone: null as string | null };

  const [seller, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: sellerId }, select: { whatsappPhone: true } }),
    prisma.watiMessage.findMany({
      where: { role: "AGENT", senderId: sellerId },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: { content: true },
    }),
  ]);

  const styleExamples =
    messages.length > 0
      ? messages.map((m) => `- "${m.content.replace(/\s+/g, " ").trim().slice(0, 200)}"`).join("\n")
      : null;

  return { styleExamples, whatsappPhone: seller?.whatsappPhone ?? null };
}

async function getCatalogContext() {
  const [fullCatalog, combos] = await Promise.all([
    buildFullCatalogContext(),
    prisma
      ? prisma.combo.findMany({
          where: { active: true },
          select: { name: true, slug: true, price: true, description: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const comboLines = combos.map(
    (combo) =>
      `- ${combo.name} | slug: ${combo.slug} | precio: ${formatearMoneda(combo.price)}${combo.description ? ` | descripción: ${combo.description.replace(/\s+/g, " ").trim().slice(0, 140)}` : ""}`,
  );

  return [COMBO_PREMIUM_CATALOG_LINE, "COMBOS ACTIVOS:", ...comboLines, "", fullCatalog].join("\n");
}

function summarizeItems(items: Array<{ name: string; quantity: number }>) {
  return items
    .map((item) => (item.quantity === 1 ? `1 ${item.name}` : `${item.quantity} × ${item.name}`))
    .join(", ");
}

export async function runWatiAssistant(
  history: { role: "user" | "assistant"; content: string }[],
  newUserMessage: string,
  options: { allowOrderCreation?: boolean; sellerId?: string | null } = {},
) {
  if (history.length === 0) {
    return {
      reply: INITIAL_MESSAGE,
      orderCreated: null as { orderId: string } | null,
    };
  }

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");

  const allowOrderCreation = options.allowOrderCreation !== false;
  const [{ styleExamples, whatsappPhone }, catalog] = await Promise.all([
    getSellerContext(options.sellerId),
    getCatalogContext(),
  ]);

  const sellerLink = whatsappPhone ? `https://wa.me/${whatsappPhone}` : "";
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const input = [
    { role: "system" as const, content: buildKliniuKnowledge(sellerLink) },
    { role: "system" as const, content: WATI_CHANNEL_PROMPT },
    {
      role: "system" as const,
      content: `CATÁLOGO VIGENTE DE KLINIU (fuente de verdad):\n${catalog}`,
    },
    ...(styleExamples
      ? [{
          role: "system" as const,
          content: `EJEMPLOS DE TONO DEL VENDEDOR ASIGNADO (no son parte de esta conversación, solo referencia de cómo escribe para que imites su estilo, sin copiar el contenido literal):\n${styleExamples}`,
        }]
      : []),
    ...(allowOrderCreation
      ? []
      : [{ role: "system" as const, content: "Esta conversación ya tiene un pedido registrado. No vuelvas a crear otro pedido; responde solo dudas de soporte o posventa." }]),
    ...history,
    { role: "user" as const, content: newUserMessage },
  ];

  const response = await openai.responses.create({
    model: process.env.OPENAI_WATI_MODEL ?? "gpt-4.1-mini",
    input,
    ...(allowOrderCreation ? { tools } : {}),
    max_output_tokens: 350,
  });

  const toolCall = response.output.find((item) => item.type === "function_call");
  if (toolCall && toolCall.type === "function_call" && toolCall.name === "crear_pedido") {
    const args = JSON.parse(toolCall.arguments) as WatiOrderArgs;
    const { orderId, items, subtotal, shippingCost } = await createWatiOrder({
      customerName: args.customerName,
      customerPhone: args.customerPhone,
      city: args.city,
      department: args.department,
      addressLine1: args.addressLine1,
      addressLine2: args.addressLine2,
      items: args.items,
    });

    let orderNumber = "";
    try {
      const synced = await syncOrderToOdoo(orderId);
      orderNumber = synced.odooOrderName ?? "";
    } catch {
      // Si Odoo falla, igual confirmamos localmente; un asesor lo sincroniza.
    }

    const total = subtotal + shippingCost;
    const shippingText =
      shippingCost === 0 ? "envío gratis" : `envío $${shippingCost.toLocaleString("es-CO")}`;
    const numberText = orderNumber ? ` Número de pedido: ${orderNumber}.` : "";

    return {
      reply: `¡Listo, ${args.customerName}! 🎉 Registramos tu pedido de ${summarizeItems(items)}. Total: $${total.toLocaleString("es-CO")} (${shippingText}).${numberText} El pago es contra entrega y un asesor confirmará el despacho. Gracias por elegir Kliniu.`,
      orderCreated: { orderId },
    };
  }

  return {
    reply:
      response.output_text.trim() ||
      "Permíteme verificar esa información con uno de nuestros asesores para darte una respuesta completamente correcta.",
    orderCreated: null as { orderId: string } | null,
  };
}
