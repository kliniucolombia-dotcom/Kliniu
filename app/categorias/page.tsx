import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { categoriasData } from "../data/catalog";
import { getBannerByKey } from "@/lib/banners";
import CategoriasClient, { type CategoryBannerData } from "./categorias-client";

export const metadata: Metadata = {
  title: "Categorías",
};

export const dynamic = "force-dynamic";

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
  const asesorBannerRow = await getBannerByKey("asesor_banner");
  const asesorBanner = asesorBannerRow
    ? { desktopImage: asesorBannerRow.desktopImage, mobileImage: asesorBannerRow.mobileImage, link: asesorBannerRow.link }
    : undefined;

  return (
    <Suspense fallback={null}>
      <CategoriasClient categoryBanners={categoryBanners} asesorBanner={asesorBanner} />
    </Suspense>
  );
}
