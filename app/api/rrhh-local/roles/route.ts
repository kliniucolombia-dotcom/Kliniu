import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  SELLER: "Vendedor",
  PACKING: "Empaque",
  SUPERADMIN: "Superadmin",
  RRHH: "Recursos Humanos",
};

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const counts = await prisma.user.groupBy({
    by: ["role"],
    where: { role: { not: "CUSTOMER" } },
    _count: { _all: true },
  });

  const roles = counts
    .map((c) => ({
      role: c.role,
      name: ROLE_LABELS[c.role] ?? c.role,
      userCount: c._count._all,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return Response.json(roles);
}
