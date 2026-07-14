import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { fullName: true, email: true } },
      department: { select: { name: true } },
    },
  });

  return Response.json(employees);
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const {
    userId,
    employeeCode,
    jobTitle,
    departmentId,
    contractType,
    hireDate,
    salaryAmount,
    salaryPeriod,
    eps,
    afp,
    arl,
  } = body as {
    userId?: string;
    employeeCode?: string;
    jobTitle?: string;
    departmentId?: string;
    contractType?: string;
    hireDate?: string;
    salaryAmount?: number;
    salaryPeriod?: string;
    eps?: string;
    afp?: string;
    arl?: string;
  };

  if (!userId || !employeeCode || !jobTitle || !hireDate) {
    return Response.json({ error: "userId, employeeCode, jobTitle y hireDate son obligatorios" }, { status: 400 });
  }

  const existing = await prisma.employee.findUnique({ where: { userId } });
  if (existing) {
    return Response.json({ error: "Este usuario ya tiene un registro de empleado" }, { status: 409 });
  }

  const employee = await prisma.employee.create({
    data: {
      userId,
      employeeCode,
      jobTitle,
      departmentId: departmentId || null,
      contractType: (contractType as never) || "INDEFINITE",
      hireDate: new Date(hireDate),
      salaryAmount: salaryAmount ?? null,
      salaryPeriod: (salaryPeriod as never) || "MONTHLY",
      eps: eps || null,
      afp: afp || null,
      arl: arl || null,
    },
    include: {
      user: { select: { fullName: true, email: true } },
      department: { select: { name: true } },
    },
  });

  return Response.json(employee, { status: 201 });
}
