import { SITE_URL } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { runWatiAssistant } from "@/lib/wati-ai";
import { pickSellerForNewConversation } from "@/lib/wati-conversations";
import { sendWatiFileFromUrl, sendWatiMessage, toWatiImageUrl } from "@/lib/wati";
import { getCatalogSnapshot } from "@/lib/chatbot";
import { getProducts, type StoreProduct } from "@/lib/products";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { syncOrderToOdoo } from "@/lib/orders";
import {
  classifyMessage,
  ESCALATE_REPLY,
  RESPECT_BOUNDARY_REPLY,
} from "@/lib/moderation";
import { createNotification } from "@/lib/notifications";

export const maxDuration = 60;

/** Cantidad de advertencias antes de pausar el bot y pasar a un asesor. */
const MAX_MODERATION_STRIKES = 3;

type WatiWebhookPayload = {
  eventType?: unknown;
  owner?: unknown;
  type?: unknown;
  waId?: unknown;
  phone?: unknown;
  text?: unknown;
  message?: unknown;
  id?: unknown;
  messageId?: unknown;
};

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

function isFarewellMessage(message: string) {
  const normalized = normalizeForIntent(message);
  return /\b(gracias|muchas gracias|perfecto|listo|chao|adios|hasta luego|eso es todo)\b/.test(
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

/** Fotos del producto por el que pregunta el cliente. Solo se envían cuando el
 * cliente pide fotos explícitamente; nunca de forma proactiva. Devuelve [] si no
 * pide fotos, no hay producto claro, o el producto no tiene imágenes. */
async function getProductMediaToSend(
  history: ConversationHistory[],
  message: string,
  currentReply: string,
): Promise<ProductMedia[]> {
  const wantsPhotos = PHOTO_REQUEST.test(normalizeForIntent(message));
  if (!wantsPhotos) return [];

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

function getInboundTextMessage(payload: WatiWebhookPayload) {
  // WATI also notifies us of messages sent by the business and delivery states.
  // Only a customer text message can start the assistant workflow.
  const isOwner = payload.owner === true || payload.owner === "true" || payload.owner === 1 || payload.owner === "1";
  if (payload.eventType !== "message" || isOwner || payload.type !== "text") {
    return null;
  }

  const phone = typeof payload.waId === "string" ? payload.waId : typeof payload.phone === "string" ? payload.phone : null;
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

  const incoming = getInboundTextMessage(payload);
  if (!incoming) {
    return Response.json({ received: true });
  }

  const { phone, text, externalId } = incoming;

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
    update: { updatedAt: new Date() },
    create: { phone, assignedSellerId: await pickSellerForNewConversation() },
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
        content: text,
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
    await sendWatiMessage(phone, HUMAN_FAREWELL);
    return Response.json({ received: true, farewell: true });
  }

  await prisma.watiConversation.update({
    where: { id: conversation.id },
    data: { lastAutoReplyAt: new Date() },
  });

  const previousMessages = (await prisma.watiMessage.findMany({
    where: {
      conversationId: conversation.id,
      ...(conversation.aiContextStartedAt
        ? { createdAt: { gte: conversation.aiContextStartedAt } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  })).reverse();

  const history = previousMessages
    .slice(0, -1)
    .map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }));

  let reply: string;
  let orderCreated: { orderId: string } | null = null;
  try {
    const result = await runWatiAssistant(history, text, {
      allowOrderCreation: !conversation.orderId,
      sellerId: conversation.assignedSellerId,
    });
    reply = result.reply;
    orderCreated = result.orderCreated;
  } catch (error) {
    // Nunca dejamos al cliente sin respuesta: si el asistente o Odoo fallan,
    // avisamos que un asesor continúa y registramos el error.
    console.error("WATI_ASSISTANT_FAILED", conversation.id, error);
    reply = "Recibí tu mensaje, pero tuve un problema técnico al procesarlo. Un asesor continuará con tu pedido por este mismo chat en un momento.";
  }

  await prisma.watiMessage.create({
    data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
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
  }

  // Make the reply visible in the panel before attempting the delivery to WATI.
  await broadcastPanelUpdate("wati");
  await sendWatiMessage(phone, reply);

  // Envía las fotos del producto consultado (no bloquea la respuesta ya enviada).
  try {
    const productMedia = orderCreated || isPostSaleReply ? [] : await getProductMediaToSend(history, text, reply);
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
          content: productMedia[0].marker,
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
