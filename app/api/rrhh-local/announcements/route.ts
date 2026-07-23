import { isRRHH } from "@/lib/roles";
import { requireActiveUser, requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const announcements = await prisma.announcement.findMany({
    where: isRRHH(access.user)
      ? undefined
      : { isActive: true, OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }] },
    orderBy: { createdAt: "desc" },
    include: {
      // readByMe: si el usuario actual ya la leyó. _count: total de lecturas (para "más leídas").
      reads: { where: { userId: access.user.id }, select: { readAt: true } },
      _count: { select: { reads: true } },
    },
  });

  return Response.json(
    announcements.map(({ reads, _count, ...a }) => ({
      ...a,
      readByMe: reads.length > 0,
      readCount: _count.reads,
    })),
  );
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { title, body: content, authorName, category, imageUrl, isImportant, scheduledAt } = body as {
    title?: string;
    body?: string;
    authorName?: string;
    category?: string;
    imageUrl?: string;
    isImportant?: boolean;
    scheduledAt?: string;
  };

  if (!title?.trim() || !content?.trim()) {
    return Response.json({ error: "title y body son obligatorios" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: {
      title: title.trim(),
      body: content.trim(),
      authorName: authorName?.trim() || null,
      category: (category as never) ?? "GENERAL",
      imageUrl: imageUrl?.trim() || null,
      isImportant: Boolean(isImportant),
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    },
  });
  return Response.json(announcement, { status: 201 });
}
