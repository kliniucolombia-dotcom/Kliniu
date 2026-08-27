import { SITE_URL } from "@/lib/site";
import { prisma } from "@/lib/prisma";
import { runWatiAssistant } from "@/lib/wati-ai";
import { sendWatiFileFromUrl, sendWatiMessage } from "@/lib/wati";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { syncOrderToOdoo } from "@/lib/orders";

export const maxDuration = 60;

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

type ConversationHistory = {
  role: "user" | "assistant";
  content: string;
};

const COMBO_MEDIA = {
  image: {
    url: `${SITE_URL}/whatsapp/combo-premium-kliniu.jpg`,
    fileName: "combo-premium-kliniu.jpg",
    caption: "📷 Combo Premium Kliniu · $309.900 COP",
    panelMessage: "📷 Imagen del Combo Premium enviada.",
  },
  video: {
    url: `${SITE_URL}/whatsapp/combo-premium-kliniu.mp4`,
    fileName: "combo-premium-kliniu.mp4",
    caption: "🎥 Mira el Combo Premium Kliniu en detalle.",
    panelMessage: "🎥 Video del Combo Premium enviado.",
  },
} as const;

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

function getRequestedComboMedia(history: ConversationHistory[], message: string) {
  const normalized = normalizeForIntent(message);
  const asksForImage = /\b(foto|fotos|imagen|imagenes|fotografia|fotografias)\b/.test(normalized);
  const asksForVideo = /\b(video|videos|grabacion|grabaciones)\b/.test(normalized);

  if (asksForImage || asksForVideo) {
    return [
      ...(asksForImage ? (["image"] as const) : []),
      ...(asksForVideo ? (["video"] as const) : []),
    ];
  }

  const asksAboutCombo =
    /\b(combo|dispensador|dispensadores|acero inoxidable|anuncio)\b/.test(normalized);
  const mediaWasAlreadySent = history.some(
    ({ content }) =>
      content.includes(COMBO_MEDIA.image.panelMessage) ||
      content.includes(COMBO_MEDIA.video.panelMessage),
  );

  return asksAboutCombo && !mediaWasAlreadySent
    ? (["image"] as const)
    : ([] as const);
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
    create: { phone },
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

  const requestedMedia = getRequestedComboMedia(history, text);
  const { reply, orderCreated } = await runWatiAssistant(history, text, {
    allowOrderCreation: !conversation.orderId,
  });

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

  for (const mediaType of requestedMedia) {
    const media = COMBO_MEDIA[mediaType];
    const mediaClaim = mediaType === "image"
      ? await prisma.watiConversation.updateMany({
          where: { id: conversation.id, comboImageSentAt: null },
          data: { comboImageSentAt: new Date() },
        })
      : await prisma.watiConversation.updateMany({
          where: { id: conversation.id, comboVideoSentAt: null },
          data: { comboVideoSentAt: new Date() },
        });
    if (mediaClaim.count === 0) continue;
    try {
      await sendWatiFileFromUrl(phone, media);
      await prisma.watiMessage.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: media.panelMessage,
        },
      });
      await broadcastPanelUpdate("wati");
    } catch (error) {
      await prisma.watiConversation.update({
        where: { id: conversation.id },
        data: mediaType === "image" ? { comboImageSentAt: null } : { comboVideoSentAt: null },
      });
      console.error(`WATI_${mediaType.toUpperCase()}_SEND_FAILED`, error);
    }
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
