import { prisma } from "@/lib/prisma";
import { runWatiAssistant } from "@/lib/wati-ai";
import { sendWatiMessage } from "@/lib/wati";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST(request: Request) {
  const secret = request.headers.get("x-wati-webhook-secret");
  if (secret !== process.env.WATI_WEBHOOK_SECRET) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!prisma) {
    return Response.json({ error: "DB no configurada." }, { status: 500 });
  }

  const payload = await request.json();
  const phone: string = payload.waId ?? payload.phone;
  const text: string = payload.text ?? payload.message;

  if (!phone || !text) {
    return Response.json({ received: true });
  }

  const conversation = await prisma.watiConversation.upsert({
    where: { phone },
    update: {},
    create: { phone },
  });

  await prisma.watiMessage.create({
    data: { conversationId: conversation.id, role: "USER", content: text },
  });

  const previousMessages = await prisma.watiMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  const history = previousMessages
    .slice(0, -1)
    .map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content }));

  const { reply, orderCreated } = await runWatiAssistant(history, text);

  await prisma.watiMessage.create({
    data: { conversationId: conversation.id, role: "ASSISTANT", content: reply },
  });

  if (orderCreated) {
    await prisma.watiConversation.update({
      where: { id: conversation.id },
      data: { status: "CLOSED", orderId: orderCreated.orderId },
    });
  }

  await sendWatiMessage(phone, reply);
  await broadcastPanelUpdate("wati");

  return Response.json({ received: true });
}
