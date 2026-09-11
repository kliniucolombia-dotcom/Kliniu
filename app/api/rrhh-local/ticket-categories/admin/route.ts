import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const [categories, departments, staff] = await Promise.all([
    prisma.requestCategory.findMany({
      orderBy: { name: "asc" },
      include: { defaultResponsible: { select: { id: true, fullName: true } }, _count: { select: { tickets: true } } },
    }),
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, code: true } }),
    prisma.user.findMany({
      where: { role: { not: "CUSTOMER" }, status: "ACTIVE" },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true },
    }),
  ]);

  return Response.json({ categories, departments, staff });
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { name, icon, defaultResponsibleId, allowedDepartmentIds, active } = body as {
    name?: string;
    icon?: string;
    defaultResponsibleId?: string;
    allowedDepartmentIds?: string[];
    active?: boolean;
  };

  if (!name?.trim()) return Response.json({ error: "El nombre es obligatorio" }, { status: 400 });

  const created = await prisma.requestCategory.create({
    data: {
      name: name.trim(),
      icon: icon?.trim() || null,
      defaultResponsibleId: defaultResponsibleId || null,
      allowedDepartmentIds: allowedDepartmentIds ?? [],
      active: active ?? true,
    },
  });
  return Response.json(created, { status: 201 });
}
