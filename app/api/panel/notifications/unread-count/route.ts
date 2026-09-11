import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { isSuperAdmin } from "@/lib/roles";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const userRole = access.user.role;
  const isSA = isSuperAdmin(access.user);

  const roleFilter = isSA
    ? {}
    : {
        OR: [
          { targetRoles: { contains: `"${userRole}"` } },
          { targetUserId: access.user.id },
        ],
      };

  const count = await prisma.notification.count({
    where: {
      ...roleFilter,
      reads: { none: { userId: access.user.id } },
    },
  });

  return Response.json({ count });
}
