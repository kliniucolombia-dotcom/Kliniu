import { prisma } from "@/lib/prisma";
import { getWatiTemplates, sendWatiMessage, sendWatiTemplateMessage } from "@/lib/wati";

function normalizeWhatsappPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const normalized = digits.length === 10 ? `57${digits}` : digits;
  if (normalized.length < 8 || normalized.length > 15) {
    throw new Error("INVALID_PHONE");
  }
  return normalized;
}

function renderTemplate(
  body: string,
  parameters: Array<{ name: string; value: string }>,
) {
  const values = new Map(parameters.map((parameter) => [parameter.name, parameter.value]));
  return body.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => values.get(key.trim()) ?? `{{${key}}}`);
}

export async function getAllWatiConversations() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const conversations = await prisma.watiConversation.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  const orderIds = conversations.flatMap((conversation) =>
    conversation.orderId ? [conversation.orderId] : [],
  );
  const orders = orderIds.length > 0
    ? await prisma.order.findMany({
        where: { id: { in: orderIds } },
        select: {
          id: true,
          odooOrderId: true,
          odooOrderName: true,
          odooSyncStatus: true,
          odooSyncError: true,
        },
      })
    : [];
  const ordersById = new Map(orders.map((order) => [order.id, order]));

  return conversations.map((c) => {
    const order = c.orderId ? ordersById.get(c.orderId) : null;
    return {
    id: c.id,
    phone: c.phone,
    status: c.status,
    salesStage: c.salesStage,
    notes: c.notes,
    botPaused: c.botPaused,
    orderId: c.orderId,
    odooOrderId: order?.odooOrderId ?? null,
    odooOrderName: order?.odooOrderName ?? null,
    odooSyncStatus: order?.odooSyncStatus ?? "NOT_SYNCED",
    odooSyncError: order?.odooSyncError ?? null,
    followUpSentAt: c.followUpSentAt,
    updatedAt: c.updatedAt,
    lastMessage: c.messages[0] ?? null,
    };
  });
}

export const WATI_SALES_STAGES = ["NEW", "IN_PROGRESS", "FOLLOW_UP", "SOLD"] as const;
export type WatiSalesStage = (typeof WATI_SALES_STAGES)[number];

export async function updateWatiConversationStage(conversationId: string, salesStage: WatiSalesStage) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!WATI_SALES_STAGES.includes(salesStage)) throw new Error("INVALID_SALES_STAGE");

  const current = await prisma.watiConversation.findUnique({
    where: { id: conversationId },
    select: { orderId: true },
  });
  if (!current) throw new Error("CONVERSATION_NOT_FOUND");
  if (current.orderId && salesStage !== "SOLD") {
    throw new Error("ORDER_LINKED_STAGE_LOCKED");
  }

  return prisma.watiConversation.update({
    where: { id: conversationId },
    data:
      salesStage === "SOLD"
        ? { salesStage, status: "CLOSED", botPaused: true }
        : { salesStage, status: "ACTIVE" },
  });
}

export async function updateWatiConversationNotes(conversationId: string, notes: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma.watiConversation.update({
    where: { id: conversationId },
    data: { notes: notes.trim().slice(0, 2000) || null },
  });
}

export async function updateWatiConversationBotPaused(conversationId: string, botPaused: boolean) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const current = await prisma.watiConversation.findUnique({
    where: { id: conversationId },
    select: { orderId: true, salesStage: true },
  });
  if (!current) throw new Error("CONVERSATION_NOT_FOUND");

  const startsNewSale =
    !botPaused && (current.orderId !== null || current.salesStage === "SOLD");

  return prisma.watiConversation.update({
    where: { id: conversationId },
    data: startsNewSale
      ? {
          botPaused: false,
          status: "ACTIVE",
          salesStage: "NEW",
          orderId: null,
          aiContextStartedAt: new Date(),
          lastAutoReplyAt: null,
          comboImageSentAt: null,
          comboVideoSentAt: null,
          followUpSentAt: null,
        }
      : { botPaused },
  });
}

export async function getWatiConversationMessages(conversationId: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const conversation = await prisma.watiConversation.findUnique({
    where: { id: conversationId },
    include: {
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");

  return conversation;
}

export async function sendAgentReply(conversationId: string, text: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const conversation = await prisma.watiConversation.findUnique({ where: { id: conversationId } });
  if (!conversation) throw new Error("CONVERSATION_NOT_FOUND");

  await sendWatiMessage(conversation.phone, text);

  const message = await prisma.watiMessage.create({
    data: { conversationId, role: "AGENT", content: text },
  });

  await prisma.watiConversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  return message;
}

export type StartWatiConversationInput =
  | { mode: "session"; phone: string; text: string }
  | {
      mode: "template";
      phone: string;
      templateName: string;
      parameters: Array<{ name: string; value: string }>;
    };

export async function startWatiConversation(input: StartWatiConversationInput) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const phone = normalizeWhatsappPhone(input.phone);
  let storedContent: string;

  if (input.mode === "session") {
    const text = input.text.trim();
    if (!text) throw new Error("EMPTY_MESSAGE");
    await sendWatiMessage(phone, text);
    storedContent = text;
  } else {
    const templates = await getWatiTemplates();
    const template = templates.find((item) => item.name === input.templateName);
    if (!template) throw new Error("TEMPLATE_NOT_FOUND");

    const values = new Map(input.parameters.map((parameter) => [parameter.name, parameter.value.trim()]));
    const missingParameter = template.parameters.find((parameter) => !values.get(parameter.name));
    if (missingParameter) throw new Error(`TEMPLATE_PARAMETER_REQUIRED:${missingParameter.name}`);

    const parameters = template.parameters.map((parameter) => ({
      name: parameter.name,
      value: values.get(parameter.name)!,
    }));
    await sendWatiTemplateMessage(phone, template.name, parameters);
    storedContent = `Plantilla: ${template.name}\n${renderTemplate(template.bodyOriginal, parameters)}`;
  }

  const existingConversation = await prisma.watiConversation.findUnique({
    where: { phone },
    select: { id: true, orderId: true, salesStage: true },
  });
  const startsNewSale = Boolean(
    existingConversation?.orderId || existingConversation?.salesStage === "SOLD",
  );
  const conversation = existingConversation
    ? await prisma.watiConversation.update({
        where: { id: existingConversation.id },
        data: startsNewSale
          ? {
              status: "ACTIVE",
              salesStage: "NEW",
              botPaused: false,
              orderId: null,
              aiContextStartedAt: new Date(),
              lastAutoReplyAt: null,
              comboImageSentAt: null,
              comboVideoSentAt: null,
              followUpSentAt: null,
            }
          : { status: "ACTIVE", updatedAt: new Date() },
      })
    : await prisma.watiConversation.create({ data: { phone } });

  await prisma.watiMessage.create({
    data: { conversationId: conversation.id, role: "AGENT", content: storedContent },
  });

  await prisma.watiConversation.update({
    where: { id: conversation.id },
    data: { updatedAt: new Date() },
  });

  return getWatiConversationMessages(conversation.id);
}
