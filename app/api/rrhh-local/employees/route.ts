import { hash } from "bcryptjs";
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
    fullName,
    email,
    cedula,
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
    fullName?: string;
    email?: string;
    cedula?: string;
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

  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedCedula = cedula?.trim();

  if (!fullName?.trim() || !normalizedEmail || !normalizedCedula || !jobTitle || !hireDate) {
    return Response.json(
      { error: "nombre, correo, cédula, cargo y fecha de ingreso son obligatorios" },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    return Response.json({ error: "Ya existe un usuario con este correo" }, { status: 409 });
  }

  const existingCode = await prisma.employee.findUnique({ where: { employeeCode: normalizedCedula } });
  if (existingCode) {
    return Response.json({ error: "Ya existe un empleado con esta cédula" }, { status: 409 });
  }

  const passwordHash = await hash(normalizedCedula, 10);

  const newUser = await prisma.user.create({
    data: {
      fullName: fullName.trim(),
      email: normalizedEmail,
      passwordHash,
      role: "EMPLOYEE",
    },
  });

  const employee = await prisma.employee.create({
    data: {
      userId: newUser.id,
      employeeCode: normalizedCedula,
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
