import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { ShippingStatus } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { updateOrderShipping } from "@/lib/orders";

const UNCONFIRMED_PAYMENT_STATUSES = ["PENDING", "FAILED", "EXPIRED"] as const;

// Pedidos ONLINE sin pago confirmado son intentos de checkout, no pedidos
// reales todavía (ver lib/orders.ts, createOrderFromCart). Por defecto se
// excluyen de la vista principal; `view=pending` los muestra aparte para que
// ventas pueda hacer seguimiento, `view=all` no filtra nada.
function paymentFilterForView(view: string) {
  if (view === "pending") {
    return { channel: "ONLINE" as const, paymentStatus: { in: [...UNCONFIRMED_PAYMENT_STATUSES] } };
  }
  if (view === "all") {
    return {};
  }
  return { NOT: { channel: "ONLINE" as const, paymentStatus: { in: [...UNCONFIRMED_PAYMENT_STATUSES] } } };
}

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_PEDIDOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json([]);

  const view = new URL(request.url).searchParams.get("view") ?? "confirmed";

  const where = {
    ...paymentFilterForView(view),
    ...(session.role === "SELLER" ? { assignedSellerId: session.userId } : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: { orderBy: { createdAt: "asc" } },
      assignedSeller: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return Response.json(orders);
}

export async function PATCH(request: Request) {
  const access = await requirePermission("MODULE_PEDIDOS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = (await request.json()) as {
    id: string;
    shippingStatus?: ShippingStatus;
    carrier?: string;
    trackingNumber?: string;
    adminNotes?: string;
  };
  const { id, shippingStatus, carrier, trackingNumber, adminNotes } = body;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { assignedSellerId: true, shippingStatus: true },
  });
  if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (session.role === "SELLER" && order.assignedSellerId !== session.userId) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  try {
    // Delega en updateOrderShipping (lib/orders.ts) para no divergir de
    // /api/orders/[id]: recalcula el status general y sincroniza a Odoo
    // cuando corresponde, en vez de escribir directo con prisma.order.update.
    const updated = await updateOrderShipping(id, {
      shippingStatus: shippingStatus ?? order.shippingStatus,
      carrier,
      trackingNumber,
      adminNotes,
    });
    await broadcastPanelUpdate("orders");
    return Response.json(updated);
  } catch (error) {
    const message =
      error instanceof Error && error.message === "INVALID_SHIPPING_STATUS"
        ? "El estado de envío no es válido."
        : "No fue posible actualizar el pedido.";
    return Response.json({ error: message }, { status: 400 });
  }
}
