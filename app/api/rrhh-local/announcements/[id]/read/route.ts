import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** Marca una noticia como leída por el usuario actual. Idempotente. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;

  const announcement = await prisma.announcement.findUnique({ where: { id } });
  if (!announcement) return Response.json({ error: "Noticia no encontrada" }, { status: 404 });

  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId: id, userId: access.user.id } },
    create: { announcementId: id, userId: access.user.id },
    update: {},
  });

  return Response.json({ ok: true });
}
