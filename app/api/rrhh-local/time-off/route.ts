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
  const {
    employeeId,
    type,
    subType,
    startDate,
    endDate,
    reason,
    startTime,
    endTime,
    hours,
    attachmentUrl,
    attachmentName,
    incapacityType,
    epsName,
    treatingDoctor,
    diagnosis,
    diagnosisCode,
    issueDate,
  } = body as {
    employeeId?: string;
    type?: string;
    subType?: string;
    startDate?: string;
    endDate?: string;
    reason?: string;
    startTime?: string;
    endTime?: string;
    hours?: number;
    attachmentUrl?: string;
    attachmentName?: string;
    incapacityType?: string;
    epsName?: string;
    treatingDoctor?: string;
    diagnosis?: string;
    diagnosisCode?: string;
    issueDate?: string;
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
  if (type !== "INCAPACITY" && start < today) {
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

  let incapacityNumber: string | null = null;
  if (type === "INCAPACITY") {
    const year = start.getUTCFullYear();
    const countThisYear = await prisma.timeOffRequest.count({
      where: { type: "INCAPACITY", createdAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
    });
    incapacityNumber = `INC-${year}-${String(countThisYear + 1).padStart(4, "0")}`;
  }

  const timeOffRequest = await prisma.timeOffRequest.create({
    data: {
      employeeId: finalEmployeeId,
      type: type as never,
      subType: (subType as never) || null,
      startDate: start,
      endDate: end,
      durationDays: subType === "HORAS" ? 0 : durationDays,
      hours: typeof hours === "number" ? hours : null,
      startTime: startTime || null,
      endTime: endTime || null,
      reason: reason || null,
      attachmentUrl: attachmentUrl || null,
      attachmentName: attachmentName || null,
      incapacityNumber,
      incapacityType: (incapacityType as never) || null,
      epsName: epsName || null,
      treatingDoctor: treatingDoctor || null,
      diagnosis: diagnosis || null,
      diagnosisCode: diagnosisCode || null,
      issueDate: issueDate ? new Date(issueDate) : null,
    },
    include: { employee: { include: { user: { select: { fullName: true } } } } },
  });

  return Response.json(timeOffRequest, { status: 201 });
}
