import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";

// Solo el SUPERADMIN decide qué aprende el bot.
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_WHATSAPP", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (access.user.role !== "SUPERADMIN") return Response.json({ error: "Solo el superadmin puede revisar lecciones" }, { status: 403 });
  if (!prisma) return Response.json({ error: "DB no configurada" }, { status: 500 });

  const { id } = await params;
  const body = (await request.json()) as { status?: string; text?: string };
  const data: { status?: "PENDING" | "APPROVED" | "REJECTED"; text?: string; reviewedById: string; reviewedAt: Date } = {
    reviewedById: access.session.userId,
    reviewedAt: new Date(),
  };

  if (body.status !== undefined) {
    if (body.status !== "PENDING" && body.status !== "APPROVED" && body.status !== "REJECTED") {
      return Response.json({ error: "Estado inválido" }, { status: 400 });
    }
    data.status = body.status;
  }
  if (body.text !== undefined) {
    const text = body.text.trim();
    if (text.length < 10 || text.length > 500) return Response.json({ error: "La lección debe tener entre 10 y 500 caracteres" }, { status: 400 });
    data.text = text;
  }

  const current = await prisma.watiLesson.findUnique({ where: { id }, select: { category: true } });
  if (!current) return Response.json({ error: "Lección no encontrada" }, { status: 404 });
  // REVISAR describe un posible dato errado, no es una regla: no se inyecta al bot.
  if (current.category === "REVISAR" && data.status === "APPROVED") {
    return Response.json({ error: "Las lecciones de tipo Revisar no se aprueban: corrige el dato en su fuente y descártala." }, { status: 400 });
  }

  const lesson = await prisma.watiLesson.update({ where: { id }, data });
  return Response.json(lesson);
}
