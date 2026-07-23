import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const requests = await prisma.certificateRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json(requests);
}
