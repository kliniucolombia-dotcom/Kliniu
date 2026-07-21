import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    include: {
      employees: {
        where: { status: "ACTIVE" },
        select: { id: true, jobTitle: true, user: { select: { fullName: true } } },
        orderBy: { jobTitle: "asc" },
      },
    },
  });

  const unassigned = await prisma.employee.findMany({
    where: { status: "ACTIVE", departmentId: null },
    select: { id: true, jobTitle: true, user: { select: { fullName: true } } },
  });

  return Response.json({ departments, unassigned });
}
