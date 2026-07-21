import { isRRHH } from "@/lib/roles";
import { requireActiveUser, requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employeeIdParam = new URL(request.url).searchParams.get("employeeId");

  if (isRRHH(access.user)) {
    const payslips = await prisma.payslip.findMany({
      where: employeeIdParam ? { employeeId: employeeIdParam } : undefined,
      orderBy: { createdAt: "desc" },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    });
    return Response.json(payslips);
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const payslips = await prisma.payslip.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(payslips);
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { employeeId, period, grossAmount, deductions, fileUrl, fileName } = body as {
    employeeId?: string;
    period?: string;
    grossAmount?: number;
    deductions?: number;
    fileUrl?: string;
    fileName?: string;
  };

  if (!employeeId || !period?.trim() || typeof grossAmount !== "number" || typeof deductions !== "number") {
    return Response.json({ error: "employeeId, period, grossAmount y deductions son obligatorios" }, { status: 400 });
  }

  const payslip = await prisma.payslip.create({
    data: {
      employeeId,
      period: period.trim(),
      grossAmount,
      deductions,
      netAmount: grossAmount - deductions,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
    },
  });
  return Response.json(payslip, { status: 201 });
}
