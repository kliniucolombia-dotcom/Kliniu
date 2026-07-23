import { requireActiveUser, requireManagerOf } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { status, reviewNote } = body as { status?: "APPROVED" | "REJECTED" | "CANCELLED"; reviewNote?: string };

  if (status === "CANCELLED") {
    const access = await requireActiveUser();
    if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

    const existing = await prisma.overtimeRequest.findUnique({ where: { id }, include: { employee: true } });
    if (!existing) return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
    if (existing.employee.userId !== access.user.id) return Response.json({ error: "No autorizado" }, { status: 403 });
    if (existing.status !== "PENDING") return Response.json({ error: "Solo puedes cancelar solicitudes pendientes" }, { status: 400 });

    const updated = await prisma.overtimeRequest.update({ where: { id }, data: { status: "CANCELLED" } });
    await broadcastPanelUpdate("timeoff");
    return Response.json(updated);
  }

  const existing = await prisma.overtimeRequest.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });

  const access = await requireManagerOf(existing.employeeId);
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (status !== "APPROVED" && status !== "REJECTED") {
    return Response.json({ error: "status debe ser APPROVED o REJECTED" }, { status: 400 });
  }
  if (status === "REJECTED" && !reviewNote?.trim()) {
    return Response.json({ error: "El motivo de rechazo es obligatorio" }, { status: 400 });
  }

  const updated = await prisma.overtimeRequest.update({
    where: { id },
    data: { status, reviewNote: status === "REJECTED" ? reviewNote!.trim() : null },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });
  await broadcastPanelUpdate("timeoff");
  return Response.json(updated);
}
