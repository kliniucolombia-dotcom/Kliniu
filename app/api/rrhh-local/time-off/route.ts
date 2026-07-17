import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { calcVacationBalance } from "@/lib/vacation";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  if (isRRHH(access.user)) {
    const requests = await prisma.timeOffRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    });
    return Response.json(requests);
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const requests = await prisma.timeOffRequest.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json(requests);
}

export async function POST(request: Request) {
  const access = await requireActiveUser();
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

  if (!type || !startDate || !endDate) {
    return Response.json({ error: "type, startDate y endDate son obligatorios" }, { status: 400 });
  }

  let finalEmployeeId = employeeId;

  if (!isRRHH(access.user)) {
    const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
    if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });
    finalEmployeeId = employee.id;
  }

  if (!finalEmployeeId) {
    return Response.json({ error: "employeeId es obligatorio" }, { status: 400 });
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (start < today) {
    return Response.json({ error: "No puedes solicitar fechas pasadas" }, { status: 400 });
  }

  const durationDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  if (type === "VACATION") {
    const employee = await prisma.employee.findUnique({
      where: { id: finalEmployeeId },
      include: { timeOffRequests: true },
    });
    if (!employee) return Response.json({ error: "Empleado no encontrado" }, { status: 404 });

    const overlaps = employee.timeOffRequests.some(
      (r) =>
        r.type === "VACATION" &&
        (r.status === "APPROVED" || r.status === "PENDING") &&
        start <= r.endDate &&
        end >= r.startDate,
    );
    if (overlaps) {
      return Response.json({ error: "Ya tienes vacaciones en ese rango de fechas" }, { status: 400 });
    }

    const balance = calcVacationBalance(employee.hireDate, employee.timeOffRequests);
    if (durationDays > balance.diasDisponibles) {
      return Response.json(
        { error: `No tienes suficientes días disponibles (disponibles: ${balance.diasDisponibles})` },
        { status: 400 },
      );
    }
  }

  const timeOffRequest = await prisma.timeOffRequest.create({
    data: {
      employeeId: finalEmployeeId,
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
