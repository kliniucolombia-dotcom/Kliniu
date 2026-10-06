import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { sendWatiMessage } from "@/lib/wati";
import { createNotification } from "@/lib/notifications";

export type WatiEscalationReason =
  | "human_request"
  | "advisor_mention"
  | "moderation"
  | "assistant_failed"
  | "unattended"
  | "sale";

const REASON_LABEL: Record<WatiEscalationReason, string> = {
  human_request: "la IA pidió apoyo humano",
  advisor_mention: "la respuesta ofreció pasar con un asesor",
  moderation: "lenguaje ofensivo o amenazas",
  assistant_failed: "fallo técnico del asistente",
  unattended: "el cliente lleva más de 1 hora esperando a un asesor",
  sale: "venta cerrada por la IA",
};

const REASON_TITLE: Record<WatiEscalationReason, string> = {
  human_request: "cliente requiere asesor",
  advisor_mention: "cliente derivado a asesor",
  moderation: "conversación escalada por moderación",
  assistant_failed: "fallo técnico, requiere asesor",
  unattended: "cliente sigue esperando asesor",
  sale: "venta cerrada por la IA",
};

function firstName(value: string | null | undefined) {
  return value?.trim().split(/\s+/)[0] || null;
}

function buildAdvisorMessage(input: {
  advisorName: string | null;
  reason: WatiEscalationReason;
  customerPhone: string;
  customerName?: string | null;
  snippet?: string | null;
  orderNumber?: string | null;
  orderTotal?: number | null;
  orderItems?: string[] | null;
}) {
  const lines: string[] = [];
  const greeting = firstName(input.advisorName);
  if (greeting) lines.push(`Hola ${greeting},`);

  lines.push(
    input.reason === "sale"
      ? "🎉 Venta cerrada por la IA de WhatsApp"
      : "⚠️ Posible cliente de WATI necesita un vendedor",
    `Motivo: ${REASON_LABEL[input.reason]}`,
    input.customerName
      ? `Cliente: ${input.customerName} · ${input.customerPhone}`
      : `Cliente: ${input.customerPhone}`,
  );

  if (input.reason === "sale") {
    if (input.orderNumber) lines.push(`Pedido: ${input.orderNumber}`);
    if (input.orderItems?.length) lines.push(`Productos: ${input.orderItems.join(", ")}`);
    if (typeof input.orderTotal === "number") {
      lines.push(`Total: $${input.orderTotal.toLocaleString("es-CO")}`);
    }
  } else if (input.snippet) {
    lines.push(`Último mensaje: "${input.snippet.replace(/\s+/g, " ").trim().slice(0, 180)}"`);
  }

  lines.push(`Atiéndelo en: ${SITE_URL}/panel/whatsapp`);
  return lines.join("\n");
}

/**
 * Avisa por WhatsApp (WATI) a un asesor elegido al azar entre los SELLER que
 * tienen `whatsappPhone`. Si el envío falla (p. ej. sin ventana de 24h), deja
 * una notificación in-app como respaldo. Nunca lanza.
 */
const ADVISOR_NOTICE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * ¿Ya se avisó a un asesor por esta conversación en las últimas 24 h? Acota los
 * avisos por simple mención: como esa mención ya no pausa el bot, sin este
 * límite cada respuesta podría generar otro WhatsApp al vendedor.
 */
export async function advisorNotifiedRecently(conversationId: string) {
  if (!prisma) return false;
  const recent = await prisma.notification.findFirst({
    where: {
      type: "wati",
      category: "advisor_request",
      createdAt: { gt: new Date(Date.now() - ADVISOR_NOTICE_COOLDOWN_MS) },
      metadata: { path: ["conversationId"], equals: conversationId },
    },
    select: { id: true },
  });
  return Boolean(recent);
}

export async function notifyAdvisor(input: {
  conversationId: string;
  customerPhone: string;
  reason: WatiEscalationReason;
  snippet?: string | null;
  advisorId?: string | null;
  customerName?: string | null;
  orderNumber?: string | null;
  orderTotal?: number | null;
  orderItems?: string[] | null;
}) {
  if (!prisma) return null;

  const { conversationId, customerPhone, reason, snippet } = input;

  const advisors = await prisma.user.findMany({
    where: { role: "SELLER", whatsappPhone: { not: null } },
    select: { id: true, fullName: true, whatsappPhone: true },
  });
  if (advisors.length === 0) return null;

  // Asignado con preferencia (si tiene WhatsApp); si no, random entre los 3.
  const preferred = input.advisorId
    ? advisors.find((advisor) => advisor.id === input.advisorId)
    : undefined;
  const advisor = preferred ?? advisors[Math.floor(Math.random() * advisors.length)];
  const advisorPhone = advisor.whatsappPhone!;

  let delivered = false;
  try {
    await sendWatiMessage(
      advisorPhone,
      buildAdvisorMessage({
        advisorName: advisor.fullName,
        reason,
        customerPhone,
        customerName: input.customerName,
        snippet,
        orderNumber: input.orderNumber,
        orderTotal: input.orderTotal,
        orderItems: input.orderItems,
      }),
    );
    delivered = true;
  } catch (error) {
    console.error("WATI_ADVISOR_NOTIFY_FAILED", conversationId, error);
  }

  const isSale = reason === "sale";
  const saleBits: string[] = [];
  if (input.orderNumber) saleBits.push(`Pedido ${input.orderNumber}`);
  if (input.orderItems?.length) saleBits.push(input.orderItems.join(", "));
  if (typeof input.orderTotal === "number") {
    saleBits.push(`$${input.orderTotal.toLocaleString("es-CO")}`);
  }

  try {
    await createNotification({
      // Venta: broadcast a admins + vendedores (targetRoles de wati.order_created).
      // Resto: solo al asesor asignado.
      eventKey: isSale ? "wati.order_created" : "wati.advisor_request",
      title: isSale
        ? `🎉 WhatsApp: venta cerrada por la IA (${customerPhone})`
        : `WhatsApp: ${REASON_TITLE[reason]} (${customerPhone})`,
      detail: isSale
        ? `Venta por WhatsApp${saleBits.length ? `: ${saleBits.join(" · ")}` : ""}. Cliente: ${
            input.customerName ?? customerPhone
          }. Asignada a ${advisor.fullName ?? "un asesor"} para confirmar el despacho.`
        : `${REASON_LABEL[reason]}. Asignado a ${advisor.fullName ?? "un asesor"}.${
            delivered ? "" : " No se pudo enviar el WhatsApp al asesor; revísalo en el panel."
          }`,
      href: "/panel/whatsapp",
      targetUserId: isSale ? undefined : advisor.id,
      metadata: {
        conversationId,
        customerPhone,
        reason,
        delivered,
        advisorId: advisor.id,
        orderNumber: input.orderNumber ?? null,
        orderItems: input.orderItems ?? null,
        orderTotal: input.orderTotal ?? null,
      },
    });
  } catch {
    // La notificación in-app no debe tumbar el flujo.
  }

  return { advisorId: advisor.id, delivered };
}

/** Últimos `length` dígitos de un teléfono (robusto ante prefijo de país). */
export function digitsTail(value: string, length = 10) {
  return value.replace(/\D/g, "").slice(-length);
}

/** ¿El teléfono corresponde a alguno de los números de asesor? (puro, testeable). */
export function matchesAdvisorPhone(
  phone: string,
  advisorPhones: Array<string | null | undefined>,
) {
  const tail = digitsTail(phone);
  if (tail.length < 7) return false;
  return advisorPhones.some((candidate) => candidate && digitsTail(candidate) === tail);
}

/**
 * ¿El mensaje entrante viene de un asesor? Evita que el bot le responda como si
 * fuera cliente (el asesor recibe y responde desde su WhatsApp personal).
 */
export async function isAdvisorPhone(phone: string): Promise<boolean> {
  if (!prisma) return false;
  const advisors = await prisma.user.findMany({
    where: { role: "SELLER", whatsappPhone: { not: null } },
    select: { whatsappPhone: true },
  });
  return matchesAdvisorPhone(phone, advisors.map((advisor) => advisor.whatsappPhone));
}

/** Frase de handoff en la respuesta de la IA (conservador para no sobre-escalar). */
const ADVISOR_WORD = /\basesor(?:a|es)?\b/;
const HANDOFF_VERB = /(continuar|contactar|comunicar|ayudar|revisar|gestionar|derivar|transferir|atiend|escalar)/;

export function replyRequestsAdvisor(reply: string) {
  const normalized = reply
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return ADVISOR_WORD.test(normalized) && HANDOFF_VERB.test(normalized);
}

const UNATTENDED_AFTER_MS = 60 * 60 * 1000;
const UNATTENDED_MAX_AGE_MS = 48 * 60 * 60 * 1000;

/**
 * ¿Toca recordarle al asesor este chat pausado? Solo si nadie del equipo ha
 * respondido tras el último mensaje, ya pasó 1 h y es horario laboral en
 * Bogotá (lun–sáb, 8:00–18:00). Puro, testeable.
 */
export function needsAdvisorReminder(last: { role: string; createdAt: Date } | undefined, now: Date) {
  if (!last || last.role === "AGENT") return false;
  const waited = now.getTime() - last.createdAt.getTime();
  if (waited < UNATTENDED_AFTER_MS || waited > UNATTENDED_MAX_AGE_MS) return false;
  // Colombia es UTC-5 fijo (sin horario de verano).
  const bogota = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  return bogota.getUTCDay() !== 0 && bogota.getUTCHours() >= 8 && bogota.getUTCHours() < 18;
}

/**
 * Chats que el bot pasó a un asesor y nadie atendió: re-avisa una sola vez por
 * cada espera (hasta que el cliente o el asesor vuelvan a escribir). Lo llama el cron.
 */
export async function remindUnattendedEscalations(now = new Date()) {
  if (!prisma) return { reminded: 0 };
  const conversations = await prisma.watiConversation.findMany({
    where: {
      botPaused: true,
      status: "ACTIVE",
      orderId: null,
      updatedAt: { gte: new Date(now.getTime() - UNATTENDED_MAX_AGE_MS) },
    },
    select: {
      id: true,
      phone: true,
      contactName: true,
      assignedSellerId: true,
      messages: { orderBy: { createdAt: "desc" }, take: 5, select: { role: true, content: true, createdAt: true } },
    },
    take: 50,
  });

  let reminded = 0;
  for (const conversation of conversations) {
    const last = conversation.messages[0];
    if (!needsAdvisorReminder(last, now)) continue;

    const already = await prisma.notification.findFirst({
      where: {
        type: "wati",
        category: "advisor_request",
        createdAt: { gt: last.createdAt },
        AND: [
          { metadata: { path: ["conversationId"], equals: conversation.id } },
          { metadata: { path: ["reason"], equals: "unattended" } },
        ],
      },
      select: { id: true },
    });
    if (already) continue;

    await notifyAdvisor({
      conversationId: conversation.id,
      customerPhone: conversation.phone,
      customerName: conversation.contactName,
      reason: "unattended",
      snippet: conversation.messages.find((m) => m.role === "USER")?.content ?? null,
      advisorId: conversation.assignedSellerId,
    });
    reminded += 1;
  }
  return { reminded };
}
