import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { title, description, detail, category, frequency, isFeatured, isActive, order, expiresAt } = body as {
    title?: string; description?: string; detail?: string | null; category?: string;
    frequency?: string | null; isFeatured?: boolean; isActive?: boolean; order?: number; expiresAt?: string | null;
  };

  const benefit = await prisma.benefit.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title: title.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() } : {}),
      ...(detail !== undefined ? { detail: detail?.trim() || null } : {}),
      ...(category !== undefined ? { category: category as never } : {}),
      ...(frequency !== undefined ? { frequency: frequency?.trim() || null } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(order !== undefined ? { order } : {}),
      ...(expiresAt !== undefined ? { expiresAt: expiresAt ? new Date(expiresAt) : null } : {}),
    },
  });
  return Response.json(benefit);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  await prisma.benefit.delete({ where: { id } });
  return Response.json({ ok: true });
}
