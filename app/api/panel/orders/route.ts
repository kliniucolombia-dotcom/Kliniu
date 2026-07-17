import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { ShippingStatus } from "@/generated/prisma/client";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function GET() {
  const access = await requirePermission("MODULE_PEDIDOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json([]);

  const where = session.role === "SELLER"
    ? { assignedSellerId: session.userId }
    : {};

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

  const body = await request.json() as { id: string; shippingStatus?: string; carrier?: string; trackingNumber?: string; adminNotes?: string };
  const { id, shippingStatus, ...rest } = body;
  const data = {
    ...rest,
    ...(shippingStatus ? { shippingStatus: shippingStatus as ShippingStatus } : {}),
  };

  const order = await prisma.order.findUnique({ where: { id }, select: { assignedSellerId: true } });
  if (!order) return Response.json({ error: "Pedido no encontrado" }, { status: 404 });
  if (session.role === "SELLER" && order.assignedSellerId !== session.userId) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }

  const updated = await prisma.order.update({ where: { id }, data });
  await broadcastPanelUpdate("orders");
  return Response.json(updated);
}
