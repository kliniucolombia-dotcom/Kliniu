import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json(null);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [config, monthOrderCount] = await Promise.all([
    prisma.sellerCostConfig.findUnique({ where: { userId: session.userId } }),
    prisma.order.count({
      where: { createdAt: { gte: startOfMonth }, status: { not: "CANCELLED" } },
    }),
  ]);

  return Response.json({ config, monthOrderCount });
}

export async function POST(req: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await req.json();
  const { costoProd, publicidad, transporte, packing, recaudo, imprevistos, gastosFijos, devolucionesPct } = body;

  const config = await prisma.sellerCostConfig.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      costoProd: Number(costoProd) || 0,
      publicidad: Number(publicidad) || 0,
      transporte: Number(transporte) || 0,
      packing: Number(packing) || 0,
      recaudo: Number(recaudo) || 0,
      imprevistos: Number(imprevistos) || 5,
      gastosFijos: Number(gastosFijos) || 0,
      devolucionesPct: Number(devolucionesPct) || 0,
    },
    update: {
      costoProd: Number(costoProd) || 0,
      publicidad: Number(publicidad) || 0,
      transporte: Number(transporte) || 0,
      packing: Number(packing) || 0,
      recaudo: Number(recaudo) || 0,
      imprevistos: Number(imprevistos) || 5,
      gastosFijos: Number(gastosFijos) || 0,
      devolucionesPct: Number(devolucionesPct) || 0,
    },
  });
  return Response.json(config);
}
