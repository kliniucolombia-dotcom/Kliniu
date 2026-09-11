import { requirePermission } from "@/lib/permissions";
import { isRRHH, isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const TICKET_INCLUDE = {
  category: { select: { name: true, icon: true } },
  employee: { include: { user: { select: { fullName: true } } } },
  responsible: { select: { id: true, fullName: true } },
  attachments: true,
} as const;

export async function GET() {
  const access = await requirePermission("MODULE_TICKETS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  if (isRRHH(access.user) || isAdmin(access.user)) {
    const tickets = await prisma.ticket.findMany({ orderBy: { createdAt: "desc" }, include: TICKET_INCLUDE });
    return Response.json({ tickets, scope: "all" });
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee?.departmentId) return Response.json({ tickets: [], scope: "department", department: null });

  const categories = await prisma.requestCategory.findMany({
    where: { allowedDepartmentIds: { has: employee.departmentId } },
    select: { id: true },
  });
  const department = await prisma.department.findUnique({ where: { id: employee.departmentId }, select: { name: true } });

  const tickets = await prisma.ticket.findMany({
    where: { categoryId: { in: categories.map((c) => c.id) } },
    orderBy: { createdAt: "desc" },
    include: TICKET_INCLUDE,
  });
  return Response.json({ tickets, scope: "department", department: department?.name ?? null });
}
