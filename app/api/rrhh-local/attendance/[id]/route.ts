import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { status, note, checkIn, checkOut } = body as {
    status?: string; note?: string | null; checkIn?: string | null; checkOut?: string | null;
  };

  const record = await prisma.attendanceRecord.findUnique({ where: { id } });
  if (!record) return Response.json({ error: "Registro no encontrado" }, { status: 404 });

  const updated = await prisma.attendanceRecord.update({
    where: { id },
    data: {
      status: (status as never) || undefined,
      note: note !== undefined ? note || null : undefined,
      checkIn: checkIn !== undefined ? checkIn || null : undefined,
      checkOut: checkOut !== undefined ? checkOut || null : undefined,
    },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  await prisma.attendanceRecord.delete({ where: { id } }).catch(() => null);
  return Response.json({ ok: true });
}
