import OpenAI from "openai";
import { prisma } from "@/lib/prisma";

/**
 * Aprendizaje del asistente de WhatsApp. Una IA revisa conversaciones ya
 * asentadas y PROPONE lecciones (estado PENDING). Solo las que el SUPERADMIN
 * aprueba llegan al prompt del bot. El modelo no se reentrena: la "memoria" son
 * estas reglas cortas inyectadas en cada respuesta.
 */

const CATEGORIES = ["VOCABULARIO", "ERROR", "ESTILO", "PROCESO", "VENTA", "REVISAR"] as const;
type LessonCategory = (typeof CATEGORIES)[number];

const SETTLE_MS = 2 * 60 * 60 * 1000; // la conversación debe llevar 2 h quieta
const MAX_TRANSCRIPT_CHARS = 7000;
const MAX_PROMPT_LESSONS = 30;
const CONCURRENCY = 4;

// Datos que solo pueden venir del catálogo / base legal, nunca de una lección.
const FACTUAL_GUARD = /\$\s?\d|\d+\s?%|precio|valor|garant[ií]a|devoluci|retracto|stock|inventario|env[ií]o gratis|contra ?entrega|pol[ií]tica|t[eé]rminos y condiciones|legal|plazo|d[ií]as h[aá]biles/i;
// El audio ya se transcribe: lecciones sobre "no puedo leer audios" nacen de chats viejos y son falsas hoy.
const STALE_AUDIO = /\b(audios?|notas? de voz)\b/i;
const CORRECTION = /\b(no es asi|no es así|eso no|no te pregunt|no entendiste|ya te dije|te dije|no me sirve|estas mal|estás mal|incorrecto|no era eso)\b/i;

const SYSTEM_PROMPT = `Eres auditor de calidad del asistente comercial de WhatsApp de Kliniu (insumos y dispensadores de higiene, Colombia). Lees UNA conversación y propones lecciones cortas que mejoren al asistente en futuras conversaciones.

Fuentes de aprendizaje: errores del asistente (respuesta equivocada, malentendido, repreguntar datos ya dados), correcciones del cliente, cosas que el asesor humano (AGENT) tuvo que arreglar, palabras que el audio transcribió mal (mensajes con 🎤), y patrones que llevaron a una venta.

Reglas estrictas:
- Cada lección: una regla accionable y general, 1–2 frases, en español, sin datos personales del cliente (nombre, teléfono, dirección).
- Categorías: VOCABULARIO (cómo dicen o entienden los clientes ciertas palabras), ERROR (algo que el asistente hizo mal y cómo evitarlo), ESTILO (tono, longitud, forma de escribir), PROCESO (orden de pasos, cuándo escalar, qué datos pedir), VENTA (qué argumento o secuencia funcionó).
- PRECIOS, STOCK, GARANTÍAS, DEVOLUCIONES, ENVÍOS, POLÍTICAS y datos legales NO se enseñan: vienen del catálogo y la base oficial. Si ves un dato dudoso de ese tipo, genera una lección categoría REVISAR que describa el posible error (para que una persona lo revise), no una regla.
- No inventes: cada lección debe sostenerse en algo que ocurrió en la conversación. En "evidencia" cita el fragmento breve que la origina.
- Estado actual del asistente (no lo contradigas): ya transcribe notas de voz; ya saluda, pregunta el uso del producto, pide datos de envío, escala a un asesor y cierra pedidos. NO propongas lecciones sobre esas capacidades básicas ni generalidades ("sé amable", "ofrece combos", "confirma el uso"): solo reglas ESPECÍFICAS y no obvias, ancladas en un caso concreto de esta conversación.
- Un mensaje del asistente como "solo puedo leer mensajes de texto" es una limitación antigua: no la conviertas en lección.
- Si no hay nada realmente útil y específico, devuelve una lista vacía. Es lo normal y lo esperado en la mayoría de conversaciones.
- No repitas lecciones que ya existen (se te listan).`;

const LESSONS_SCHEMA = {
  type: "object",
  properties: {
    lessons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: { type: "string", enum: [...CATEGORIES] },
          text: { type: "string" },
          evidence: { type: "string" },
        },
        required: ["category", "text", "evidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["lessons"],
  additionalProperties: false,
} as const;

type Proposed = { category: LessonCategory; text: string; evidence: string };

const normalize = (value: string) =>
  value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]+/g, " ").replace(/\s+/g, " ").trim();

/** Lecciones activas para el prompt del bot (solo APPROVED, nunca REVISAR). */
export async function getApprovedLessonsPrompt(): Promise<string | null> {
  if (!prisma) return null;
  const lessons = await prisma.watiLesson.findMany({
    where: { status: "APPROVED", category: { not: "REVISAR" } },
    orderBy: { reviewedAt: "desc" },
    take: MAX_PROMPT_LESSONS,
    select: { category: true, text: true },
  });
  if (lessons.length === 0) return null;
  return `LECCIONES APRENDIDAS (aprobadas por el equipo a partir de conversaciones reales; aplícalas, pero el catálogo, precios y la base oficial siempre mandan sobre ellas):\n${lessons
    .map((lesson) => `- [${lesson.category}] ${lesson.text}`)
    .join("\n")}`;
}

async function analyzeConversation(
  openai: OpenAI,
  transcript: string,
  existing: string[],
): Promise<Proposed[]> {
  const response = await openai.responses.create({
    model: process.env.OPENAI_LESSONS_MODEL ?? "gpt-4.1",
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Lecciones que ya existen (no las repitas):\n${existing.length ? existing.map((t) => `- ${t}`).join("\n") : "(ninguna)"}\n\nConversación:\n${transcript}`,
      },
    ],
    temperature: 0.2,
    max_output_tokens: 700,
    text: { format: { type: "json_schema", name: "lessons", schema: LESSONS_SCHEMA, strict: true } },
  });
  const parsed = JSON.parse(response.output_text) as { lessons: Proposed[] };
  return parsed.lessons ?? [];
}

export type LessonsRunResult = { analyzed: number; created: number; remaining: number };

/**
 * Analiza hasta `limit` conversaciones asentadas de los últimos `days` días que
 * tengan alguna señal (asesor intervino, escalada, pedido, audio, corrección).
 * Cada conversación se analiza una sola vez.
 */
export async function runLessonsAnalysis(options: { days?: number; limit?: number; settleMs?: number } = {}): Promise<LessonsRunResult> {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_NOT_CONFIGURED");
  const days = options.days ?? 30;
  const limit = options.limit ?? 20;

  const baseWhere = {
    lessonsAnalyzedAt: null,
    updatedAt: { gte: new Date(Date.now() - days * 864e5), lte: new Date(Date.now() - (options.settleMs ?? SETTLE_MS)) },
  };

  const candidates = await prisma.watiConversation.findMany({
    where: baseWhere,
    orderBy: { updatedAt: "desc" },
    take: limit * 3,
    select: {
      id: true,
      botPaused: true,
      orderId: true,
      messages: { orderBy: { createdAt: "asc" }, select: { role: true, content: true } },
    },
  });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const existing = (
    await prisma.watiLesson.findMany({
      where: { status: { not: "REJECTED" } },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { text: true },
    })
  ).map((lesson) => lesson.text);
  const seen = new Set(existing.map(normalize));

  let analyzed = 0;
  let created = 0;
  const queue = candidates.slice();

  async function worker() {
    for (;;) {
      if (analyzed >= limit) return;
      const conversation = queue.shift();
      if (!conversation) return;

      const { messages } = conversation;
      const hasSignal =
        conversation.botPaused ||
        Boolean(conversation.orderId) ||
        messages.some((m) => m.role === "AGENT" || m.content.startsWith("🎤")) ||
        messages.some((m) => m.role === "USER" && CORRECTION.test(m.content));

      // Sin señal o demasiado corta: se marca para no volver a evaluarla.
      if (!hasSignal || messages.length < 4) {
        await prisma!.watiConversation.update({ where: { id: conversation.id }, data: { lessonsAnalyzedAt: new Date() } });
        continue;
      }
      analyzed += 1;

      try {
        const transcript = messages
          .map((m) => `${m.role === "USER" ? "Cliente" : m.role === "AGENT" ? "Asesor" : "Asistente"}: ${m.content}`)
          .join("\n")
          .slice(-MAX_TRANSCRIPT_CHARS);
        const proposals = await analyzeConversation(openai, transcript, existing);

        for (const proposal of proposals.slice(0, 4)) {
          const text = proposal.text.trim();
          const key = normalize(text);
          if (text.length < 15 || seen.has(key)) continue;
          if (proposal.category !== "VOCABULARIO" && STALE_AUDIO.test(text)) continue;
          seen.add(key);
          // Guarda dura: nada con datos comerciales/legales llega al bot como regla.
          const category: LessonCategory = FACTUAL_GUARD.test(text) ? "REVISAR" : proposal.category;
          await prisma!.watiLesson.create({
            data: {
              text,
              category,
              evidence: proposal.evidence.trim().slice(0, 500),
              conversationId: conversation.id,
            },
          });
          created += 1;
        }
        await prisma!.watiConversation.update({ where: { id: conversation.id }, data: { lessonsAnalyzedAt: new Date() } });
      } catch (error) {
        // Sin marcar: se reintenta en la próxima corrida.
        console.error("WATI_LESSONS_ANALYZE_FAILED", conversation.id, error);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const remaining = await prisma.watiConversation.count({ where: baseWhere });
  return { analyzed, created, remaining };
}
