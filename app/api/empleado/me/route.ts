import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { calcVacationBalance } from "@/lib/vacation";

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
  const balance = calcVacationBalance(employee.hireDate, employee.timeOffRequests);

  const nextVacation = employee.timeOffRequests.find(
    (r) => r.type === "VACATION" && r.status === "APPROVED" && r.startDate > now,
  );

  return Response.json({
    fullName: access.user.fullName,
    email: access.user.email,
    phone: access.user.phone,
    city: access.user.city,
    avatarUrl: access.user.avatarUrl,
    jobTitle: employee.jobTitle,
    departmentName: employee.department?.name ?? null,
    employeeCode: employee.employeeCode,
    hireDate: employee.hireDate,
    contractType: employee.contractType,
    status: employee.status,
    salaryAmount: employee.salaryAmount,
    eps: employee.eps,
    afp: employee.afp,
    arl: employee.arl,
    vacationBalance: {
      earnedDays: balance.diasCausados,
      takenDays: balance.diasTomados,
      pendingDays: balance.diasPendientes,
      availableDays: balance.diasDisponibles,
    },
    nextVacation: nextVacation
      ? { startDate: nextVacation.startDate, endDate: nextVacation.endDate, durationDays: nextVacation.durationDays }
      : null,
    vacationRequests: employee.timeOffRequests
      .filter((r) => r.type === "VACATION")
      .map((r) => ({
        id: r.id,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        durationDays: r.durationDays,
        reason: r.reason,
        reviewNote: r.reviewNote,
      })),
  });
}

export async function PATCH(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { phone, city } = body as { phone?: string; city?: string };

  const user = await prisma.user.update({
    where: { id: access.user.id },
    data: {
      phone: phone !== undefined ? phone.trim() || null : undefined,
      city: city !== undefined ? city.trim() || null : undefined,
    },
  });

  return Response.json({ phone: user.phone, city: user.city });
}
