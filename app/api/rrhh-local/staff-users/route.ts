import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const users = await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" }, status: "ACTIVE", employee: null },
    select: { id: true, fullName: true, email: true, role: true },
    orderBy: { fullName: "asc" },
  });

  return Response.json(users);
}
