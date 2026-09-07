import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_BANNERS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const { title, videoUrl, thumbUrl, active, order } = (await request.json()) as {
    title?: string;
    videoUrl?: string;
    thumbUrl?: string | null;
    active?: boolean;
    order?: number;
  };

  const video = await prisma.solutionVideo.findUnique({ where: { id } });
  if (!video) return Response.json({ error: "Video no encontrado" }, { status: 404 });

  const updated = await prisma.solutionVideo.update({
    where: { id },
    data: {
      title: title?.trim() || undefined,
      videoUrl: videoUrl?.trim() || undefined,
      thumbUrl: thumbUrl !== undefined ? thumbUrl?.trim() || null : undefined,
      active: active !== undefined ? active : undefined,
      order: order !== undefined ? order : undefined,
    },
  });

  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_BANNERS", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const video = await prisma.solutionVideo.findUnique({ where: { id } });
  if (!video) return Response.json({ error: "Video no encontrado" }, { status: 404 });

  await prisma.solutionVideo.delete({ where: { id } });
  return Response.json({ ok: true });
}
