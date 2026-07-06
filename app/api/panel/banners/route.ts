import { requirePermission } from "@/lib/permissions";
import { getAllBanners, upsertBanner, deleteBanner } from "@/lib/banners";
import type { BannerType } from "@/generated/prisma/client";

export async function GET() {
  const access = await requirePermission("MODULE_BANNERS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const banners = await getAllBanners();
  return Response.json(banners);
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_BANNERS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    key?: string;
    type?: BannerType;
    title1?: string;
    title2?: string;
    desktopImage?: string;
    mobileImage?: string;
    link?: string;
    metadata?: Record<string, unknown>;
    active?: boolean;
    order?: number;
  };

  if (!body.key || !body.type) {
    return Response.json({ error: "Faltan datos (key, type)" }, { status: 400 });
  }

  const banner = await upsertBanner({
    key: body.key,
    type: body.type,
    title1: body.title1,
    title2: body.title2,
    desktopImage: body.desktopImage,
    mobileImage: body.mobileImage,
    link: body.link,
    metadata: body.metadata,
    active: body.active,
    order: body.order,
  });

  return Response.json(banner);
}

export async function PATCH(request: Request) {
  const access = await requirePermission("MODULE_BANNERS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    key?: string;
    type?: BannerType;
    title1?: string;
    title2?: string;
    desktopImage?: string;
    mobileImage?: string;
    link?: string;
    metadata?: Record<string, unknown>;
    active?: boolean;
    order?: number;
  };

  if (!body.key || !body.type) {
    return Response.json({ error: "Faltan datos (key, type)" }, { status: 400 });
  }

  const banner = await upsertBanner({
    key: body.key,
    type: body.type,
    title1: body.title1,
    title2: body.title2,
    desktopImage: body.desktopImage,
    mobileImage: body.mobileImage,
    link: body.link,
    metadata: body.metadata,
    active: body.active,
    order: body.order,
  });

  return Response.json(banner);
}

export async function DELETE(request: Request) {
  const access = await requirePermission("MODULE_BANNERS", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Falta id" }, { status: 400 });

  await deleteBanner(id);
  return Response.json({ ok: true });
}
