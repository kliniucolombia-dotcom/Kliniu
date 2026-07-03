import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { duplicateSaleCalculator } from "@/lib/panel";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const { id } = await params;
  const original = await prisma.saleCalculator.findUnique({ where: { id } });
  if (!original) return Response.json({ error: "Calculadora no encontrada" }, { status: 404 });
  if (original.userId !== session.userId) return Response.json({ error: "Sin permiso" }, { status: 403 });

  try {
    const copy = await duplicateSaleCalculator(id);
    return Response.json(copy);
  } catch {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
