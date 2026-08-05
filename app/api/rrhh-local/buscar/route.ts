import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const q = new URL(request.url).searchParams.get("q")?.trim() || "";
  if (q.length < 2) return Response.json({ employees: [], tickets: [], timeOff: [], documents: [] });

  const employeeInclude = { user: { select: { fullName: true, email: true } } } as const;

  const [employees, tickets, timeOff, documents] = await Promise.all([
    prisma.employee.findMany({
      where: {
        OR: [
          { employeeCode: { contains: q, mode: "insensitive" } },
          { jobTitle: { contains: q, mode: "insensitive" } },
          { user: { fullName: { contains: q, mode: "insensitive" } } },
          { user: { email: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: employeeInclude,
      take: 8,
    }),
    prisma.ticket.findMany({
      where: {
        OR: [
          { code: { contains: q, mode: "insensitive" } },
          { subject: { contains: q, mode: "insensitive" } },
          { employee: { user: { fullName: { contains: q, mode: "insensitive" } } } },
        ],
      },
      include: { employee: { include: employeeInclude }, category: { select: { name: true } } },
      take: 8,
    }),
    prisma.timeOffRequest.findMany({
      where: {
        OR: [
          { reason: { contains: q, mode: "insensitive" } },
          { employee: { user: { fullName: { contains: q, mode: "insensitive" } } } },
        ],
      },
      include: { employee: { include: employeeInclude } },
      take: 8,
    }),
    prisma.employeeDocument.findMany({
      where: {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { employee: { user: { fullName: { contains: q, mode: "insensitive" } } } },
        ],
      },
      include: { employee: { include: employeeInclude } },
      take: 8,
    }),
  ]);

  return Response.json({ employees, tickets, timeOff, documents });
}
