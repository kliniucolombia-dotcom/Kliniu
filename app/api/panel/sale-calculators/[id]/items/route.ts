import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSaleCalculatorItem } from "@/lib/panel";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const { id } = await params;
  const calc = await prisma.saleCalculator.findUnique({ where: { id } });
  if (!calc) return Response.json({ error: "Calculadora no encontrada" }, { status: 404 });
  if (calc.userId !== session.userId) return Response.json({ error: "Sin permiso" }, { status: 403 });

  const body = await request.json() as {
    productId?: string | null; nombreProducto?: string; cantidad?: number; costoUnitario?: number;
  };
  if (!body.nombreProducto) return Response.json({ error: "Nombre de producto requerido" }, { status: 400 });

  try {
    const created = await createSaleCalculatorItem(id, {
      productId: body.productId ?? null,
      nombreProducto: body.nombreProducto,
      cantidad: body.cantidad,
      costoUnitario: body.costoUnitario,
    });
    return Response.json(created);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
