import { prisma } from "@/lib/prisma";
import { sendWatiMessage } from "@/lib/wati";

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

  return conversations.map((c) => ({
    id: c.id,
    phone: c.phone,
    status: c.status,
    orderId: c.orderId,
    updatedAt: c.updatedAt,
    lastMessage: c.messages[0] ?? null,
  }));
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
