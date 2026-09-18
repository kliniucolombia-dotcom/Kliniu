import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { title, body: content, authorName, category, isImportant, isActive, scheduledAt } = body as {
    title?: string; body?: string; authorName?: string | null; category?: string; isImportant?: boolean;
    isActive?: boolean; scheduledAt?: string | null;
  };

  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(content !== undefined ? { body: content.trim() } : {}),
      ...(authorName !== undefined ? { authorName: authorName?.trim() || null } : {}),
      ...(category !== undefined ? { category: category as never } : {}),
      ...(isImportant !== undefined ? { isImportant } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(scheduledAt !== undefined ? { scheduledAt: scheduledAt ? new Date(scheduledAt) : null } : {}),
    },
  });
  broadcastPanelUpdate("rrhh").catch(() => {});
  return Response.json(announcement);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  await prisma.announcement.delete({ where: { id } });
  broadcastPanelUpdate("rrhh").catch(() => {});
  return Response.json({ ok: true });
}
