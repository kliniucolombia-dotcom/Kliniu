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
    include: {
      // Conteo agregado (sin identificar personas) para el ranking "más utilizados".
      _count: { select: { requests: { where: { status: "APPROVED" } } } },
    },
  });

  return Response.json(
    benefits.map(({ _count, ...b }) => ({ ...b, approvedCount: _count.requests })),
  );
}

export async function POST(request: Request) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { title, description, detail, category, imageUrl, frequency, isFeatured, order } = body as {
    title?: string;
    description?: string;
    detail?: string;
    category?: string;
    imageUrl?: string;
    frequency?: string;
    isFeatured?: boolean;
    order?: number;
  };

  if (!title?.trim() || !description?.trim()) {
    return Response.json({ error: "title y description son obligatorios" }, { status: 400 });
  }

  const benefit = await prisma.benefit.create({
    data: {
      title: title.trim(),
      description: description.trim(),
      detail: detail?.trim() || null,
      category: (category as never) ?? "OTRO",
      imageUrl: imageUrl?.trim() || null,
      frequency: frequency?.trim() || null,
      isFeatured: Boolean(isFeatured),
      order: order ?? 0,
    },
  });
  return Response.json(benefit, { status: 201 });
}
