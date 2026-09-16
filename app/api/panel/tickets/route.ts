import { requirePermission } from "@/lib/permissions";
import { isRRHH, isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

const TICKET_INCLUDE = {
  category: { select: { name: true, icon: true } },
  employee: { include: { user: { select: { id: true, fullName: true } } } },
  responsible: { select: { id: true, fullName: true } },
} as const;

export async function GET() {
  const access = await requirePermission("MODULE_TICKETS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  if (isRRHH(access.user) || isAdmin(access.user)) {
    const tickets = await prisma.ticket.findMany({ orderBy: { createdAt: "desc" }, include: TICKET_INCLUDE });
    return Response.json({ tickets, scope: "all" });
  }

  // El resto solo ve las solicitudes asignadas a su usuario y las que él mismo radicó.
  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  const tickets = await prisma.ticket.findMany({
    where: {
      OR: [
        { responsibleId: access.user.id },
        ...(employee ? [{ employeeId: employee.id }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    include: TICKET_INCLUDE,
  });
  return Response.json({ tickets, scope: "assigned" });
}
