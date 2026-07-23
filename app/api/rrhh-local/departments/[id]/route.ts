import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { name, code, description, isActive } = body as {
    name?: string;
    code?: string;
    description?: string | null;
    isActive?: boolean;
  };

  const department = await prisma.department.findUnique({ where: { id } });
  if (!department) return Response.json({ error: "Departamento no encontrado" }, { status: 404 });

  const updated = await prisma.department.update({
    where: { id },
    data: {
      name: name?.trim() || undefined,
      code: code?.trim() || undefined,
      description: description !== undefined ? description || null : undefined,
      isActive: isActive !== undefined ? isActive : undefined,
    },
  });

  return Response.json(updated);
}
