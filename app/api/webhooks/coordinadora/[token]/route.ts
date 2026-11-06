import { timingSafeEqual } from "node:crypto";
import type { ShippingStatus } from "@/generated/prisma/client";
import { updateOrderShipping } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

// Notificación push Tracking v3 de Coordinadora (Pub/Sub). No admite auth:
// el secreto va en la URL. Body: { message: { data: base64(JSON) } }.
// Sin novedad: codigo = estado. Con novedad: codigo = novedad, codigo_estado = estado.

type Evento = {
  tracking_number?: string;
  referencia?: string;
  comment?: string;
  codigo?: string;
  codigo_estado?: string;
  desc_estado?: string;
  fecha?: string;
  hora?: string;
};

// 2 terminal origen · 3 transporte · 4 terminal destino · 5 reparto · 9 punto Droop → en camino. 6 entregada.
// 8 (cerrado por incidencia) y el resto no cambian el estado: quedan en notas.
const ESTADO: Record<string, ShippingStatus> = { "2": "SHIPPED", "3": "SHIPPED", "4": "SHIPPED", "5": "SHIPPED", "9": "SHIPPED", "6": "DELIVERED" };
const ORDEN: Record<ShippingStatus, number> = { PENDING: 0, PREPARING: 1, SHIPPED: 2, DELIVERED: 3, CANCELLED: 4 };

function tokenValido(token: string) {
  const a = Buffer.from(token);
  return [process.env.COORDINADORA_WEBHOOK_TOKEN, process.env.COORDINADORA_WEBHOOK_TOKEN_TEST].some((t) => {
    if (!t) return false;
    const b = Buffer.from(t);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Las URLs se enviaron a Coordinadora como <token>: tolerar los signos si quedaron registrados.
  if (!tokenValido(decodeURIComponent(token).replace(/[<>]/g, ""))) return new Response(null, { status: 404 });

  let ev: Evento;
  try {
    const body = (await request.json()) as { message?: { data?: string } };
    ev = JSON.parse(Buffer.from(body.message?.data ?? "", "base64").toString("utf8")) as Evento;
  } catch {
    return Response.json({ error: "Body inválido" }, { status: 400 });
  }

  const guia = ev.tracking_number?.trim();
  if (!guia || !prisma) return Response.json({ received: true });

  const order = await prisma.order.findFirst({
    where: { carrier: "Coordinadora", trackingNumber: guia },
    select: { id: true, shippingStatus: true, carrier: true, trackingNumber: true, adminNotes: true },
  });
  // 200 aunque no exista: si respondemos error, Pub/Sub reintenta sin fin (guías creadas fuera del sistema).
  if (!order) return Response.json({ received: true });

  const esNovedad = Boolean(ev.codigo_estado);
  const codigoEstado = (esNovedad ? ev.codigo_estado : ev.codigo)?.trim() ?? "";
  const siguiente = ESTADO[codigoEstado];
  // Nunca retroceder (eventos fuera de orden) ni tocar pedidos cancelados.
  const nuevoEstado =
    siguiente && order.shippingStatus !== "CANCELLED" && ORDEN[siguiente] > ORDEN[order.shippingStatus]
      ? siguiente
      : order.shippingStatus;

  const cuando = [ev.fecha, ev.hora?.replace(/\s/g, "").slice(0, 5)].filter(Boolean).join(" ");
  let notas = order.adminNotes ?? "";
  if (esNovedad || codigoEstado === "8") {
    const linea = `[Coordinadora ${cuando}] Novedad ${ev.codigo ?? ""}: ${ev.comment ?? ""}${ev.desc_estado ? ` (${ev.desc_estado})` : ""}`.trim();
    if (!notas.includes(linea)) notas = notas ? `${notas}\n${linea}` : linea;
  }

  if (nuevoEstado === order.shippingStatus && notas === (order.adminNotes ?? "")) {
    return Response.json({ received: true });
  }

  try {
    await updateOrderShipping(
      order.id,
      { shippingStatus: nuevoEstado, carrier: order.carrier ?? undefined, trackingNumber: order.trackingNumber ?? undefined, adminNotes: notas },
      { actorId: null, actorEmail: "webhook:coordinadora", ip: null },
    );
    await broadcastPanelUpdate("orders");
  } catch (error) {
    console.error("[coordinadora] webhook", guia, error);
    return Response.json({ error: "No se pudo actualizar" }, { status: 500 }); // Pub/Sub reintenta
  }
  return Response.json({ received: true });
}
