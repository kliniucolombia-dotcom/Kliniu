import OpenAI from "openai";

/** Máximo que se manda a visión: imágenes de WhatsApp rara vez pasan de 1-2 MB. */
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

const VISION_PROMPT =
  "Eres el lector de imágenes de un chat de ventas de Kliniu (dispensadores, jabón, papel e insumos de aseo). " +
  "Describe en máximo 3 frases, en español, solo lo que se ve: texto visible (precios, nombres de producto, mensajes de chat) y qué producto o lugar aparece. " +
  "No repitas ni transcribas cédulas, números de cuenta, tarjetas ni datos de comprobantes de pago: di solo 'comprobante de pago' o 'documento de identidad'. " +
  "Si no se entiende o no tiene relación con aseo o con un chat de compra, responde exactamente: ILEGIBLE.";

/** Descripción corta de una imagen entrante, o null si no se pudo leer. Nunca lanza. */
export async function describeCustomerImage(buffer: Buffer, contentType: string): Promise<string | null> {
  try {
    if (!process.env.OPENAI_API_KEY) return null;
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_IMAGE_BYTES) return null;
    const mime = contentType.startsWith("image/") ? contentType.split(";")[0] : "image/jpeg";
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: process.env.OPENAI_WATI_VISION_MODEL ?? process.env.OPENAI_WATI_MODEL ?? "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: VISION_PROMPT },
            { type: "input_image", detail: "low", image_url: `data:${mime};base64,${buffer.toString("base64")}` },
          ],
        },
      ],
      max_output_tokens: 200,
      temperature: 0,
    });
    const text = response.output_text.trim();
    return !text || /^ILEGIBLE\b/i.test(text) ? null : text.slice(0, 600);
  } catch (error) {
    console.error("WATI_VISION_FAILED", error);
    return null;
  }
}
