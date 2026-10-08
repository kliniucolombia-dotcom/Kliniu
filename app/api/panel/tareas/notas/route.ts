import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("MODULE_TAREAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const notes = await prisma!.plannerNote.findMany({ where: { userId: access.user.id }, orderBy: { updatedAt: "desc" } });
  return Response.json({ notes });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_TAREAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const b = (await request.json()) as { title?: string; content?: string; color?: string };
  const title = (b.title ?? "").trim().slice(0, 120);
  const content = (b.content ?? "").slice(0, 5000);
  if (!title && !content.trim()) return Response.json({ error: "La nota está vacía" }, { status: 400 });
  const note = await prisma!.plannerNote.create({
    data: { userId: access.user.id, title, content, ...(b.color && /^#[0-9A-Fa-f]{6}$/.test(b.color) ? { color: b.color } : {}) },
  });
  return Response.json({ note });
}
