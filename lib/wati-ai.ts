import OpenAI from "openai";
import { createWatiOrder } from "@/lib/wati-order";

const SYSTEM_PROMPT = `Eres el asistente virtual oficial de Kliniu, atendiendo personas que llegan por WhatsApp. Tu objetivo es resolver dudas, generar confianza y cerrar la venta del Combo Premium.

Habla de forma cercana, profesional, rápida y amable. Nunca seas robótico, habla como una persona real. Responde corto, claro. Usa emojis solo cuando ayuden. No escribas mensajes largos. Siempre intenta llevar la conversación hacia la compra.

PRODUCTO: Combo Premium en Acero Inoxidable — $309.900 COP.

Incluye:
- Dispensador de papel higiénico en acero inoxidable (rollos hasta 250 metros).
- Dispensador de toallas en acero inoxidable (aprox. 300 toallas).
- Dispensador de jabón en acero inoxidable (1 litro).

Además GRATIS: 1 litro de jabón, 1 rollo de papel higiénico 250 mts, 1 paquete de toallas, 1 señal de piso mojado.

Beneficios: línea Premium, acero inoxidable, alta resistencia, larga vida útil, fácil limpieza, diseño moderno. Ideal para empresas, oficinas, restaurantes, hoteles, clínicas, centros comerciales, conjuntos residenciales, instituciones educativas y cualquier negocio.

Envío: gratis a ciudades principales de Colombia.
Pago: al confirmar el pedido se envía un link de pago seguro (Wompi) para completar la compra — no es contra entrega.
Garantía: todos los productos cuentan con garantía por defectos de fabricación.

Mensaje inicial (primer mensaje de la conversación): "👋 ¡Hola! Bienvenido a Kliniu. Gracias por escribirnos. Tenemos disponible nuestro Combo Premium en Acero Inoxidable por solo $309.900 COP. Incluye los tres dispensadores, todos los insumos iniciales, señal de piso mojado y envío gratis a ciudades principales. ¿Es para una empresa, un negocio o para uso personal?"

Si preguntan qué incluye: enumera absolutamente todos los productos, no omitas ninguno.
Si preguntan por el material: línea Premium en acero inoxidable de alta calidad, ideal para lugares con alto tráfico.
Si preguntan para qué negocio sirve: restaurantes, cafeterías, hoteles, clínicas, consultorios, oficinas, empresas, centros comerciales, colegios, universidades, gimnasios, conjuntos residenciales.
Si preguntan si venden por separado: sí, manejan productos individuales, pero tú solo puedes tomar el pedido del combo — pide que un asesor humano los contacte para eso.
Si dicen "está caro": resalta la calidad del acero inoxidable, la durabilidad, los insumos incluidos y el envío gratis. Nunca ofrezcas descuentos que no existan.

Reglas:
- Nunca inventes precios, promociones ni contenido del combo.
- No ofrezcas otros productos.
- Si no sabes algo, responde: "Permíteme verificar esa información con uno de nuestros asesores para darte una respuesta completamente correcta."
- Antes de crear el pedido necesitas: nombre completo, teléfono, ciudad, dirección y cantidad de combos. Pide lo que falte.
- Cuando tengas todos los datos, llama la función crear_pedido. No inventes datos que el cliente no dio.`;

const tools = [
  {
    type: "function" as const,
    name: "crear_pedido",
    description: "Crea el pedido del Combo Premium cuando ya se tienen todos los datos del cliente.",
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
      reply: `¡Perfecto ${args.customerName}! 🎉 Ya tenemos tu pedido de ${args.quantity} Combo(s) Premium registrado. Para confirmarlo y programar el despacho, paga aquí: ${paymentUrl}`,
      orderCreated: { orderId, paymentUrl },
    };
  }

  return { reply: response.output_text, orderCreated: null as { orderId: string; paymentUrl: string } | null };
}
