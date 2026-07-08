import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("MODULE_COTIZACIONES", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json([]);
  const clients = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, fullName: true, company: true, email: true, city: true },
    orderBy: { fullName: "asc" },
  });
  return Response.json(clients);
}
