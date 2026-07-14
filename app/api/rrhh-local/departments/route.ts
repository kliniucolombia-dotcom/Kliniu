import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });

  return Response.json(departments);
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { name, code, description } = body as { name?: string; code?: string; description?: string };

  if (!name || !code) {
    return Response.json({ error: "name y code son obligatorios" }, { status: 400 });
  }

  const department = await prisma.department.create({
    data: { name, code, description: description || null },
  });

  return Response.json(department, { status: 201 });
}
