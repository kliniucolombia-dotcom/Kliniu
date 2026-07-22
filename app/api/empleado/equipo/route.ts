import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const me = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!me) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const reports = await prisma.employee.findMany({
    where: { managerId: me.id },
    select: { id: true },
  });
  const reportIds = reports.map((r) => r.id);

  if (reportIds.length === 0) {
    return Response.json({ timeOff: [], overtime: [] });
  }

  const [timeOff, overtime] = await Promise.all([
    prisma.timeOffRequest.findMany({
      where: { employeeId: { in: reportIds } },
      orderBy: { createdAt: "desc" },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    }),
    prisma.overtimeRequest.findMany({
      where: { employeeId: { in: reportIds } },
      orderBy: { createdAt: "desc" },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    }),
  ]);

  return Response.json({
    timeOff: timeOff.map((r) => ({
      id: r.id,
      type: r.type,
      subType: r.subType,
      status: r.status,
      startDate: r.startDate,
      endDate: r.endDate,
      durationDays: r.durationDays,
      reason: r.reason,
      reviewNote: r.reviewNote,
      isPaid: r.isPaid,
      incapacityNumber: r.incapacityNumber,
      incapacityType: r.incapacityType,
      employee: { fullName: r.employee.user.fullName },
    })),
    overtime: overtime.map((r) => ({
      id: r.id,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      hours: r.hours,
      overtimeType: r.overtimeType,
      reason: r.reason,
      status: r.status,
      reviewNote: r.reviewNote,
      employee: { fullName: r.employee.user.fullName },
    })),
  });
}
