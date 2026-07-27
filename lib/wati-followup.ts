import { prisma } from "@/lib/prisma";
import { sendWatiMessage } from "@/lib/wati";
import { broadcastPanelUpdate } from "@/lib/realtime";

const FOLLOW_UP_DELAY_MS = 10 * 60 * 1000;
const FOLLOW_UP_MESSAGE = "👋 Hola, ¿sigues ahí? Si tienes alguna duda sobre nuestros productos, con gusto te ayudo.";

type EligibleConversation = {
  id: string;
  phone: string;
  messages: Array<{ role: "USER" | "ASSISTANT" | "AGENT"; createdAt: Date }>;
};

export async function sendPendingWatiFollowUps(now = new Date()) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const cutoff = new Date(now.getTime() - FOLLOW_UP_DELAY_MS);
  const conversations = (await prisma.watiConversation.findMany({
    where: {
      status: "ACTIVE",
      orderId: null,
      followUpSentAt: null,
      updatedAt: { lte: cutoff },
    },
    select: {
      id: true,
      phone: true,
      messages: {
        orderBy: { createdAt: "desc" },
        take: 2,
        select: { role: true, createdAt: true },
      },
    },
    take: 100,
  })) as EligibleConversation[];

  let sent = 0;
  let failed = 0;

  for (const conversation of conversations) {
    const [lastMessage, previousMessage] = conversation.messages;
    const shouldFollowUp =
      (lastMessage?.role === "ASSISTANT" || lastMessage?.role === "AGENT") &&
      previousMessage?.role === "USER" &&
      lastMessage.createdAt <= cutoff;

    if (!shouldFollowUp) continue;

    const claimed = await prisma.watiConversation.updateMany({
      where: { id: conversation.id, followUpSentAt: null },
      data: { followUpSentAt: now },
    });
    if (claimed.count === 0) continue;

    try {
      await sendWatiMessage(conversation.phone, FOLLOW_UP_MESSAGE);
      await prisma.watiMessage.create({
        data: {
          conversationId: conversation.id,
          role: "ASSISTANT",
          content: "Seguimiento automático · " + FOLLOW_UP_MESSAGE,
        },
      });
      sent += 1;
    } catch (error) {
      failed += 1;
      console.error("WATI_FOLLOW_UP_FAILED", conversation.id, error);
      await prisma.watiConversation.update({
        where: { id: conversation.id },
        data: { followUpSentAt: null },
      });
    }
  }

  if (sent > 0) await broadcastPanelUpdate("wati");
  return { scanned: conversations.length, sent, failed };
}
