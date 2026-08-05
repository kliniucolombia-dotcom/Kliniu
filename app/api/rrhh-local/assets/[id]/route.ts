import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const STATUSES = ["ENTREGADO", "DEVUELTO", "DANADO", "PERDIDO"] as const;
type Status = (typeof STATUSES)[number];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { status, returnedAt, notes } = body as { status?: string; returnedAt?: string; notes?: string };

  if (!status || !STATUSES.includes(status as Status)) {
    return Response.json({ error: "Estado inválido" }, { status: 400 });
  }

  const existing = await prisma.employeeAsset.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Elemento no encontrado" }, { status: 404 });

  // Solo ENTREGADO sigue en poder del colaborador; los demás cierran la asignación.
  const closes = status !== "ENTREGADO";
  const returned = closes ? (returnedAt ? new Date(returnedAt) : new Date()) : null;

  if (returned && Number.isNaN(returned.getTime())) {
    return Response.json({ error: "Fecha de devolución inválida" }, { status: 400 });
  }
  if (returned && returned < existing.deliveredAt) {
    return Response.json({ error: "La devolución no puede ser anterior a la entrega" }, { status: 400 });
  }

  const updated = await prisma.employeeAsset.update({
    where: { id },
    data: {
      status: status as never,
      returnedAt: returned,
      notes: notes !== undefined ? notes.trim() || null : existing.notes,
    },
    include: {
      employee: { include: { user: { select: { fullName: true } }, department: { select: { name: true } } } },
      createdBy: { select: { fullName: true } },
    },
  });

  return Response.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.employeeAsset.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Elemento no encontrado" }, { status: 404 });

  await prisma.employeeAsset.delete({ where: { id } });
  return Response.json({ deleted: true });
}
