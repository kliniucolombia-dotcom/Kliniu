import { requireActiveUser } from "@/lib/permissions";
import { isAdmin, isSuperAdmin, isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const categories = await prisma.requestCategory.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });

  if (isSuperAdmin(access.user) || isAdmin(access.user) || isRRHH(access.user)) {
    return Response.json(categories);
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  const visible = categories.filter(
    (c) => c.allowedDepartmentIds.length === 0 || (employee?.departmentId && c.allowedDepartmentIds.includes(employee.departmentId)),
  );
  return Response.json(visible);
}
