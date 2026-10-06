import { SITE_URL } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { runWatiAssistant } from "@/lib/wati-ai";
import { pickSellerForNewConversation } from "@/lib/wati-conversations";
import { fetchWatiMedia, sendWatiFileFromUrl, sendWatiMessage, toWatiImageUrl } from "@/lib/wati";
import { getCatalogSnapshot } from "@/lib/chatbot";
import { transcribeAudioBuffer, transcribeAudioFromUrl } from "@/lib/transcription";
import { getProducts, type StoreProduct } from "@/lib/products";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { syncOrderToOdoo } from "@/lib/orders";
import {
  classifyMessage,
  ESCALATE_REPLY,
  RESPECT_BOUNDARY_REPLY,
} from "@/lib/moderation";
import { createNotification } from "@/lib/notifications";
import { getUpsellState, recordUpsellTurn } from "@/lib/wati-upselling";
import { advisorNotifiedRecently, isAdvisorPhone, notifyAdvisor, replyRequestsAdvisor } from "@/lib/wati-escalation";
import { summarizeConversation, WATI_MEMORY_KEEP_RECENT } from "@/lib/wati-memory";
import { cancelRemarketingOnReply, detectCommercialStage, updateConversationState } from "@/lib/wati-followup";

export const maxDuration = 60;

/** Cantidad de advertencias antes de pausar el bot y pasar a un asesor. */
const MAX_MODERATION_STRIKES = 3;

type WatiWebhookPayload = {
  eventType?: unknown;
  owner?: unknown;
  type?: unknown;
  waId?: unknown;
  phone?: unknown;
  bsuid?: unknown;
  text?: unknown;
  message?: unknown;
  id?: unknown;
  messageId?: unknown;
  whatsappMessageId?: unknown;
  mediaUrl?: unknown;
  media_url?: unknown;
  fileUrl?: unknown;
  url?: unknown;
  sourceUrl?: unknown;
  sourceId?: unknown;
  senderName?: unknown;
  data?: unknown;
};

function getSenderName(payload: WatiWebhookPayload): string | null {
  return typeof payload.senderName === "string" && payload.senderName.trim()
    ? payload.senderName.trim().slice(0, 80)
    : null;
}

const HUMAN_FAREWELL =
  "¡Con mucho gusto! Gracias por confiar en Kliniu 😊 Que tengas un excelente día. Si más adelante necesitas algo, aquí estaremos para ayudarte.";

function detectSalesStage(message: string) {
  void message;
  return "IN_PROGRESS" as const;
}

function normalizeForIntent(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/**
 * Despedida real, no un simple "listo/perfecto/gracias" en medio de una
 * consulta. Antes esto cerraba el chat y pausaba el bot ante un "perfecto"
 * cualquiera. Ahora exigimos cierre explícito, sin preguntas ni peticiones
 * nuevas (evitamos falsos positivos que cortaban la conversación).
 */
function isFarewellMessage(message: string) {
  const normalized = normalizeForIntent(message).trim();
  if (!normalized) return false;
  // Una pregunta o un mensaje largo no son despedida.
  if (/[?¿]/.test(normalized) || normalized.length > 60) return false;
  return /\b(chao|adios|hasta luego|hasta pronto|nos vemos|eso es todo|eso seria todo|quedamos asi|buen dia|gracias por todo|muchas gracias por todo|listo,? gracias|perfecto,? gracias)\b/.test(
    normalized,
  );
}

type ConversationHistory = {
  role: "user" | "assistant";
  content: string;
};

type ProductMedia = {
  url: string;
  fileName: string;
  caption: string;
  marker: string;
};

const PHOTO_REQUEST = /\b(foto|fotos|imagen|imagenes|fotografia|fotografias)\b/;

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

/** Slugs de producto presentes en enlaces tipo /producto/<slug>, en orden. */
function productsLinkedIn(products: StoreProduct[], text: string): StoreProduct[] {
  const slugs = [...text.matchAll(/\/producto\/([a-z0-9-]+)/gi)].map((match) => match[1].toLowerCase());
  if (slugs.length === 0) return [];
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return slugs
    .map((slug) => bySlug.get(slug))
    .filter((product): product is StoreProduct => Boolean(product));
}

/** Productos cuyo nombre completo aparece en el texto, en orden de aparición. */
function productsNamedIn(products: StoreProduct[], text: string): StoreProduct[] {
  const normalized = normalizeForMatch(text);
  return products
    .map((product) => ({ product, pos: normalized.indexOf(normalizeForMatch(product.nombre)) }))
    .filter((entry) => entry.pos >= 0)
    .sort((a, b) => a.pos - b.pos)
    .map((entry) => entry.product);
}

/**
 * Resuelve el producto del que habla el cliente. Primero mira los productos que
 * el bot acaba de ofrecer en su respuesta (enlace o nombre completo); el
 * mensaje del cliente desempata si nombra uno explícitamente. Si la respuesta no
 * trae productos, cae al mensaje/historial del cliente.
 */
async function resolveContextProduct(
  history: ConversationHistory[],
  message: string,
  currentReply: string,
): Promise<StoreProduct | null> {
  const products = await getProducts();
  const reply =
    currentReply.trim() ||
    [...history].reverse().find(({ role }) => role === "assistant")?.content ||
    "";
  const lastUser = [...history].reverse().find(({ role }) => role === "user")?.content ?? "";
  const userContext = `${lastUser} ${message}`.trim();

  const linkedReply = productsLinkedIn(products, reply);
  const replyCandidates = linkedReply.length > 0 ? linkedReply : productsNamedIn(products, reply);

  if (replyCandidates.length > 0) {
    const namedByUser = productsNamedIn(products, userContext);
    const chosen = replyCandidates.find((candidate) =>
      namedByUser.some((userProduct) => userProduct.slug === candidate.slug),
    );
    return chosen ?? replyCandidates[0];
  }

  const linkedUser = productsLinkedIn(products, userContext);
  if (linkedUser.length > 0) return linkedUser[0];

  const namedUser = productsNamedIn(products, userContext);
  return namedUser[0] ?? null;
}

/** Fotos a enviar con la respuesta (sistema maestro §2/§27: MOSTRAR).
 * - Si el cliente pide fotos: galería del producto en contexto (hasta 4).
 * - Si no: foto principal de los productos que la respuesta acaba de ofrecer
 *   (2–4), saltando los que ya se mostraron en la conversación para no repetir
 *   catálogo. */
async function getProductMediaToSend(
  history: ConversationHistory[],
  message: string,
  currentReply: string,
): Promise<ProductMedia[]> {
  const wantsPhotos = PHOTO_REQUEST.test(normalizeForIntent(message));
  if (!wantsPhotos) {
    const products = await getProducts();
    const offered = productsLinkedIn(products, currentReply);
    const candidates = offered.length > 0 ? offered : productsNamedIn(products, currentReply);
    const alreadyShown = history.filter(({ role }) => role === "assistant").map(({ content }) => content).join("\n");
    return [...new Map(candidates.map((p) => [p.slug, p])).values()]
      .filter((p) => p.imagen && !alreadyShown.includes(`📸 Foto de ${p.nombre} enviada.`))
      .slice(0, 4)
      .map((p) => ({
        url: toWatiImageUrl(p.imagen.startsWith("http") ? p.imagen : `${SITE_URL}${p.imagen}`),
        fileName: p.imagen.split("/").pop() || `${p.slug}.jpg`,
        caption: `${p.nombre} · ${p.precio}`,
        marker: `📸 Foto de ${p.nombre} enviada.`,
      }));
  }

  let product = await resolveContextProduct(history, message, currentReply);
  if (!product) {
    const lastUserMessage = [...history].reverse().find(({ role }) => role === "user")?.content;
    const query = [lastUserMessage, message].filter(Boolean).join(" ") || message;
    const snapshot = await getCatalogSnapshot(query);
    product = snapshot.matchedProducts[0];
  }
  if (!product) return [];

  // El cliente pidió fotos explícitamente: se envía la galería (hasta 4).
  const marker = `📸 Foto de ${product.nombre} enviada.`;

  const paths = [product.imagen, ...(product.imagenesExtra ?? [])].filter(Boolean);
  if (paths.length === 0) return [];

  const chosen = paths.slice(0, 4);

  return chosen.map((path, index) => ({
    url: toWatiImageUrl(path.startsWith("http") ? path : `${SITE_URL}${path}`),
    fileName: path.split("/").pop() || `${product.slug}-${index + 1}.jpg`,
    caption: index === 0 ? `📷 ${product.nombre} · ${product.precio}` : "",
    marker,
  }));
}

/**
 * WATI configura el callback con una URL, no con headers personalizados. Por eso
 * se admite el secreto como `?token=` (y se mantiene el header para pruebas).
 */
function isAuthorizedWebhook(request: Request) {
  const expectedSecret = process.env.WATI_WEBHOOK_SECRET;
  if (!expectedSecret) return true;

  const url = new URL(request.url);
  const providedSecret =
    request.headers.get("x-wati-webhook-secret") ??
    request.headers.get("x-wati-webhook-token") ??
    url.searchParams.get("token");

  return providedSecret === expectedSecret;
}

/** "message_bsuid" es el mismo evento en el contrato nuevo de WATI (BSUID primero). */
function isInboundMessageEvent(payload: WatiWebhookPayload) {
  return payload.eventType === "message" || payload.eventType === "message_bsuid";
}

/**
 * Identificador del cliente. Con el número oculto en WhatsApp no llega `waId`,
 * solo el BSUID: lo usamos como llave de la conversación y como target de envío.
 */
function getSenderId(payload: WatiWebhookPayload): string | null {
  for (const candidate of [payload.waId, payload.phone, payload.bsuid]) {
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  return null;
}

const BSUID_ONLY_GRACE_MS = 4000;

/** Mensaje de cliente identificado solo por BSUID (sin waId ni phone). */
function isBsuidOnlyInbound(payload: WatiWebhookPayload) {
  const isOwner = payload.owner === true || payload.owner === "true" || payload.owner === 1 || payload.owner === "1";
  if (!isInboundMessageEvent(payload) || isOwner) return false;
  const hasPhone = [payload.waId, payload.phone].some((v) => typeof v === "string" && v.trim());
  return !hasPhone && typeof payload.bsuid === "string" && Boolean(payload.bsuid.trim());
}

function getInboundTextMessage(payload: WatiWebhookPayload) {
  // WATI also notifies us of messages sent by the business and delivery states.
  // Only a customer text message can start the assistant workflow.
  const isOwner = payload.owner === true || payload.owner === "true" || payload.owner === 1 || payload.owner === "1";
  if (!isInboundMessageEvent(payload) || isOwner || payload.type !== "text") {
    return null;
  }

  const phone = getSenderId(payload);
  const rawText = typeof payload.text === "string" ? payload.text : typeof payload.message === "string" ? payload.message : null;
  const text = rawText?.trim();
  const rawExternalId =
    typeof payload.id === "string"
      ? payload.id
      : typeof payload.messageId === "string"
        ? payload.messageId
        : null;
  const externalId = rawExternalId?.trim() || null;

  if (!phone || !text) return null;
  return { phone, text, externalId };
}

const UNSUPPORTED_MEDIA_REPLY =
  "Por ahora solo puedo leer mensajes de texto 🙂 ¿Me escribes tu consulta y con gusto te ayudo?";

const AUDIO_INBOUND_TYPES = new Set(["audio", "voice", "ptt"]);

const NON_TEXT_INBOUND_TYPES = new Set([
  "audio",
  "voice",
  "ptt",
  "image",
  "video",
  "document",
  "sticker",
  "location",
  "contacts",
]);

/**
 * URL de media del payload, tolerando variantes de nombre. WATI pone la
 * referencia de la media en `data` (objeto o string) y/o en `sourceUrl`.
 */
function extractMediaUrl(payload: WatiWebhookPayload): string | null {
  const candidates: unknown[] = [
    payload.mediaUrl,
    payload.media_url,
    payload.fileUrl,
    payload.url,
    payload.sourceUrl,
    typeof payload.data === "string" ? payload.data : null,
  ];
  if (typeof payload.data === "object" && payload.data !== null) {
    const nested = payload.data as Record<string, unknown>;
    candidates.push(
      nested.mediaUrl,
      nested.media_url,
      nested.fileUrl,
      nested.url,
      nested.link,
      nested.sourceUrl,
      nested.source_url,
    );
  }
  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^https?:\/\//i.test(candidate)) return candidate;
  }
  return null;
}

function getInboundNonTextMessage(payload: WatiWebhookPayload) {
  // Mensaje del cliente que no es texto (audio/imagen/documento…). Sin esto el
  // cliente quedaba en silencio absoluto.
  const isOwner = payload.owner === true || payload.owner === "true" || payload.owner === 1 || payload.owner === "1";
  if (!isInboundMessageEvent(payload) || isOwner) return null;

  const type = typeof payload.type === "string" ? payload.type.toLowerCase() : null;
  if (!type || type === "text" || !NON_TEXT_INBOUND_TYPES.has(type)) return null;

  const phone = getSenderId(payload);
  const rawExternalId =
    typeof payload.id === "string"
      ? payload.id
      : typeof payload.messageId === "string"
        ? payload.messageId
        : null;
  const externalId = rawExternalId?.trim() || null;
  // El endpoint v3 de media acepta "message_id" sin aclarar si es el ID de
  // registro o el WAMID; probamos ambos candidatos.
  const messageIds = [payload.id, payload.messageId, payload.whatsappMessageId]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim());

  if (!phone) return null;
  return { phone, type, externalId, mediaUrl: extractMediaUrl(payload), messageIds };
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(request: Request) {
  if (!isAuthorizedWebhook(request)) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!prisma) {
    return Response.json({ error: "DB no configurada." }, { status: 500 });
  }

  let payload: WatiWebhookPayload;
  try {
    payload = (await request.json()) as WatiWebhookPayload;
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  // Un cliente con teléfono visible puede llegar dos veces: por el evento normal
  // (con waId) y por el BSUID (a veces sin waId). Si este trae solo BSUID le
  // damos ventaja al otro: así el mensaje cae en su conversación de siempre
  // (con su pausa, pedido y opt-out) y este se descarta por externalId, en vez
  // de abrir una conversación paralela que se salte ese estado.
  if (isBsuidOnlyInbound(payload)) {
    await new Promise((resolve) => setTimeout(resolve, BSUID_ONLY_GRACE_MS));
  }

  let incoming = getInboundTextMessage(payload);
  let audioTranscript = false;

  if (!incoming) {
    const media = getInboundNonTextMessage(payload);
    if (!media) {
      // Mensaje de cliente que no supimos procesar: queda rastro (solo la forma
      // del payload, sin contenido) para no volver a perderlo en silencio.
      const isOwner = payload.owner === true || payload.owner === "true" || payload.owner === 1 || payload.owner === "1";
      if (isInboundMessageEvent(payload) && !isOwner) {
        console.warn("WATI_INBOUND_IGNORED", {
          eventType: payload.eventType,
          type: payload.type,
          hasSender: Boolean(getSenderId(payload)),
          keys: Object.keys(payload),
        });
      }
      return Response.json({ received: true });
    }
    if (await isAdvisorPhone(media.phone)) {
      return Response.json({ received: true, advisor: true });
    }

    // Nota de voz: intentamos transcribirla para atenderla como texto normal.
    // 1) URL directa del payload; 2) endpoint binario v3 por ID de mensaje
    // (probando los candidatos de ID hasta que uno responda).
    let transcript = "";
    if (AUDIO_INBOUND_TYPES.has(media.type)) {
      // Cada intento va en su propio try: la URL del payload suele dar 401 y no
      // debe impedir probar el endpoint v3.
      if (media.mediaUrl) {
        try {
          transcript = await transcribeAudioFromUrl(media.mediaUrl);
        } catch (error) {
          console.error("WATI_TRANSCRIBE_URL_FAILED", error);
        }
      }
      for (const messageId of media.messageIds) {
        if (transcript) break;
        try {
          const file = await fetchWatiMedia(messageId);
          if (file) transcript = await transcribeAudioBuffer(file.buffer, file.contentType);
        } catch (error) {
          console.error("WATI_TRANSCRIBE_FAILED", error);
        }
      }
    }

    if (transcript) {
      incoming = { phone: media.phone, text: transcript, externalId: media.externalId };
      audioTranscript = true;
    } else {
      if (
        media.externalId &&
        (await prisma.watiMessage.findUnique({
          where: { externalId: media.externalId },
          select: { id: true },
        }))
      ) {
        return Response.json({ received: true, duplicate: true });
      }

      const mediaName = getSenderName(payload);
      const mediaConversation = await prisma.watiConversation.upsert({
        where: { phone: media.phone },
        update: { updatedAt: new Date(), ...(mediaName ? { contactName: mediaName } : {}) },
        create: {
          phone: media.phone,
          contactName: mediaName,
          assignedSellerId: await pickSellerForNewConversation(),
        },
      });

      try {
        await prisma.watiMessage.create({
          data: {
            externalId: media.externalId,
            conversationId: mediaConversation.id,
            role: "USER",
            content: `📎 (${media.type} recibido)`,
            mediaType: media.type,
          },
        });
      } catch (error) {
        if (media.externalId && isUniqueConstraintError(error)) {
          return Response.json({ received: true, duplicate: true });
        }
        throw error;
      }
      await cancelRemarketingOnReply(mediaConversation.id, "");
      await broadcastPanelUpdate("wati");

      if (mediaConversation.botPaused) {
        return Response.json({ received: true, botPaused: true });
      }

      await prisma.watiMessage.create({
        data: {
          conversationId: mediaConversation.id,
          role: "ASSISTANT",
          content: UNSUPPORTED_MEDIA_REPLY,
        },
      });
      await prisma.watiConversation.update({
        where: { id: mediaConversation.id },
        data: { lastAutoReplyAt: new Date() },
      });
      await broadcastPanelUpdate("wati");
      try {
        await sendWatiMessage(media.phone, UNSUPPORTED_MEDIA_REPLY);
      } catch (error) {
        console.error("WATI_MEDIA_REPLY_SEND_FAILED", mediaConversation.id, error);
      }

      return Response.json({ received: true, nonText: media.type });
    }
  }

  const { phone, text, externalId } = incoming;
  const customerName = getSenderName(payload);

  // Los asesores reciben los avisos en su WhatsApp personal; si responden, el
  // mensaje entra como si fuera de un cliente. No dejamos que el bot les
  // conteste ni que cree pedidos con su número.
  if (await isAdvisorPhone(phone)) {
    return Response.json({ received: true, advisor: true });
  }

  if (
    externalId &&
    (await prisma.watiMessage.findUnique({
      where: { externalId },
      select: { id: true },
    }))
  ) {
    return Response.json({ received: true, duplicate: true });
  }

  let conversation = await prisma.watiConversation.upsert({
    where: { phone },
    update: { updatedAt: new Date(), ...(customerName ? { contactName: customerName } : {}) },
    create: { phone, contactName: customerName, assignedSellerId: await pickSellerForNewConversation() },
  });

  if (!conversation.orderId && conversation.salesStage !== "SOLD") {
    const nextSalesStage = detectSalesStage(text);
    conversation = await prisma.watiConversation.update({
      where: { id: conversation.id },
      data: { status: "ACTIVE", salesStage: nextSalesStage },
    });
  }

  try {
    await prisma.watiMessage.create({
      data: {
        externalId,
        conversationId: conversation.id,
        role: "USER",
        content: audioTranscript ? `🎤 ${text}` : text,
        ...(audioTranscript ? { mediaType: "audio" } : {}),
      },
    });
  } catch (error) {
    // A repeated WATI callback can race the lookup above. The unique message ID
    // makes that retry harmless without discarding legitimate customer replies.
    if (externalId && isUniqueConstraintError(error)) {
      return Response.json({ received: true, duplicate: true });
    }
    throw error;
  }
  await cancelRemarketingOnReply(conversation.id, text);
  // Persist and notify before invoking external services so the panel stays live
  // even if WATI or the assistant is temporarily unavailable.
  await broadcastPanelUpdate("wati");

  if (conversation.botPaused) {
    return Response.json({ received: true, botPaused: true });
  }

  // Moderación: groserías, vulgar/sexual, amenazas. Nunca crea pedido ni envía
  // fotos; a partir de cierto número de avisos pausa el bot y avisa a un asesor.
  const moderation = await classifyMessage(text);
  if (moderation.action !== "ALLOW") {
    const strikes = conversation.moderationStrikes + 1;
    const shouldEscalate =
      moderation.action === "ESCALATE" || strikes >= MAX_MODERATION_STRIKES;
    const moderationReply = shouldEscalate
      ? ESCALATE_REPLY
      : moderation.reply ?? RESPECT_BOUNDARY_REPLY;

    await prisma.watiMessage.create({
      data: { conversationId: conversation.id, role: "ASSISTANT", content: moderationReply },
    });
    await prisma.watiConversation.update({
      where: { id: conversation.id },
      data: {
        moderationStrikes: strikes,
        lastAutoReplyAt: new Date(),
        ...(shouldEscalate ? { botPaused: true } : {}),
      },
    });
    await broadcastPanelUpdate("wati");

    try {
      await sendWatiMessage(phone, moderationReply);
    } catch (error) {
      console.error("WATI_MODERATION_SEND_FAILED", conversation.id, error);
    }

    if (shouldEscalate) {
      await createNotification({
        eventKey: "wati.moderation_escalated",
        title: `WhatsApp: conversación escalada por lenguaje ofensivo (${phone})`,
        detail: `El bot pausó la atención tras detectar ${moderation.category.toLowerCase()} (${strikes} aviso(s)). Un asesor debe continuar por este mismo chat.`,
        href: "/panel/whatsapp",
        targetUserId: conversation.assignedSellerId ?? undefined,
        metadata: {
          conversationId: conversation.id,
          phone,
          category: moderation.category,
          strikes,
        },
      });
      await notifyAdvisor({
        conversationId: conversation.id,
        customerPhone: phone,
        customerName: getSenderName(payload),
        reason: "moderation",
        snippet: text,
        advisorId: conversation.assignedSellerId,
      });
    }

    return Response.json({
      received: true,
      moderated: moderation.category,
      escalated: shouldEscalate,
    });
  }

  const isPostSaleReply =
    conversation.orderId !== null && conversation.salesStage === "SOLD";
  if (isPostSaleReply && isFarewellMessage(text)) {
    await prisma.watiMessage.create({
      data: {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: HUMAN_FAREWELL,
      },
    });
    await prisma.watiConversation.update({
      where: { id: conversation.id },
      data: { botPaused: true, status: "CLOSED" },
    });
    await broadcastPanelUpdate("wati");
    try {
      await sendWatiMessage(phone, HUMAN_FAREWELL);
    } catch (error) {
      console.error("WATI_FAREWELL_SEND_FAILED", conversation.id, error);
    }
    return Response.json({ received: true, farewell: true });
  }

  await prisma.watiConversation.update({
    where: { id: conversation.id },
    data: {
      lastAutoReplyAt: new Date(),
      // Mensaje limpio: se reinician los avisos de moderación. Solo escalamos
      // tras 3 mensajes ofensivos consecutivos, no por uno viejo + leves.
      moderationStrikes: 0,
    },
  });

  // Ventana de contexto: desde el inicio de la venta actual y desde lo último ya
  // resumido en memoria. Los mensajes viejos se resumen de forma rodante.
  const contextStart = conversation.aiContextStartedAt;
  const memoryThrough = conversation.memorySummaryThrough;
  const since =
    contextStart && memoryThrough
      ? contextStart > memoryThrough
        ? contextStart
        : memoryThrough
      : memoryThrough ?? contextStart;

  const recentMessages = (await prisma.watiMessage.findMany({
    where: {
      conversationId: conversation.id,
      ...(since ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  })).reverse();

  // Excluye el mensaje del usuario que se acaba de insertar.
  const priorMessages = recentMessages.slice(0, -1);
  let memorySummary = conversation.memorySummary ?? null;
  let history: Array<{ role: "user" | "assistant"; content: string }>;

  const olderCount = priorMessages.length - WATI_MEMORY_KEEP_RECENT;
  if (olderCount > 0) {
    const older = priorMessages.slice(0, olderCount);
    const recent = priorMessages.slice(olderCount);
    history = recent.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
    try {
      const summary = await summarizeConversation({
        previousSummary: memorySummary,
        messages: older.map((m) => ({
          role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
          content: m.content,
        })),
      });
      if (summary) {
        memorySummary = summary;
        await prisma.watiConversation.update({
          where: { id: conversation.id },
          data: {
            memorySummary: summary,
            memorySummaryThrough: older[older.length - 1].createdAt,
          },
        });
      }
    } catch (error) {
      console.error("WATI_SUMMARY_FAILED", conversation.id, error);
    }
  } else {
    history = priorMessages.map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));
  }

  let reply: string;
  let orderCreated: { orderId: string } | null = null;
  let assistantFailed = false;
  let escalateToHuman = false;
  let escalationSummary: string | null = null;
  const upsellStateBefore = await getUpsellState(conversation.id).catch(() => null);
  try {
    const result = await runWatiAssistant(history, text, {
      allowOrderCreation: !conversation.orderId,
      sellerId: conversation.assignedSellerId,
      customerPhone: phone,
      conversationId: conversation.id,
      customerName,
      memorySummary,
      fromAudio: audioTranscript,
    });
    reply = result.reply;
    orderCreated = result.orderCreated;
    escalateToHuman = result.escalateToHuman;
    escalationSummary = result.escalationSummary;
    if (upsellStateBefore) {
      await recordUpsellTurn(conversation.id, upsellStateBefore, text, result.upsellOffered).catch((error) =>
        console.error("WATI_UPSELL_RECORD_FAILED", conversation.id, error),
      );
    }
  } catch (error) {
    // Nunca dejamos al cliente sin respuesta: si el asistente o Odoo fallan,
    // avisamos que un asesor continúa, pausamos el bot y avisamos al asesor
    // para que la promesa de continuidad no quede sin destinatario.
    console.error("WATI_ASSISTANT_FAILED", conversation.id, error);
    assistantFailed = true;
    reply = "Recibí tu mensaje, pero tuve un problema técnico al procesarlo. Un asesor continuará con tu pedido por este mismo chat en un momento.";
  }

  await prisma.watiMessage.create({
    data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
  });
  await prisma.watiConversation.update({
    where: { id: conversation.id },
    data: {
      commercialStage: detectCommercialStage(conversation.commercialStage, text, reply, Boolean(orderCreated)),
    },
  });

  if (orderCreated) {
    await prisma.watiConversation.update({
      where: { id: conversation.id },
      data: {
        status: "CLOSED",
        salesStage: "SOLD",
        orderId: orderCreated.orderId,
        botPaused: false,
      },
    });
    await broadcastPanelUpdate("orders");
    try {
      await createNotification({
        eventKey: "wati.order_created",
        title: `WhatsApp: nuevo pedido tomado por el asistente (${phone})`,
        detail: `${conversation.phone} · pedido generado por el asistente. Verifica los datos y programa el despacho.`,
        href: "/panel/pedidos",
        targetUserId: conversation.assignedSellerId ?? undefined,
        metadata: { conversationId: conversation.id, orderId: orderCreated.orderId, phone },
      });
    } catch {
      // Notificación no bloqueante.
    }
    const orderInfo = await prisma.order.findUnique({
      where: { id: orderCreated.orderId },
      select: {
        odooOrderName: true,
        subtotal: true,
        shippingCost: true,
        items: { select: { name: true, quantity: true } },
      },
    });
    await notifyAdvisor({
      conversationId: conversation.id,
      customerPhone: phone,
      customerName,
      reason: "sale",
      advisorId: conversation.assignedSellerId,
      orderNumber: orderInfo?.odooOrderName ?? null,
      orderTotal: orderInfo ? orderInfo.subtotal + orderInfo.shippingCost : null,
      orderItems: orderInfo?.items.map((item) =>
        item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name,
      ),
    });
  }

  // Make the reply visible in the panel before attempting the delivery to WATI.
  await broadcastPanelUpdate("wati");
  try {
    await sendWatiMessage(phone, reply);
  } catch (error) {
    // Si WATI rechaza el envío la respuesta ya quedó guardada en el panel. Un
    // reintento del webhook no la reenviaría (dedupe por externalId), así que
    // avisamos al asesor para que la envíe manualmente.
    console.error("WATI_REPLY_SEND_FAILED", conversation.id, error);
    try {
      await createNotification({
        eventKey: "wati.reply_send_failed",
        title: `WhatsApp: no se pudo entregar la respuesta (${phone})`,
        detail:
          "WATI falló al enviar la respuesta del asistente. Revisa el chat y responde manualmente si el cliente no recibió nada.",
        href: "/panel/whatsapp",
        targetUserId: conversation.assignedSellerId ?? undefined,
        metadata: { conversationId: conversation.id, phone },
      });
    } catch {
      // Notificación no bloqueante.
    }
  }

  // Estado estructurado (ciudad, negocio, cantidad…) tras responder, para no demorar la respuesta.
  if (!assistantFailed) {
    try {
      await updateConversationState(conversation.id);
    } catch (error) {
      console.error("WATI_STATE_UPDATE_FAILED", conversation.id, error);
    }
  }

  if (assistantFailed) {
    // La promesa de "un asesor continuará" solo es real si pausamos el bot y
    // avisamos a un asesor (WhatsApp + in-app). No enviamos fotos si falló.
    await prisma.watiConversation.update({
      where: { id: conversation.id },
      data: { botPaused: true },
    });
    await notifyAdvisor({
      conversationId: conversation.id,
      customerPhone: phone,
      customerName,
      reason: "assistant_failed",
      snippet: text,
      advisorId: conversation.assignedSellerId,
    });
    await broadcastPanelUpdate("wati");
    return Response.json({ received: true, assistantFailed: true });
  }

  // Escalada a asesor. Solo la tool explícita de la IA (cliente que pide una
  // persona, reclamo, caso que no puede resolver) pausa el bot. Si la respuesta
  // apenas menciona a un asesor, se le avisa (WhatsApp + in-app) para que esa
  // promesa tenga destinatario, pero la IA sigue atendiendo el chat.
  const mentionEscalation =
    !orderCreated && !assistantFailed && !escalateToHuman && replyRequestsAdvisor(reply);
  // Por simple mención, un solo aviso por conversación cada 24 h.
  const notifyMention =
    mentionEscalation && !(await advisorNotifiedRecently(conversation.id).catch(() => false));
  if (escalateToHuman || notifyMention) {
    if (escalateToHuman) {
      await prisma.watiConversation.update({
        where: { id: conversation.id },
        data: { botPaused: true },
      });
    }
    await notifyAdvisor({
      conversationId: conversation.id,
      customerPhone: phone,
      customerName,
      reason: escalateToHuman ? "human_request" : "advisor_mention",
      snippet: escalationSummary ?? text,
      advisorId: conversation.assignedSellerId,
    });
    await broadcastPanelUpdate("wati");
  }
  const handedOff = escalateToHuman || mentionEscalation;

  // Envía las fotos del producto consultado (no bloquea la respuesta ya enviada).
  try {
    const productMedia =
      orderCreated || isPostSaleReply || handedOff
        ? []
        : await getProductMediaToSend(history, text, reply);
    for (const media of productMedia) {
      try {
        await sendWatiFileFromUrl(phone, media);
      } catch (error) {
        console.error("WATI_PRODUCT_IMAGE_SEND_FAILED", conversation.id, error);
      }
    }
    if (productMedia.length > 0) {
      await prisma.watiMessage.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: [...new Set(productMedia.map((m) => m.marker))].join("\n"),
          mediaType: "image",
          mediaUrls: productMedia.map((m) => m.url),
        },
      });
      await broadcastPanelUpdate("wati");
    }
  } catch (error) {
    console.error("WATI_PRODUCT_MEDIA_LOOKUP_FAILED", conversation.id, error);
  }

  if (isPostSaleReply) {
    await prisma.watiConversation.update({
      where: { id: conversation.id },
      data: { botPaused: true, status: "CLOSED" },
    });
    await broadcastPanelUpdate("wati");
  }

  if (orderCreated) {
    await syncOrderToOdoo(orderCreated.orderId);
    await Promise.all([broadcastPanelUpdate("orders"), broadcastPanelUpdate("wati")]);
  }

  return Response.json({ received: true });
}
