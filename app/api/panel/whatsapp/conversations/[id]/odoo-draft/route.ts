import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { syncOrderToOdoo } from "@/lib/orders";

/**
 * Sincroniza el pedido con Odoo. Los pedidos de WhatsApp se confirman
 * (action_confirm) para que Odoo genere el albarán de entrega; otros canales
 * quedan como borrador sin confirmar.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_WHATSAPP", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no configurada." }, { status: 500 });

  const { id } = await params;
  const conversation = await prisma.watiConversation.findUnique({ where: { id } });
  if (!conversation?.orderId) {
    return Response.json({ error: "Primero genera el pedido desde la conversación." }, { status: 400 });
  }

  const order = await syncOrderToOdoo(conversation.orderId);
  if (order.odooSyncStatus === "FAILED") {
    return Response.json({ error: order.odooSyncError || "Odoo no pudo crear el borrador." }, { status: 502 });
  }

  await broadcastPanelUpdate("wati");
  return Response.json({
    orderId: order.id,
    odooOrderId: order.odooOrderId,
    odooOrderName: order.odooOrderName,
    message:
      order.channel === "WHATSAPP"
        ? `Pedido ${order.odooOrderName ?? ""} confirmado en Odoo; albarán de entrega generado.`
        : `Borrador ${order.odooOrderName ?? ""} creado en Odoo. No fue confirmado ni aprobado.`,
  });
}
