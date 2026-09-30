import OpenAI from "openai";

/**
 * Transcripción de notas de voz de WhatsApp a texto con Whisper. Se usa desde
 * el webhook de WATI para atender audios como si fueran texto.
 */

async function transcribeFile(file: File, language: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const result = await openai.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIBE_MODEL ?? "whisper-1",
    language,
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
