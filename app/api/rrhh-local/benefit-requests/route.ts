import { requireActiveUser } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  // RRHH ve todas las solicitudes; el empleado solo las suyas.
  if (isRRHH(access.user)) {
    const employeeIdParam = new URL(request.url).searchParams.get("employeeId");
    const requests = await prisma.benefitRequest.findMany({
      where: employeeIdParam ? { employeeId: employeeIdParam } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        benefit: { select: { title: true, category: true } },
        employee: { include: { user: { select: { fullName: true } } } },
      },
    });
    return Response.json(requests);
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const requests = await prisma.benefitRequest.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    include: { benefit: { select: { title: true, category: true } } },
  });
  return Response.json(requests);
}

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const body = await request.json();
  const { benefitId, note } = body as { benefitId?: string; note?: string };
  if (!benefitId) return Response.json({ error: "benefitId es obligatorio" }, { status: 400 });

  const benefit = await prisma.benefit.findUnique({ where: { id: benefitId } });
  if (!benefit || !benefit.isActive) {
    return Response.json({ error: "El beneficio no está disponible" }, { status: 400 });
  }

  const pending = await prisma.benefitRequest.findFirst({
    where: { benefitId, employeeId: employee.id, status: "PENDING" },
  });
  if (pending) return Response.json({ error: "Ya tienes una solicitud pendiente para este beneficio" }, { status: 400 });

  const created = await prisma.benefitRequest.create({
    data: { benefitId, employeeId: employee.id, note: note?.trim() || null },
    include: { benefit: { select: { title: true, category: true } } },
  });
  return Response.json(created, { status: 201 });
}
