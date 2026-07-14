import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const requests = await prisma.timeOffRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json(requests);
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { employeeId, type, startDate, endDate, reason } = body as {
    employeeId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
  };

  if (!employeeId || !type || !startDate || !endDate) {
    return Response.json({ error: "employeeId, type, startDate y endDate son obligatorios" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  const timeOffRequest = await prisma.timeOffRequest.create({
    data: {
      employeeId,
      type: type as never,
      startDate: start,
      endDate: end,
      durationDays,
      reason: reason || null,
    },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json(timeOffRequest, { status: 201 });
}
