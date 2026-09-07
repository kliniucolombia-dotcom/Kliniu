import { prisma } from "@/lib/prisma";

export async function getActiveSolutionVideos() {
  if (!prisma) return [];
  return prisma.solutionVideo.findMany({
    where: { active: true },
    orderBy: { order: "asc" },
  });
}

export async function getAllSolutionVideos() {
  if (!prisma) return [];
  return prisma.solutionVideo.findMany({ orderBy: { order: "asc" } });
}
