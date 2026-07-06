import { prisma } from "@/lib/prisma";
import type { BannerType, Prisma } from "@/generated/prisma/client";

export type BannerInput = {
  key: string;
  type: BannerType;
  title1?: string | null;
  title2?: string | null;
  desktopImage?: string | null;
  mobileImage?: string | null;
  link?: string | null;
  metadata?: Record<string, unknown> | null;
  active?: boolean;
  order?: number;
};

export async function getAllBanners() {
  if (!prisma) return [];
  return prisma.banner.findMany({ orderBy: [{ type: "asc" }, { order: "asc" }] });
}

export async function getBannerByKey(key: string) {
  if (!prisma) return null;
  return prisma.banner.findUnique({ where: { key } });
}

export async function getBannersByKeys(keys: string[]) {
  if (!prisma) return new Map<string, Awaited<ReturnType<typeof getBannerByKey>>>();
  const banners = await prisma.banner.findMany({ where: { key: { in: keys }, active: true } });
  return new Map(banners.map((b) => [b.key, b]));
}

export async function upsertBanner(input: BannerInput) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  return prisma.banner.upsert({
    where: { key: input.key },
    update: {
      type: input.type,
      title1: input.title1 ?? null,
      title2: input.title2 ?? null,
      desktopImage: input.desktopImage ?? null,
      mobileImage: input.mobileImage ?? null,
      link: input.link ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      active: input.active ?? true,
      order: input.order ?? 0,
    },
    create: {
      key: input.key,
      type: input.type,
      title1: input.title1 ?? null,
      title2: input.title2 ?? null,
      desktopImage: input.desktopImage ?? null,
      mobileImage: input.mobileImage ?? null,
      link: input.link ?? null,
      metadata: (input.metadata as Prisma.InputJsonValue) ?? undefined,
      active: input.active ?? true,
      order: input.order ?? 0,
    },
  });
}

export async function deleteBanner(id: string) {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  await prisma.banner.delete({ where: { id } });
}
