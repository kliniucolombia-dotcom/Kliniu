import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { status } = body as { status?: "APPROVED" | "REJECTED" };

  if (status !== "APPROVED" && status !== "REJECTED") {
    return Response.json({ error: "status debe ser APPROVED o REJECTED" }, { status: 400 });
  }

  const updated = await prisma.timeOffRequest.update({
    where: { id },
    data: { status },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json(updated);
}
