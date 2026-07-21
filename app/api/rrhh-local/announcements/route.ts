import { isRRHH } from "@/lib/roles";
import { requireActiveUser, requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const announcements = await prisma.announcement.findMany({
    where: isRRHH(access.user) ? undefined : { isActive: true },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(announcements);
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { title, body: content, authorName } = body as { title?: string; body?: string; authorName?: string };

  if (!title?.trim() || !content?.trim()) {
    return Response.json({ error: "title y body son obligatorios" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: { title: title.trim(), body: content.trim(), authorName: authorName?.trim() || null },
  });
  return Response.json(announcement, { status: 201 });
}
