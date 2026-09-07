import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const { name, code, description, isActive } = (await request.json()) as {
    name?: string;
    code?: string;
    description?: string | null;
    isActive?: boolean;
  };

  const department = await prisma.productionDepartment.findUnique({ where: { id } });
  if (!department) return Response.json({ error: "Departamento no encontrado" }, { status: 404 });

  if (name?.trim() || code?.trim()) {
    const clash = await prisma.productionDepartment.findFirst({
      where: {
        id: { not: id },
        OR: [
          ...(name?.trim() ? [{ name: name.trim() }] : []),
          ...(code?.trim() ? [{ code: code.trim().toUpperCase() }] : []),
        ],
      },
    });
    if (clash) return Response.json({ error: "Ya existe un departamento con ese nombre o código" }, { status: 409 });
  }

  const updated = await prisma.productionDepartment.update({
    where: { id },
    data: {
      name: name?.trim() || undefined,
      code: code?.trim().toUpperCase() || undefined,
      description: description !== undefined ? description?.trim() || null : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const department = await prisma.productionDepartment.findUnique({ where: { id } });
  if (!department) return Response.json({ error: "Departamento no encontrado" }, { status: 404 });

  await prisma.productionDepartment.delete({ where: { id } });
  return Response.json({ ok: true });
}
