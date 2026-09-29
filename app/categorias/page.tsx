import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { categoriasData, categoriaDesdeSlug, categoriaMeta, slugCategoria } from "../data/catalog";
import { getBannerByKey } from "@/lib/banners";
import CategoriasClient, { type CategoryBannerData } from "./categorias-client";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}): Promise<Metadata> {
  const { categoria } = await searchParams;
  const categoriaNombre = categoriaDesdeSlug(categoria ?? null);

  if (!categoriaNombre) {
    return {
      title: "Categorías",
      description:
        "Explora las categorías de dispensadores e insumos de higiene de Kliniu para hoteles, restaurantes y negocios en Colombia.",
      keywords: ["categorías", "dispensadores", "insumos de higiene", "Kliniu Colombia"],
      alternates: { canonical: "/categorias" },
    };
  }

  const meta = categoriaMeta(categoriaNombre);
  const description =
    meta.bannerCopy ||
    `Compra ${categoriaNombre.toLowerCase()} de Kliniu para hoteles, restaurantes y negocios en Colombia.`;
  const canonical = `/categorias?categoria=${slugCategoria(categoriaNombre)}`;

  return {
    title: categoriaNombre,
    description,
    keywords: [categoriaNombre, "dispensadores", "Kliniu Colombia", "higiene para negocios"],
    alternates: { canonical },
    openGraph: { title: categoriaNombre, description, url: canonical },
  };
}

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
