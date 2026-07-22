import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const CONTRACT_LABELS: Record<string, string> = {
  INDEFINITE: "Término indefinido",
  FIXED_TERM: "Término fijo",
  WORK_OR_LABOR: "Obra o labor",
  APPRENTICESHIP: "Contrato de aprendizaje",
  TEMPORARY: "Temporal",
  CIVIL: "Prestación de servicios",
};

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employee = await prisma.employee.findUnique({
    where: { userId: access.user.id },
    include: { department: { select: { name: true } } },
  });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });
  if (employee.status !== "ACTIVE") {
    return Response.json({ error: "Solo empleados activos pueden generar el certificado" }, { status: 400 });
  }

  return Response.json({
    fullName: access.user.fullName,
    documentNumber: employee.employeeCode,
    jobTitle: employee.jobTitle,
    departmentName: employee.department?.name ?? null,
    contractType: CONTRACT_LABELS[employee.contractType] ?? employee.contractType,
    hireDate: employee.hireDate,
    salaryAmount: employee.salaryAmount,
    salaryCurrency: employee.salaryCurrency,
    salaryPeriod: employee.salaryPeriod,
  });
}
