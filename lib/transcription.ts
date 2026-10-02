import OpenAI from "openai";
import { getProducts } from "@/lib/products";

/**
 * Transcripción de notas de voz de WhatsApp a texto con Whisper. Se usa desde
 * el webhook de WATI para atender audios como si fueran texto.
 */

// Vocabulario del negocio: sin esto el modelo oye "servilleteros" como "ser billeteros", etc.
const BASE_PROMPT =
  "Cliente de Kliniu Colombia consultando por WhatsApp. Productos: dispensadores de jabón líquido, jabón espuma, gel antibacterial, papel higiénico jumbo, toallas de papel, toallas intercaladas, toalla en rollo, servilleteros, basureros, bolsas, insumos, combo premium, cotización, envío, contra entrega.";

const PROMPT_TTL_MS = 10 * 60 * 1000;
const PROMPT_MAX_CHARS = 900;
let promptCache: { value: string; at: number } | null = null;

/** Base fija + nombres reales del catálogo (categorías y primeras palabras de cada producto). */
async function getTranscribePrompt(): Promise<string> {
  if (promptCache && Date.now() - promptCache.at < PROMPT_TTL_MS) return promptCache.value;
  let value = BASE_PROMPT;
  try {
    const products = await getProducts();
    const terms = new Set<string>();
    for (const p of products) {
      terms.add(String(p.categoria).replace(/[-_]/g, " ").toLowerCase());
      terms.add(p.nombre.split(/\s+/).slice(0, 3).join(" ").toLowerCase());
    }
    value = `${BASE_PROMPT} Catálogo: ${[...terms].join(", ")}`.slice(0, PROMPT_MAX_CHARS);
  } catch {
    // ponytail: sin catálogo (DB caída) se usa solo la base fija.
  }
  promptCache = { value, at: Date.now() };
  return value;
}

async function transcribeFile(file: File, language: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await openai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-transcribe",
    language,
    prompt: await getTranscribePrompt(),
  });

  return result.text?.trim() ?? "";
}

export async function transcribeAudioBuffer(
  buffer: Uint8Array,
  contentType: string,
  language = "es",
): Promise<string> {
  if (buffer.byteLength === 0) return "";
  const bytes = new Uint8Array(buffer);
  return transcribeFile(new File([bytes], "audio.ogg", { type: contentType }), language);
}

export async function transcribeAudioFromUrl(url: string, language = "es"): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`AUDIO_FETCH_FAILED: ${response.status}`);

  const contentType = response.headers.get("content-type") ?? "audio/ogg";
  const buffer = Buffer.from(await response.arrayBuffer());
  return transcribeAudioBuffer(buffer, contentType, language);
}
