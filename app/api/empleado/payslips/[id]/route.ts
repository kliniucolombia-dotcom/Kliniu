import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const payslip = await prisma.payslip.findUnique({
    where: { id },
    include: { employee: { include: { department: { select: { name: true } }, user: { select: { fullName: true } } } } },
  });
  if (!payslip) return Response.json({ error: "Desprendible no encontrado" }, { status: 404 });

  if (!isRRHH(access.user) && payslip.employee.userId !== access.user.id) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  return Response.json({
    period: payslip.period,
    grossAmount: payslip.grossAmount,
    deductions: payslip.deductions,
    netAmount: payslip.netAmount,
    fullName: payslip.employee.user.fullName,
    documentNumber: payslip.employee.employeeCode,
    jobTitle: payslip.employee.jobTitle,
    departmentName: payslip.employee.department?.name ?? null,
    hireDate: payslip.employee.hireDate,
    salaryPeriod: payslip.employee.salaryPeriod,
  });
}
