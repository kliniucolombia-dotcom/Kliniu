import OpenAI from "openai";
import { createWatiOrder } from "@/lib/wati-order";

const SYSTEM_PROMPT = `Eres el vendedor virtual de Kliniu por WhatsApp. Vendes UN SOLO producto: el Combo Total.

Incluye:
1. Dispensador de papel higiénico 250 mts
2. Dispensador de líquidos 1000 ml
3. Dispensador de toalla de papel 300 toallas
4. Señalética piso mojado

Precio: $309.900 (incluye insumos). Dispensadores en acero 304. Ideal para baños.
Oferta válida por tiempo limitado hasta agotar existencias. Aplica términos y condiciones. Envío incluido a ciudades principales.

Reglas:
- No inventes precios, condiciones ni stock fuera de lo indicado.
- No ofrezcas otros productos.
- Pregunta cuántos combos quiere.
- Explica qué incluye el combo si preguntan.
- Antes de crear el pedido necesitas: nombre completo, teléfono, ciudad, dirección y cantidad. Pide lo que falte.
- Cuando tengas todos los datos, llama la función crear_pedido. No inventes datos que el cliente no dio.`;

const tools = [
  {
    type: "function" as const,
    name: "crear_pedido",
    description: "Crea el pedido del Combo Total cuando ya se tienen todos los datos del cliente.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        customerName: { type: "string" },
        customerPhone: { type: "string" },
        city: { type: "string" },
        addressLine1: { type: "string" },
        quantity: { type: "number" },
      },
      required: ["customerName", "customerPhone", "city", "addressLine1", "quantity"],
      additionalProperties: false,
    },
  },
];

export async function runWatiAssistant(
  history: { role: "user" | "assistant"; content: string }[],
  newUserMessage: string,
) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const input = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...history,
    { role: "user" as const, content: newUserMessage },
  ];

  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input,
    tools,
  });

  const toolCall = response.output.find((item) => item.type === "function_call");

  if (toolCall && toolCall.type === "function_call" && toolCall.name === "crear_pedido") {
    const args = JSON.parse(toolCall.arguments) as {
      customerName: string;
      customerPhone: string;
      city: string;
      addressLine1: string;
      quantity: number;
    };

    const { orderId, paymentUrl } = await createWatiOrder(args);

    return {
      reply: `Listo ${args.customerName}, tu pedido de ${args.quantity} Combo(s) Total quedó registrado. Para confirmarlo paga aquí: ${paymentUrl}`,
      orderCreated: { orderId, paymentUrl },
    };
  }

  return { reply: response.output_text, orderCreated: null as { orderId: string; paymentUrl: string } | null };
}
