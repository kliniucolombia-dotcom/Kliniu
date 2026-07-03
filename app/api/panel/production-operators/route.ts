import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json([]);
  const operators = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SELLER", "PACKING"] } },
    select: { id: true, fullName: true, role: true },
    orderBy: { fullName: "asc" },
  });
  return Response.json(operators);
}
