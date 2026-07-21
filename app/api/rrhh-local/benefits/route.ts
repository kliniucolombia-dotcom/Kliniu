import { requireActiveUser, requireRRHH } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const benefits = await prisma.benefit.findMany({
    where: isRRHH(access.user) ? undefined : { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  return Response.json(benefits);
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { title, description, order } = body as { title?: string; description?: string; order?: number };

  if (!title?.trim() || !description?.trim()) {
    return Response.json({ error: "title y description son obligatorios" }, { status: 400 });
  }

  const benefit = await prisma.benefit.create({
    data: { title: title.trim(), description: description.trim(), order: order ?? 0 },
  });
  return Response.json(benefit, { status: 201 });
}
