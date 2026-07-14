import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const vendedores = await prisma.user.findMany({
    where: { role: "SELLER" },
    select: { id: true, fullName: true, email: true, phone: true, city: true, status: true, createdAt: true },
    orderBy: { fullName: "asc" },
  });

  return Response.json({ vendedores });
}
