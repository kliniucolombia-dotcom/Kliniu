import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { status, reviewNote } = body as { status?: "APPROVED" | "REJECTED"; reviewNote?: string };

  if (status !== "APPROVED" && status !== "REJECTED") {
    return Response.json({ error: "status debe ser APPROVED o REJECTED" }, { status: 400 });
  }
  if (status === "REJECTED" && !reviewNote?.trim()) {
    return Response.json({ error: "El motivo de rechazo es obligatorio" }, { status: 400 });
  }

  const existing = await prisma.certificateRequest.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (existing.status !== "PENDING") {
    return Response.json({ error: "Esta solicitud ya fue revisada" }, { status: 400 });
  }

  const updated = await prisma.certificateRequest.update({
    where: { id },
    data: { status, reviewNote: status === "REJECTED" ? reviewNote!.trim() : null },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  await broadcastPanelUpdate("timeoff");
  return Response.json(updated);
}
