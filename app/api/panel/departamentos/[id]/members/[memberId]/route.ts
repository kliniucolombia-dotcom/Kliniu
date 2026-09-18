import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

const KINDS = ["HOLDER", "BACKUP"] as const;
type Kind = (typeof KINDS)[number];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id, memberId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    kind?: Kind;
    title?: string;
  };

  const existing = await prisma.departmentMember.findFirst({ where: { id: memberId, departmentId: id } });
  if (!existing) return Response.json({ error: "Miembro no encontrado" }, { status: 404 });

  const data: {
    userId?: string;
    name?: string | null;
    email?: string | null;
    kind?: Kind;
    title?: string;
  } = {};

  if (body.kind && KINDS.includes(body.kind)) data.kind = body.kind;
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return Response.json({ error: "El cargo es obligatorio" }, { status: 400 });
    data.title = title;
  }
  if (body.userId && body.userId !== existing.userId) {
    const user = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, fullName: true, email: true } });
    if (!user) return Response.json({ error: "La persona no existe" }, { status: 404 });
    const duplicate = await prisma.departmentMember.findFirst({
      where: { departmentId: id, userId: user.id, kind: data.kind ?? existing.kind, NOT: { id: memberId } },
    });
    if (duplicate) {
      return Response.json({ error: "Esa persona ya está asignada con ese rol en esta unidad" }, { status: 409 });
    }
    data.userId = user.id;
    data.name = user.fullName;
    data.email = user.email;
  }

  const member = await prisma.departmentMember.update({ where: { id: memberId }, data });
  broadcastPanelUpdate("production").catch(() => {});
  return Response.json(member);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id, memberId } = await params;
  const existing = await prisma.departmentMember.findFirst({ where: { id: memberId, departmentId: id } });
  if (!existing) return Response.json({ error: "Miembro no encontrado" }, { status: 404 });

  await prisma.departmentMember.delete({ where: { id: memberId } });
  broadcastPanelUpdate("production").catch(() => {});
  return Response.json({ ok: true });
}
