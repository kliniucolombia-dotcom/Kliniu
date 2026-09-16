import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getPanelNotificationsForUser } from "@/lib/notifications/query";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const all = await getPanelNotificationsForUser(access.user);
  const count = all.filter((n) => !n.read).length;

  return Response.json({ count });
}
