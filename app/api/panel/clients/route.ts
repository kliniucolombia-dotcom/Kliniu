import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json([]);
  const clients = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    select: { id: true, fullName: true, company: true, email: true, city: true },
    orderBy: { fullName: "asc" },
  });
  return Response.json(clients);
}
