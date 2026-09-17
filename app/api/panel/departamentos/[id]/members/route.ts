import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const KINDS = ["HOLDER", "BACKUP"] as const;
type Kind = (typeof KINDS)[number];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    kind?: Kind;
    title?: string;
  };

  if (!body.userId) return Response.json({ error: "Selecciona una persona" }, { status: 400 });
  const kind: Kind = body.kind && KINDS.includes(body.kind) ? body.kind : "HOLDER";
  const title = body.title?.trim();
  if (!title) return Response.json({ error: "El cargo es obligatorio" }, { status: 400 });

  const department = await prisma.productionDepartment.findUnique({ where: { id } });
  if (!department) return Response.json({ error: "Departamento no encontrado" }, { status: 404 });

  const user = await prisma.user.findUnique({ where: { id: body.userId }, select: { id: true, fullName: true, email: true } });
  if (!user) return Response.json({ error: "La persona no existe" }, { status: 404 });

  const duplicate = await prisma.departmentMember.findFirst({
    where: { departmentId: id, userId: user.id, kind },
  });
  if (duplicate) {
    return Response.json({ error: "Esa persona ya está asignada con ese rol en esta unidad" }, { status: 409 });
  }

  const last = await prisma.departmentMember.findFirst({
    where: { departmentId: id },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const member = await prisma.departmentMember.create({
    data: {
      departmentId: id,
      userId: user.id,
      name: user.fullName,
      email: user.email,
      title,
      kind,
      order: (last?.order ?? -1) + 1,
    },
  });

  return Response.json(member, { status: 201 });
}
