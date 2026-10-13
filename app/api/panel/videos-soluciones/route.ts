import { requirePermission } from "@/lib/permissions";
import { getAllSolutionVideos } from "@/lib/solution-videos";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";

export const GET = apiHandler(async () => {
  const access = await requirePermission("MODULE_BANNERS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const videos = await getAllSolutionVideos();
  return Response.json(videos);
});

export const POST = apiHandler(async (request: Request) => {
  const access = await requirePermission("MODULE_BANNERS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 503 });

  const { title, videoUrl, thumbUrl } = (await request.json()) as {
    title?: string;
    videoUrl?: string;
    thumbUrl?: string;
  };

  if (!title?.trim() || !videoUrl?.trim()) {
    return Response.json({ error: "Título y video son obligatorios" }, { status: 400 });
  }

  const last = await prisma.solutionVideo.findFirst({ orderBy: { order: "desc" } });

  const video = await prisma.solutionVideo.create({
    data: {
      title: title.trim(),
      videoUrl: videoUrl.trim(),
      thumbUrl: thumbUrl?.trim() || null,
      order: (last?.order ?? 0) + 1,
    },
  });

  return Response.json(video, { status: 201 });
});
