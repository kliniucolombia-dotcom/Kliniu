import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ users: [] });

  const users = await prisma.user.findMany({
    where: { role: { not: "CUSTOMER" } },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true, email: true, role: true, status: true, avatarUrl: true },
  });

  return Response.json({ users });
}
