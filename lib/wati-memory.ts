import OpenAI from "openai";

/**
 * Memoria larga del asistente de WhatsApp. Los chats largos no deben perder el
 * contexto inicial: los mensajes antiguos se resumen de forma rodante y se
 * guardan en `WatiConversation.memorySummary`, enviando al modelo solo ese
 * resumen + los últimos `WATI_MEMORY_KEEP_RECENT` mensajes.
 */
export const WATI_MEMORY_KEEP_RECENT = 16;

type MemoryMessage = { role: "user" | "assistant"; content: string };

const SUMMARY_INSTRUCTIONS = [
  "Resume la conversación de WhatsApp entre un cliente y el asistente comercial de Kliniu.",
  "Conserva solo lo útil para vender y atender: tipo de cliente o espacio, productos de interés con su nombre exacto, cantidades, ciudad, presupuesto, objeciones, decisiones, datos ya aportados por el cliente (nombre, dirección, teléfono) y compromisos pendientes.",
  "Máximo 8 líneas, en español, sin inventar datos ni saludar. Si algo no se dijo, no lo agregues.",
].join(" ");

/** Fusiona un resumen previo con los mensajes nuevos. Devuelve null si no hay nada que resumir. */
export async function summarizeConversation(input: {
  previousSummary: string | null;
  messages: MemoryMessage[];
}): Promise<string | null> {
  if (!process.env.OPENAI_API_KEY || input.messages.length === 0) return null;

  const transcript = input.messages
    .map((message) => `${message.role === "user" ? "Cliente" : "Asistente"}: ${message.content}`)
    .join("\n");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // El resumen es mecánico: modelo barato y determinista, independiente del de venta.
  const response = await openai.responses.create({
    model: process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini",
    input: [
      { role: "system", content: SUMMARY_INSTRUCTIONS },
      {
        role: "user",
        content: `${input.previousSummary ? `Resumen previo:\n${input.previousSummary}\n\n` : ""}Conversación a incorporar:\n${transcript}`,
      },
    ],
    temperature: 0.2,
    max_output_tokens: 300,
  });

  return response.output_text.trim() || null;
}
