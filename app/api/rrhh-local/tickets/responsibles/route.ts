import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { groupResponsiblesByDepartment } from "@/lib/tickets";

// Devuelve los empleados activos agrupados por departamento para poblar el
// selector "Asignar a" sin pedir datos al cambiar de categoría.
export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employees = await prisma.employee.findMany({
    where: { status: "ACTIVE", departmentId: { not: null } },
    select: { userId: true, departmentId: true, user: { select: { fullName: true } } },
    orderBy: { user: { fullName: "asc" } },
  });

  return Response.json(groupResponsiblesByDepartment(employees));
}
