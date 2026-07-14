import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const records = await prisma.attendanceRecord.findMany({
    orderBy: { date: "desc" },
    take: 100,
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json(records);
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { employeeId, date, status, note } = body as {
    employeeId?: string;
    date?: string;
    status?: string;
    note?: string;
  };

  if (!employeeId || !date || !status) {
    return Response.json({ error: "employeeId, date y status son obligatorios" }, { status: 400 });
  }

  const record = await prisma.attendanceRecord.upsert({
    where: { employeeId_date: { employeeId, date: new Date(date) } },
    update: { status: status as never, note: note || null },
    create: { employeeId, date: new Date(date), status: status as never, note: note || null },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json(record, { status: 201 });
}
