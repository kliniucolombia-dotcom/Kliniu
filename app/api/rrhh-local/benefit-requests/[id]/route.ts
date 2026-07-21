import { requireActiveUser } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { status, reviewNote } = body as { status?: string; reviewNote?: string };

  const existing = await prisma.benefitRequest.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Solicitud no encontrada" }, { status: 404 });

  // RRHH aprueba o rechaza; el empleado solo puede cancelar una solicitud propia pendiente.
  if (!isRRHH(access.user)) {
    const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
    if (!employee || existing.employeeId !== employee.id) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
    if (status !== "CANCELLED" || existing.status !== "PENDING") {
      return Response.json({ error: "Solo puedes cancelar solicitudes pendientes" }, { status: 400 });
    }
  }

  if (!status || !["PENDING", "APPROVED", "REJECTED", "CANCELLED"].includes(status)) {
    return Response.json({ error: "status inválido" }, { status: 400 });
  }

  const updated = await prisma.benefitRequest.update({
    where: { id },
    data: {
      status: status as never,
      reviewNote: isRRHH(access.user) ? reviewNote?.trim() || null : existing.reviewNote,
    },
  });
  return Response.json(updated);
}
