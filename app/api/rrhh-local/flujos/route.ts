import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const employeeInclude = { employee: { include: { user: { select: { fullName: true } } } } } as const;

  const [timeOff, overtime, benefitRequests, certificates, tickets] = await Promise.all([
    prisma.timeOffRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: employeeInclude,
    }),
    prisma.overtimeRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: employeeInclude,
    }),
    prisma.benefitRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { ...employeeInclude, benefit: { select: { title: true } } },
    }),
    prisma.certificateRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: employeeInclude,
    }),
    prisma.ticket.findMany({
      where: { status: { notIn: ["FINALIZADO", "CANCELADO"] } },
      orderBy: { createdAt: "asc" },
      include: { ...employeeInclude, category: { select: { name: true } } },
    }),
  ]);

  return Response.json({ timeOff, overtime, benefitRequests, certificates, tickets });
}
