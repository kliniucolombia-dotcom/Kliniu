import { prisma } from "@/lib/prisma";
import { sendWatiMessage } from "@/lib/wati";
import { createNotification } from "@/lib/notifications";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { SITE_URL } from "@/lib/site";
import { WHATSAPP_WINDOW_MS, WINDOW_SAFETY_MS } from "@/lib/wati-followup";
import { ensureOrderTrackToken, geocodePendingOrders, STOP_ORDER_BY } from "@/lib/logistics";
import { haversineKm } from "@/lib/tracking";

const NEAR_KM = 0.5;
const MAX_ACCURACY_M = 100;

type NoticeKind = "EN_ROUTE" | "NEAR";

function digits(phone: string) {
  return phone.replace(/\D/g, "");
}

/**
 * Avisa al cliente. Dentro de la ventana de 24 h del chat de WhatsApp se envía solo; fuera de ella
 * (o en pedidos sin chat) WhatsApp no permite texto libre, así que se avisa al vendedor con el texto y el enlace.
 */
async function sendCustomerNotice(orderId: string, kind: NoticeKind, now = new Date()) {
  if (!prisma) return;
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, customerName: true, customerPhone: true, assignedSellerId: true, deliveryRoute: { select: { driver: { select: { fullName: true } } } } },
  });
  if (!order) return;

  const token = await ensureOrderTrackToken(order.id);
  const link = `${SITE_URL}/seguimiento/${token}`;
  const firstName = order.customerName.trim().split(/\s+/)[0];
  const text =
    kind === "EN_ROUTE"
      ? `Hola ${firstName}, tu pedido de KLINIU ya va en camino. Puedes seguirlo en vivo aquí: ${link}`
      : `Hola ${firstName}, el vehículo de KLINIU está cerca de tu dirección. Sigue la entrega aquí: ${link}`;

  const phone = digits(order.customerPhone);
  const conversation = phone
    ? await prisma.watiConversation.findFirst({
        where: { phone: { endsWith: phone.slice(-10) } },
        select: { id: true, phone: true, assignedSellerId: true, messages: { where: { role: "USER" }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } },
      })
    : null;

  const lastUser = conversation?.messages[0]?.createdAt;
  if (conversation && lastUser && now.getTime() - lastUser.getTime() <= WHATSAPP_WINDOW_MS - WINDOW_SAFETY_MS) {
    try {
      await sendWatiMessage(conversation.phone, text);
      await prisma.watiMessage.create({ data: { conversationId: conversation.id, role: "ASSISTANT", content: text } });
      await broadcastPanelUpdate("wati");
      return;
    } catch (e) {
      // Wati falló: no se pierde el aviso, queda para el vendedor.
      console.error("DELIVERY_WATI_SEND_FAILED", order.id, e instanceof Error ? e.message : e);
    }
  }

  const seller = conversation?.assignedSellerId ?? order.assignedSellerId ?? undefined;
  await createNotification({
    eventKey: "logistics.customer_notice",
    title: `${kind === "EN_ROUTE" ? "Pedido en camino" : "Vehículo cerca"}: avisar a ${order.customerName}`,
    detail: `No hay chat de WhatsApp dentro de las 24 h. Envíale este mensaje: ${text}`,
    href: "/panel/logistica",
    // Con vendedor asignado el aviso es solo para él; sin vendedor lo ve todo el rol de ventas.
    ...(seller ? { targetUserId: seller, targetRoles: [] } : {}),
    metadata: { orderId: order.id, kind },
  });
}

/** Marca primero (reclamo atómico) para que dos llamadas simultáneas no avisen dos veces. */
async function claim(orderId: string, field: "enRouteNotifiedAt" | "nearNotifiedAt") {
  const { count } = await prisma!.order.updateMany({ where: { id: orderId, [field]: null }, data: { [field]: new Date() } });
  return count === 1;
}

/** Al iniciar la ruta: geocodifica, asegura tokens y avisa "En camino" una sola vez por pedido. */
export async function notifyRouteStarted(routeId: string) {
  if (!prisma) return;
  try {
    await geocodePendingOrders(routeId, 25);
    const orders = await prisma.order.findMany({
      where: { deliveryRouteId: routeId, enRouteNotifiedAt: null, shippingStatus: { notIn: ["DELIVERED", "CANCELLED"] } },
      select: { id: true },
      orderBy: [...STOP_ORDER_BY],
    });
    for (const o of orders) {
      if (!(await claim(o.id, "enRouteNotifiedAt"))) continue;
      await sendCustomerNotice(o.id, "EN_ROUTE").catch((e) => console.error("DELIVERY_NOTICE_FAILED", o.id, e instanceof Error ? e.message : e));
    }
  } catch (e) {
    console.error("NOTIFY_ROUTE_STARTED_FAILED", routeId, e instanceof Error ? e.message : e);
  }
}

/** Con cada posición: avisa "Cerca" solo de la parada en turno, una sola vez. */
export async function notifyIfNear(routeId: string, pos: { lat: number; lng: number; accuracy: number | null }) {
  if (!prisma) return;
  try {
    if (pos.accuracy != null && pos.accuracy > MAX_ACCURACY_M) return;
    const next = await prisma.order.findFirst({
      where: { deliveryRouteId: routeId, shippingStatus: { notIn: ["DELIVERED", "CANCELLED"] }, deliveryAttempts: { none: {} } },
      orderBy: [...STOP_ORDER_BY],
      select: { id: true, lat: true, lng: true, nearNotifiedAt: true },
    });
    if (!next || next.nearNotifiedAt || next.lat == null || next.lng == null) return;
    if (haversineKm(pos, { lat: next.lat, lng: next.lng }) > NEAR_KM) return;
    if (!(await claim(next.id, "nearNotifiedAt"))) return;
    await sendCustomerNotice(next.id, "NEAR");
  } catch (e) {
    console.error("NOTIFY_NEAR_FAILED", routeId, e instanceof Error ? e.message : e);
  }
}
