import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSessionFromCookies();

  if (!session) {
    return Response.json({ error: "No autorizado." }, { status: 401 });
  }

  if (!prisma) {
    return Response.json({ error: "La base de datos no está configurada todavía." }, { status: 500 });
  }

  const { id } = await params;

  const order = await prisma.order.findFirst({
    where: { id, userId: session.userId },
    select: { paymentStatus: true },
  });

  if (!order) {
    return Response.json({ error: "No encontramos ese pedido." }, { status: 404 });
  }

  return Response.json({ paymentStatus: order.paymentStatus });
}
