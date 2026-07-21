import { isRRHH } from "@/lib/roles";
import { requireActiveUser, requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employeeIdParam = new URL(request.url).searchParams.get("employeeId");

  if (isRRHH(access.user)) {
    const documents = await prisma.employeeDocument.findMany({
      where: employeeIdParam ? { employeeId: employeeIdParam } : undefined,
      orderBy: { createdAt: "desc" },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    });
    return Response.json(documents);
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(documents);
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { employeeId, category, name, fileUrl, fileName } = body as {
    employeeId?: string;
    category?: string;
    name?: string;
    fileUrl?: string;
    fileName?: string;
  };

  if (!employeeId || !category || !name?.trim() || !fileUrl || !fileName) {
    return Response.json({ error: "employeeId, category, name y el archivo son obligatorios" }, { status: 400 });
  }

  const document = await prisma.employeeDocument.create({
    data: { employeeId, category: category as never, name: name.trim(), fileUrl, fileName },
  });
  return Response.json(document, { status: 201 });
}
