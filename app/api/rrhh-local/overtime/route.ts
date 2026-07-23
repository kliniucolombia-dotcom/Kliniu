import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

function hoursBetween(start: string, end: string) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return Math.max(0, (eh * 60 + em - (sh * 60 + sm)) / 60);
}

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  if (isRRHH(access.user)) {
    const requests = await prisma.overtimeRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    });
    return Response.json(requests);
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const requests = await prisma.overtimeRequest.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(requests);
}

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { date, startTime, endTime, overtimeType, reason, employeeId } = body as {
    date?: string;
    startTime?: string;
    endTime?: string;
    overtimeType?: string;
    reason?: string;
    employeeId?: string;
  };

  let finalEmployeeId = employeeId;
  if (!isRRHH(access.user)) {
    const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
    if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });
    finalEmployeeId = employee.id;
  }
  if (!finalEmployeeId) {
    return Response.json({ error: "employeeId es obligatorio" }, { status: 400 });
  }

  if (!date || !startTime || !endTime || !overtimeType) {
    return Response.json({ error: "date, startTime, endTime y overtimeType son obligatorios" }, { status: 400 });
  }

  const hours = hoursBetween(startTime, endTime);
  if (hours <= 0) {
    return Response.json({ error: "La hora final debe ser posterior a la inicial" }, { status: 400 });
  }

  const overtime = await prisma.overtimeRequest.create({
    data: {
      employeeId: finalEmployeeId,
      date: new Date(date),
      startTime,
      endTime,
      hours,
      overtimeType: overtimeType as never,
      reason: reason?.trim() || null,
    },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });
  await broadcastPanelUpdate("timeoff");
  return Response.json(overtime, { status: 201 });
}
