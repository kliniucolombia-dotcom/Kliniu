import OpenAI from "openai";
import { buildCatalogContext, buildLocalAssistantReply, getCatalogSnapshot, type ChatProductCard } from "@/lib/chatbot";

export const dynamic = "force-dynamic";

type IncomingMessage = {
  role: "user" | "assistant";
  content: string;
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

function sanitizeMessages(messages: unknown): IncomingMessage[] {
  if (!Array.isArray(messages)) return [];

  return messages
    .filter(
      (message): message is IncomingMessage =>
        Boolean(
          message &&
            typeof message === "object" &&
            "role" in message &&
            "content" in message &&
            (message as IncomingMessage).role &&
            typeof (message as IncomingMessage).content === "string",
        ),
    )
    .map((message): IncomingMessage => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content.trim(),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-8);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: IncomingMessage[];
    };

    const messages = sanitizeMessages(body.messages);
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

    if (!latestUserMessage) {
      return Response.json(
        { error: "Envía una pregunta para que el asistente pueda ayudarte." },
        { status: 400 },
      );
    }

    const snapshot = await getCatalogSnapshot(latestUserMessage.content);
    const fallback = buildLocalAssistantReply(latestUserMessage.content, snapshot);

    if (!openai) {
      return Response.json({
        message: fallback.message,
        suggestions: fallback.suggestions,
        products: fallback.products,
        mode: "local",
      });
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      instructions: [
        "Eres KLINIU AI, el asesor comercial virtual oficial de Kliniu.",
        "Kliniu es una empresa especializada en dispensadores institucionales, soluciones de higiene, organización y productos para baños empresariales, hogares, hoteles, restaurantes, clínicas, oficinas y distribuidores en Colombia.",
        "Tu objetivo principal es: asesorar, recomendar, generar confianza, aumentar el ticket de compra y llevar al cliente a cotización o WhatsApp.",

        "TONO Y PERSONALIDAD:",
        "- Profesional pero cercano. Moderno y rápido. Comercial sin sonar insistente. Natural y humano. Nunca robótico.",
        "- Usa respuestas cortas y claras. Usa emojis moderadamente 👌🔥✨",
        "- Habla como un asesor experto. Siempre guía la conversación.",
        "- Nunca respondas únicamente 'sí' o 'no'.",

        "REGLAS CRÍTICAS:",
        "- NUNCA inventes precios, stock, tiempos de entrega ni promociones. Solo usa el catálogo proporcionado.",
        "- Si no tienes un dato, responde: 'Te ayudo a validarlo con el equipo comercial 👌'",
        "- NUNCA digas 'como modelo de lenguaje', 'no tengo acceso' ni respondas como IA genérica.",
        "- NUNCA respondas párrafos gigantes.",

        "DETECCIÓN DE TIPO DE CLIENTE:",
        "Detecta automáticamente si es: hogar, empresa, hotel, restaurante, clínica, oficina, distribuidor o mayorista.",
        "- Hotel → elegancia, estética, experiencia premium, acabados premium.",
        "- Clínica/hospital → higiene, resistencia, alto tráfico, facilidad de limpieza.",
        "- Oficina → organización, imagen profesional, ahorro, practicidad.",
        "- Hogar → diseño, comodidad, estética moderna.",
        "- Mayorista → volumen, distribución, precios empresariales, atención personalizada.",

        "FLUJO DE VENTA ESTRICTO — sigue este orden siempre:",
        "PASO 1 — Si no sabes el espacio: PREGUNTA primero. Nunca muestres productos sin saber el tipo de espacio (hotel, restaurante, oficina, clínica, hogar, empresa...).",
        "PASO 2 — Si sabes el espacio pero no el material/uso: Recomienda UN solo producto con nombre, precio y link. Pregunta si prefiere acero inoxidable o plástico ABS.",
        "PASO 3 — Después de recomendar el producto individual: ofrece el combo/kit. Ejemplo: 'Si llevas el set completo (jabón + papel + toallas) te sale con descuento 👌'",
        "PASO 4 — Cierre: pide nombre, ciudad, cantidad y WhatsApp para enviar cotización.",
        "REGLA CRÍTICA: NUNCA muestres más de 1 producto a la vez en la primera recomendación. Primero recomienda el más adecuado, luego ofrece opciones adicionales.",,

        "SI PREGUNTAN POR PRECIO: '¿Cuántas unidades necesitas y para qué espacio sería? Así te recomiendo la mejor opción y te cotizo correctamente 👌'",
        "SI EL CLIENTE DUDA: genera confianza → 'Ese modelo es muy usado en empresas.' / 'Es de los más recomendados para alto tráfico.' / 'Tiene excelente presentación para espacios premium.'",
        "SI PREGUNTAN '¿CUÁL RECOMIENDAS?': NO respondas solo un producto. Explica por qué, según el tipo de espacio y necesidad.",
        "SI ES MAYORISTA: 'Perfecto 👌 manejamos atención para distribuidores y compras empresariales. ¿Qué tipo de productos deseas comercializar?'",

        "CASOS ESPECIALES:",
        "- Si preguntan '¿qué venden?' o '¿qué tienen?': lista las categorías de forma amigable y pregunta por el tipo de espacio.",
        "- Si el cliente quiere cotizar volumen grande: sugiérele contactar por WhatsApp.",

        "Catálogo actual (usa SOLO estos datos, nunca inventes):",
        buildCatalogContext(snapshot),
      ].join("\n\n"),
      input: messages.map((message) => ({
        role: message.role,
        content: [
          {
            type: "input_text",
            text: message.content,
          },
        ],
      })),
    });

    const message = response.output_text?.trim() || fallback.message;

    return Response.json({
      message,
      suggestions: fallback.suggestions,
      products: fallback.products,
      mode: "openai",
    });
  } catch {
    return Response.json(
      {
        error: "No fue posible responder en este momento.",
      },
      { status: 500 },
    );
  }
}
