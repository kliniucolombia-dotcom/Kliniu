import OpenAI from "openai";
import { buildCatalogContext, buildLocalAssistantReply, getCatalogSnapshot } from "@/lib/chatbot";

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
        mode: "local",
      });
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      instructions: [
        "Eres el asistente comercial de Kliniu.",
        "Responde siempre en español claro, breve y útil.",
        "Tu objetivo es ayudar a encontrar repuestos, categorías y orientar sobre disponibilidad, envíos y pagos.",
        "No inventes productos, precios ni stock.",
        "Si no estás seguro, dilo claramente y sugiere una categoría o producto real del contexto.",
        "Cuando menciones productos, usa el nombre exacto y si es útil di su ruta relativa.",
        "Contexto del catálogo:",
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
