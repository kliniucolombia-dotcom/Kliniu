import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_WHATSAPP", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "DB no configurada" }, { status: 500 });

  const status = new URL(request.url).searchParams.get("status");
  const where =
    status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? { status } satisfies { status: typeof status } : {};

  const [lessons, grouped] = await Promise.all([
    prisma.watiLesson.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.watiLesson.groupBy({ by: ["status"], _count: true }),
  ]);
  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const row of grouped) counts[row.status] = row._count;

  return Response.json({ lessons, counts, canApprove: access.user.role === "SUPERADMIN" });
}
