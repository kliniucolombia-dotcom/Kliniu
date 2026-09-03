import OpenAI from "openai";
import { buildCatalogContext, buildLocalAssistantReply, getCatalogSnapshot } from "@/lib/chatbot";

export const dynamic = "force-dynamic";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// Endpoint para el paso "Webhook" del Salesbot de Kommo (WhatsApp).
// Configurar en Salesbot: paso Webhook -> POST a esta URL con body
// {"message": "{{last_incoming_message.text}}", "name": "{{lead.name}}"}
// y mapear "reply" de la respuesta JSON a la variable que envía el paso "Mensaje" siguiente.
async function extractMessage(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const raw = body.message ?? body.text ?? "";
    return typeof raw === "string" ? raw.trim() : "";
  }

  const form = await request.formData().catch(() => null);
  if (!form) return "";
  const raw = form.get("message") ?? form.get("text") ?? "";
  return typeof raw === "string" ? raw.trim() : "";
}

export async function POST(request: Request) {
  const secret = process.env.KOMMO_WEBHOOK_SECRET;
  if (secret) {
    const provided = request.headers.get("x-kommo-secret") ?? new URL(request.url).searchParams.get("secret");
    if (provided !== secret) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const message = await extractMessage(request);

  if (!message) {
    return Response.json({ reply: "¿En qué puedo ayudarte?" });
  }

  const snapshot = await getCatalogSnapshot(message);
  const fallback = buildLocalAssistantReply(message, snapshot);

  if (!openai) {
    return Response.json({ reply: fallback.message });
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [
            "Eres el asistente de ventas de Kliniu por WhatsApp. Responde corto, claro y directo, en español, usando el contexto de catálogo dado. Si no hay match, invita a contactar a un asesor.",
            "STOCK: usa solo el campo disponibilidad/stock del catálogo, literal. Si el producto no está en el contexto dado, nunca afirmes que sí o no hay stock, di que lo confirmas con el equipo comercial.",
            "GARANTÍA: Kliniu no tiene política de garantía definida. Nunca inventes plazo ni fecha de inicio. Siempre responde que lo confirmas con el equipo comercial.",
            "INSTALACIÓN: Kliniu no ofrece instalación. Dilo claro si preguntan, no lo derives como 'a validar'.",
            "DESCUENTO POR VOLUMEN: no hay tabla fija de %. Nunca apruebes ni inventes un porcentaje que proponga el cliente. Di que el descuento por volumen lo define el equipo comercial según el pedido.",
            "PAGO/CIERRE: nunca digas que vas a generar un link de pago o reservar inventario tú mismo — eso lo hace un asesor humano. Si el cliente está listo para pagar, dile que un asesor lo contacta para cerrar la compra.",
            "ENVÍO COSTO: Bogotá D.C. envío gratis. Resto del país $12.000 COP fijo. Da este dato directo si preguntan.",
            "ENVÍO TIEMPO: no hay días exactos definidos, nunca inventes un número, di que lo confirma el equipo comercial.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `Contexto de catálogo:\n${buildCatalogContext(snapshot)}\n\nMensaje del cliente: ${message}`,
        },
      ],
    });

    const text = response.output_text?.trim();
    return Response.json({ reply: text || fallback.message });
  } catch (error) {
    console.error("Error en asistente Kommo:", error);
    return Response.json({ reply: fallback.message });
  }
}
