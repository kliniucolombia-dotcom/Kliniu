import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json([]);

  const departments = await prisma.productionDepartment.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(
    departments.map((d) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      description: d.description,
      isActive: d.isActive,
    })),
  );
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { name, code, description } = (await request.json()) as {
    name?: string;
    code?: string;
    description?: string;
  };

  if (!name?.trim() || !code?.trim()) {
    return Response.json({ error: "Nombre y código son obligatorios" }, { status: 400 });
  }

  const exists = await prisma.productionDepartment.findFirst({
    where: { OR: [{ name: name.trim() }, { code: code.trim().toUpperCase() }] },
  });
  if (exists) return Response.json({ error: "Ya existe un departamento con ese nombre o código" }, { status: 409 });

  const department = await prisma.productionDepartment.create({
    data: { name: name.trim(), code: code.trim().toUpperCase(), description: description?.trim() || null },
  });

  return Response.json(department, { status: 201 });
}
