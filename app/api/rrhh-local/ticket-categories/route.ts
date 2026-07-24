import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const categories = await prisma.requestCategory.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return Response.json(categories);
}
