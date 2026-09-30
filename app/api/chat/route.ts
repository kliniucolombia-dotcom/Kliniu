import OpenAI from "openai";
import { buildCatalogContext, buildLocalAssistantReply, getCatalogSnapshot, type ChatProductCard } from "@/lib/chatbot";
import { buildKliniuKnowledge } from "@/lib/kliniu-knowledge";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { classifyMessage, RESPECT_BOUNDARY_REPLY } from "@/lib/moderation";

const FALLBACK_SELLER_PHONE = "573125860921";

async function getSellerWhatsappLink(): Promise<string> {
  let phone = FALLBACK_SELLER_PHONE;
  if (prisma) {
    const sellers = await prisma.user.findMany({
      where: { role: "SELLER", whatsappPhone: { not: null } },
      select: { whatsappPhone: true },
    });
    if (sellers.length > 0) {
      const random = sellers[Math.floor(Math.random() * sellers.length)];
      phone = random.whatsappPhone ?? FALLBACK_SELLER_PHONE;
    }
  }
  return `https://wa.me/${phone}`;
}

export const dynamic = "force-dynamic";

/** Extrae datos de cierre (WhatsApp/nombre/ciudad/cantidad) de un mensaje del cliente, si los hay. */
function extractLeadInfo(text: string): { name?: string; city?: string; quantity?: string; whatsapp?: string } | null {
  const phoneMatch = text.match(/(?:\+?57)?[\s.-]?(3\d{2}[\s.-]?\d{3}[\s.-]?\d{4})/);
  if (!phoneMatch) return null;

  const whatsapp = phoneMatch[0].replace(/\D/g, "").slice(-10);
  const nameMatch = text.match(/(?:me llamo|mi nombre es|soy)\s+([a-záéíóúñ\s]{2,40})/i);
  const cityMatch = text.match(/(?:ciudad|en)\s+([a-záéíóúñ]{3,30})/i);
  const qtyMatch = text.match(/(\d{1,4})\s*(?:unidades|und|piezas|dispensadores)/i);

  return {
    whatsapp,
    name: nameMatch?.[1]?.trim(),
    city: cityMatch?.[1]?.trim(),
    quantity: qtyMatch?.[1],
  };
}

/** Guarda el lead en background sin bloquear ni romper la respuesta del chat si falla. */
function saveLeadIfPresent(text: string) {
  if (!prisma) return;
  const lead = extractLeadInfo(text);
  if (!lead) return;
  prisma.chatLead
    .create({ data: { ...lead, lastMessage: text.slice(0, 500) } })
    .catch(() => {});
}

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
    if (!(await checkRateLimit(`chat:${getClientIp(request)}`, 20, 60 * 1000))) {
      return Response.json(
        { error: "Estás enviando mensajes muy rápido. Espera un momento e intenta de nuevo." },
        { status: 429 },
      );
    }

    const body = (await request.json()) as {
      messages?: IncomingMessage[];
      shownProductSlugs?: string[];
    };

    const messages = sanitizeMessages(body.messages);
    const shownProductSlugs = new Set(Array.isArray(body.shownProductSlugs) ? body.shownProductSlugs : []);
    const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

    if (!latestUserMessage) {
      return Response.json(
        { error: "Envía una pregunta para que el asistente pueda ayudarte." },
        { status: 400 },
      );
    }

    // Moderación: groserías, vulgar/sexual, amenazas. No llegar al modelo ni mostrar productos.
    const moderation = await classifyMessage(latestUserMessage.content);
    if (moderation.action !== "ALLOW") {
      return Response.json({
        message: moderation.reply ?? RESPECT_BOUNDARY_REPLY,
        suggestions: [],
        products: undefined,
        mode: "local",
      });
    }

    saveLeadIfPresent(latestUserMessage.content);

    // Si el último mensaje es solo un tipo de espacio (hogar, restaurante, etc.),
    // siempre combinar con el mensaje anterior para no perder el producto buscado.
    const SPACE_WORDS = new Set(["hotel","restaurante","oficina","clinica","hospital","colegio","hogar","casa","empresa","gym","gimnasio","salon","bodega","fabrica","bano","centro","mall","comercial","plaza","aeropuerto","estadio","universidad","banco","spa","cafeteria","bar","club","acero","inoxidable","plastico","abs","klinox"]);
    const latestTokens = latestUserMessage.content.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const normalize = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const isPurelySpace = latestTokens.length <= 2 && latestTokens.every((t) => SPACE_WORDS.has(normalize(t)));

    const userMessages = messages.filter((m) => m.role === "user");
    const prevUserMessage = userMessages[userMessages.length - 2];

    // Si prevUserMessage es solo un material/espacio (ej. "acero inoxidable"), ir un nivel más atrás
    // para recuperar el contexto de producto original (ej. "dispensador de jabón")
    const MATERIAL_WORDS = new Set(["acero","inoxidable","plastico","abs","klinox","hogar","hotel","oficina","restaurante","clinica","empresa"]);
    const prevTokens = prevUserMessage?.content.toLowerCase().trim()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .split(/\s+/).filter(Boolean) ?? [];
    const prevIsPurelyContext = prevTokens.length <= 3 && prevTokens.every((t) => MATERIAL_WORDS.has(t));
    const productContextMessage = prevIsPurelyContext
      ? (userMessages[userMessages.length - 3] ?? prevUserMessage)
      : prevUserMessage;

    // Detectar aclaraciones del tipo "pero de jabón", "solo de toalla", "de papel", "déjame los de plástico"
    const CLARIFICATION_STARTERS = [
      "pero","solo","solamente","especificamente",
      "de","uno de","quiero de","es de","sea de",
      "dejame","muestrame","dame","quiero","ponme",
      "prefiero","mejor","y los","los de","y de",
      "ahora","entonces","en ese caso",
    ];
    const latestLower = latestUserMessage.content.toLowerCase().trim()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
    const isClarification = Boolean(prevUserMessage) && latestTokens.length <= 6 &&
      CLARIFICATION_STARTERS.some((s) => latestLower.startsWith(s));

    let snapshot;
    if (isPurelySpace && prevUserMessage) {
      snapshot = await getCatalogSnapshot(productContextMessage.content, latestUserMessage.content);
      if (snapshot.matchedProducts.length === 0 && snapshot.matchedCategories.length === 0) {
        snapshot = await getCatalogSnapshot(`${productContextMessage.content} ${latestUserMessage.content}`);
      }
    } else if (isClarification && prevUserMessage) {
      // Combinar aclaración con contexto de producto original (saltando mensajes de material/espacio)
      snapshot = await getCatalogSnapshot(`${productContextMessage.content} ${latestUserMessage.content}`);
      if (snapshot.matchedProducts.length === 0 && snapshot.matchedCategories.length === 0) {
        snapshot = await getCatalogSnapshot(latestUserMessage.content);
      }
    } else {
      snapshot = await getCatalogSnapshot(latestUserMessage.content);
      if (snapshot.matchedProducts.length === 0 && snapshot.matchedCategories.length === 0 && prevUserMessage) {
        snapshot = await getCatalogSnapshot(prevUserMessage.content, latestUserMessage.content);
      }
    }
    const fallback = buildLocalAssistantReply(latestUserMessage.content, snapshot);

    // No mostrar tarjetas de producto tras una queja o devolución: se siente fuera de lugar.
    const COMPLAINT_WORDS = [
      "pesimo", "pesima", "mal servicio", "no responde", "nadie responde", "queja", "reclamo",
      "dañad", "danad", "defectuoso", "devolucion", "devolver", "reembolso", "mal estado",
      "no sirve", "no funciona", "se daño", "se dano", "se rompio", "llego roto", "llego dañado",
      "llego danado", "estafa", "fraude", "no llego", "nunca llego", "pedido perdido",
      "no me han respondido", "sic", "superintendencia", "demanda", "abogado", "denuncia",
      "muy molesto", "muy enojado", "estoy furioso", "es urgente", "urgente",
    ];
    const latestNormalizedForComplaint = latestUserMessage.content.toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
    const isComplaintOrReturn = COMPLAINT_WORDS.some((w) => latestNormalizedForComplaint.includes(w));

    const sellerWhatsapp = await getSellerWhatsappLink();

    const filterShownProducts = (products?: ChatProductCard[]) => {
      if (!products || products.length === 0) return undefined;
      const fresh = products.filter((product) => !shownProductSlugs.has(product.slug));
      return fresh.length > 0 ? fresh : undefined;
    };

    if (!openai) {
      return Response.json({
        message: fallback.message,
        suggestions: fallback.suggestions,
        products: isComplaintOrReturn ? undefined : filterShownProducts(fallback.products),
        mode: "local",
      });
    }

    const response = await openai.responses.create({
      model: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
      instructions: [
        buildKliniuKnowledge(sellerWhatsapp),
        isComplaintOrReturn ? "El cliente acaba de hacer una queja o pedir una devolución: NO recomiendes ni menciones productos nuevos en esta respuesta, concéntrate solo en resolver su problema y dale el WhatsApp." : "",
        buildCatalogContext(snapshot),
      ].join("\n\n"),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: messages.map((message) => ({
        role: message.role,
        content: [
          {
            type: message.role === "assistant" ? "output_text" : "input_text",
            text: message.content,
          },
        ],
      })) as any,
    });

    const message = response.output_text?.trim() || fallback.message;

    return Response.json({
      message,
      suggestions: fallback.suggestions,
      products: isComplaintOrReturn ? undefined : filterShownProducts(fallback.products),
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
