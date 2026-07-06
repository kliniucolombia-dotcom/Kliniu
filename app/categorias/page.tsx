import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { categoriasData } from "../data/catalog";
import CategoriasClient, { type CategoryBannerData } from "./categorias-client";

async function getCategoryBanners(): Promise<Record<string, CategoryBannerData>> {
  if (!prisma) return {};

  const keys = categoriasData.map((c) => `categoria_${c.nombre}`);
  const rows = await prisma.banner.findMany({
    where: { key: { in: keys }, type: "CATEGORY", active: true },
  });

  const byCategoryName: Record<string, CategoryBannerData> = {};
  for (const cat of categoriasData) {
    const row = rows.find((r) => r.key === `categoria_${cat.nombre}`);
    if (!row) continue;
    byCategoryName[cat.nombre] = {
      title1: row.title1,
      title2: row.title2,
      desktopImage: row.desktopImage,
      mobileImage: row.mobileImage,
      metadata: row.metadata as Record<string, unknown> | null,
    };
  }

  return byCategoryName;
}

export default async function CategoriasPage() {
  const categoryBanners = await getCategoryBanners();

  return (
    <Suspense fallback={null}>
      <CategoriasClient categoryBanners={categoryBanners} />
    </Suspense>
  );
}
