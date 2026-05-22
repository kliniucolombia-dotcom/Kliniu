import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ShippingStatus } from "@/generated/prisma/client";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
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
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
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
  return Response.json(updated);
}
