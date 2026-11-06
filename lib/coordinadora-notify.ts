import { Resend } from "resend";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { sendWatiMessage } from "@/lib/wati";
import { WHATSAPP_WINDOW_MS, WINDOW_SAFETY_MS } from "@/lib/wati-followup";

// Fase 4 Coordinadora: avisos al cliente por cambios de estado de la guía.
// Correo siempre; WhatsApp solo dentro de la ventana de 24 h (fuera, WhatsApp exige plantilla).
// El WhatsApp de "despachado" ya lo manda sendShippedMessage (lib/wati-followup.ts).

export type CustomerNoticeKind = "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const AUDIT_ACTION = "order.customer_notice";

export function coordinadoraTrackingUrl(guia: string) {
  return `https://coordinadora.com/rastreo/rastreo-de-guia/detalle-de-rastreo-de-guia/?guia=${encodeURIComponent(guia)}`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function copy(kind: CustomerNoticeKind, firstName: string, guia: string) {
  const link = coordinadoraTrackingUrl(guia);
  if (kind === "SHIPPED") {
    return {
      subject: `Tu pedido KLINIU va en camino · Guía ${guia}`,
      title: "Tu pedido ya fue despachado",
      body: `Hola ${firstName}, tu pedido salió con Coordinadora. Tu número de guía es ${guia}.`,
      whatsapp: null, // lo envía sendShippedMessage
      link,
    };
  }
  if (kind === "OUT_FOR_DELIVERY") {
    return {
      subject: `Tu pedido KLINIU sale hoy a reparto · Guía ${guia}`,
      title: "Tu pedido sale hoy a reparto",
      body: `Hola ${firstName}, Coordinadora tiene tu pedido en reparto y lo entregará hoy en la dirección registrada.`,
      whatsapp: `Hola ${firstName}, tu pedido de KLINIU (guía ${guia}) sale hoy a reparto con Coordinadora. Puedes seguirlo aquí: ${link}`,
      link,
    };
  }
  return {
    subject: `Tu pedido KLINIU fue entregado · Guía ${guia}`,
    title: "Tu pedido fue entregado",
    body: `Hola ${firstName}, Coordinadora confirmó la entrega de tu pedido. Gracias por confiar en KLINIU.`,
    whatsapp: `Hola ${firstName}, Coordinadora confirmó la entrega de tu pedido de KLINIU (guía ${guia}). ¡Gracias por tu compra!`,
    link,
  };
}

function html(c: ReturnType<typeof copy>, guia: string) {
  return `<!doctype html><html><body style="margin:0;background:#F4F6F8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 12px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#0C535B;padding:20px 24px;color:#fff;font-size:18px;font-weight:bold;">KLINIU</td></tr>
      <tr><td style="padding:24px;">
        <h1 style="margin:0 0 12px;font-size:20px;color:#0C535B;">${esc(c.title)}</h1>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#333;">${esc(c.body)}</p>
        <p style="margin:0 0 20px;font-size:13px;color:#6e7379;">Transportadora: Coordinadora · Guía <strong style="color:#1A1A1A;">${esc(guia)}</strong></p>
        <a href="${esc(c.link)}" style="display:inline-block;background:#27B1B8;color:#fff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 22px;border-radius:999px;">Rastrear mi pedido</a>
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/** Avisa al cliente una sola vez por pedido y tipo (deduplicado con la auditoría). */
export async function notifyCustomer(orderId: string, kind: CustomerNoticeKind, now = new Date()) {
  if (!prisma) return;
  const sent = await prisma.auditLog.findFirst({
    where: { action: AUDIT_ACTION, entityId: orderId, meta: { path: ["kind"], equals: kind } },
    select: { id: true },
  });
  if (sent) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerName: true, customerEmail: true, customerPhone: true, carrier: true, trackingNumber: true },
  });
  if (!order?.trackingNumber || order.carrier !== "Coordinadora") return;

  // Se registra antes de enviar: si dos webhooks llegan a la vez, como mucho se duplica uno.
  await logAudit({ actorEmail: "webhook:coordinadora", action: AUDIT_ACTION, entity: "order", entityId: orderId, meta: { kind } });

  const firstName = order.customerName.trim().split(/\s+/)[0] || "";
  const c = copy(kind, firstName, order.trackingNumber);

  if (resend && order.customerEmail) {
    try {
      // Resend no lanza: devuelve { error }.
      const { error } = await resend.emails.send({
        from: "Kliniu <contacto@kliniu.com>",
        to: order.customerEmail,
        subject: c.subject,
        html: html(c, order.trackingNumber),
      });
      if (error) console.error("COORDINADORA_NOTICE_EMAIL_FAILED", orderId, kind, error.message);
    } catch (e) {
      console.error("COORDINADORA_NOTICE_EMAIL_FAILED", orderId, kind, e);
    }
  }

  if (!c.whatsapp) return;
  const conversation = await findCustomerConversation(orderId, order.customerPhone);
  const lastUser = conversation?.messages[0]?.createdAt;
  if (!conversation || !lastUser || now.getTime() - lastUser.getTime() > WHATSAPP_WINDOW_MS - WINDOW_SAFETY_MS) return;
  try {
    await sendWatiMessage(conversation.phone, c.whatsapp);
    await prisma.watiMessage.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: c.whatsapp } });
    await broadcastPanelUpdate("wati");
  } catch (e) {
    console.error("COORDINADORA_NOTICE_WATI_FAILED", orderId, kind, e);
  }
}

/**
 * Chat de WhatsApp del cliente: manda el ligado al pedido; por teléfono solo con un celular
 * completo (10 dígitos), para no escribirle a otro cliente cuyo número termine igual.
 */
export async function findCustomerConversation(orderId: string, customerPhone: string) {
  if (!prisma) return null;
  const phone = customerPhone.replace(/\D/g, "");
  const select = { id: true, phone: true, messages: { where: { role: "USER" as const }, orderBy: { createdAt: "desc" as const }, take: 1, select: { createdAt: true } } };
  return (
    (await prisma.watiConversation.findFirst({ where: { orderId }, select })) ??
    (phone.length >= 10
      ? await prisma.watiConversation.findFirst({ where: { phone: { endsWith: phone.slice(-10) } }, orderBy: { updatedAt: "desc" }, select })
      : null)
  );
}

/** Novedad de Coordinadora: la resuelve el equipo, no se le escribe al cliente. */
export async function notifyNovelty(orderId: string, line: string) {
  if (!prisma) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerName: true, trackingNumber: true, assignedSellerId: true },
  });
  if (!order) return;
  await createNotification({
    eventKey: "logistics.carrier_novelty",
    title: `Novedad Coordinadora: ${order.customerName} (guía ${order.trackingNumber ?? ""})`,
    detail: line,
    href: "/panel/pedidos",
    ...(order.assignedSellerId ? { targetUserId: order.assignedSellerId, targetRoles: [] } : {}),
    metadata: { orderId: order.id },
  });
}
