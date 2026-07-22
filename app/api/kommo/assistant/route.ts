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
          content:
            "Eres el asistente de ventas de Kliniu por WhatsApp. Responde corto, claro y directo, en español, usando el contexto de catálogo dado. Si no hay match, invita a contactar a un asesor.",
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
