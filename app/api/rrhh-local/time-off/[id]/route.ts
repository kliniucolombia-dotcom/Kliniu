import { requireActiveUser, requireManagerOf } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { createNotification } from "@/lib/notifications";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { status, reviewNote, isPaid } = body as {
    status?: "APPROVED" | "REJECTED" | "CANCELLED";
    reviewNote?: string;
    isPaid?: boolean;
  };

  if (status === "CANCELLED") {
    const access = await requireActiveUser();
    if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

    const request_ = await prisma.timeOffRequest.findUnique({ where: { id }, include: { employee: true } });
    if (!request_) return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });
    if (request_.employee.userId !== access.user.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    if (request_.status !== "PENDING") {
      return Response.json({ error: "Solo puedes cancelar solicitudes pendientes" }, { status: 400 });
    }

    const updated = await prisma.timeOffRequest.update({
      where: { id },
      data: { status: "CANCELLED" },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    });
    await broadcastPanelUpdate("timeoff");
    return Response.json(updated);
  }

  const existing = await prisma.timeOffRequest.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });

  const access = await requireManagerOf(existing.employeeId);
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (status !== "APPROVED" && status !== "REJECTED") {
    return Response.json({ error: "status debe ser APPROVED o REJECTED" }, { status: 400 });
  }

  if (status === "REJECTED" && !reviewNote?.trim()) {
    return Response.json({ error: "El motivo de rechazo es obligatorio" }, { status: 400 });
  }

  if (status === "APPROVED" && existing.type === "PERMIT" && typeof isPaid !== "boolean") {
    return Response.json({ error: "Debes indicar si el permiso es remunerado o no" }, { status: 400 });
  }

  const updated = await prisma.timeOffRequest.update({
    where: { id },
    data: {
      status,
      reviewNote: status === "REJECTED" ? reviewNote!.trim() : null,
      isPaid: status === "APPROVED" && existing.type === "PERMIT" ? isPaid : existing.isPaid,
    },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  await broadcastPanelUpdate("timeoff");

  const TIME_OFF_LABELS: Record<string, string> = {
    VACATION: "vacaciones", PERMIT: "permiso", LEAVE: "licencia",
    INCAPACITY: "incapacidad", UNPAID: "sin remuneración",
  };
  const typeLabel = TIME_OFF_LABELS[updated.type] ?? updated.type.toLowerCase();
  const employeeName = updated.employee.user.fullName;

  if (status === "APPROVED") {
    createNotification({
      eventKey: "hr.request_approved",
      title: `Solicitud de ${typeLabel} aprobada`,
      detail: employeeName,
      href: "/panel/rrhh/vacaciones",
      targetUserId: updated.employee.userId,
      createdById: access.user.id,
      metadata: { timeOffId: id, type: updated.type },
    }).catch(() => {});
  } else if (status === "REJECTED") {
    createNotification({
      eventKey: "hr.request_rejected",
      title: `Solicitud de ${typeLabel} rechazada`,
      detail: employeeName,
      href: "/panel/rrhh/vacaciones",
      targetUserId: updated.employee.userId,
      createdById: access.user.id,
      metadata: { timeOffId: id, type: updated.type, reason: reviewNote },
    }).catch(() => {});
  }

  return Response.json(updated);
}
