import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_TAREAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  const b = (await request.json()) as { title?: string; content?: string; color?: string };
  const r = await prisma!.plannerNote.updateMany({
    where: { id, userId: access.user.id },
    data: {
      ...(b.title !== undefined && { title: b.title.trim().slice(0, 120) }),
      ...(b.content !== undefined && { content: b.content.slice(0, 5000) }),
      ...(b.color && /^#[0-9A-Fa-f]{6}$/.test(b.color) && { color: b.color }),
    },
  });
  if (!r.count) return Response.json({ error: "Nota no encontrada" }, { status: 404 });
  return Response.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_TAREAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { id } = await params;
  await prisma!.plannerNote.deleteMany({ where: { id, userId: access.user.id } });
  return Response.json({ ok: true });
}
