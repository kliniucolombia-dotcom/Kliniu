import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** Colombia: 15 días hábiles de vacaciones por año trabajado ≈ 1.25 días por mes. */
const VACATION_DAYS_PER_MONTH = 15 / 12;

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employee = await prisma.employee.findUnique({
    where: { userId: access.user.id },
    include: {
      department: { select: { name: true } },
      timeOffRequests: { orderBy: { startDate: "asc" } },
    },
  });

  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const now = new Date();
  const monthsWorked = Math.max(
    0,
    (now.getFullYear() - employee.hireDate.getFullYear()) * 12 + (now.getMonth() - employee.hireDate.getMonth()),
  );
  const earnedDays = Math.floor(monthsWorked * VACATION_DAYS_PER_MONTH);
  const takenDays = employee.timeOffRequests
    .filter((r) => r.type === "VACATION" && r.status === "APPROVED")
    .reduce((sum, r) => sum + r.durationDays, 0);
  const availableDays = Math.max(0, earnedDays - takenDays);

  const nextVacation = employee.timeOffRequests.find(
    (r) => r.type === "VACATION" && r.status === "APPROVED" && r.startDate > now,
  );

  return Response.json({
    fullName: access.user.fullName,
    email: access.user.email,
    jobTitle: employee.jobTitle,
    departmentName: employee.department?.name ?? null,
    employeeCode: employee.employeeCode,
    hireDate: employee.hireDate,
    contractType: employee.contractType,
    vacationBalance: { earnedDays, takenDays, availableDays },
    nextVacation: nextVacation
      ? { startDate: nextVacation.startDate, endDate: nextVacation.endDate, durationDays: nextVacation.durationDays }
      : null,
  });
}
