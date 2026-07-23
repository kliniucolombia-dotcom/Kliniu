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

  const request = await prisma.certificateRequest.findFirst({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
  });

  if (!request || request.status !== "APPROVED") {
    return Response.json({
      request: request
        ? { id: request.id, status: request.status, includeSalary: request.includeSalary, reviewNote: request.reviewNote }
        : null,
    });
  }

  return Response.json({
    request: { id: request.id, status: request.status, includeSalary: request.includeSalary, reviewNote: request.reviewNote },
    data: {
      fullName: access.user.fullName,
      documentNumber: employee.employeeCode,
      jobTitle: employee.jobTitle,
      departmentName: employee.department?.name ?? null,
      contractType: CONTRACT_LABELS[employee.contractType] ?? employee.contractType,
      hireDate: employee.hireDate,
      salaryAmount: request.includeSalary ? employee.salaryAmount : null,
      salaryCurrency: employee.salaryCurrency,
      salaryPeriod: employee.salaryPeriod,
    },
  });
}

export async function POST(req: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });
  if (employee.status !== "ACTIVE") {
    return Response.json({ error: "Solo empleados activos pueden solicitar el certificado" }, { status: 400 });
  }

  const existing = await prisma.certificateRequest.findFirst({
    where: { employeeId: employee.id, status: "PENDING" },
  });
  if (existing) return Response.json({ error: "Ya tienes una solicitud en revisión" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const includeSalary = Boolean(body?.includeSalary);

  const request = await prisma.certificateRequest.create({
    data: { employeeId: employee.id, includeSalary },
  });

  return Response.json({ request: { id: request.id, status: request.status, includeSalary: request.includeSalary } });
}
