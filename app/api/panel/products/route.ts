import { requirePermission } from "@/lib/permissions";
import { getProductsForPanel, updateProductPrice, updateProductPackPrices } from "@/lib/panel";
import { prisma } from "@/lib/prisma";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_PRODUCTOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { searchParams } = new URL(request.url);
  const minimal = searchParams.get("minimal") === "1";
  if (minimal) {
    if (!prisma) return Response.json([]);
    const products = await prisma.product.findMany({ where: { active: true }, select: { id: true, name: true, price: true, image: true, sku: true }, orderBy: { name: "asc" } });
    return Response.json(products);
  }
  const products = await getProductsForPanel();
  return Response.json(products);
}

export async function PATCH(request: Request) {
  const access = await requirePermission("MODULE_PRODUCTOS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const body = await request.json() as {
    productId: string;
    newPrice?: number;
    note?: string;
    packPrices?: { label: string; qty: number; totalPrice: number }[];
  };
  if (!body.productId) {
    return Response.json({ error: "Faltan datos" }, { status: 400 });
  }
  if (body.newPrice) {
    await updateProductPrice(body.productId, body.newPrice, session.userId, body.note);
  }
  if (body.packPrices) {
    const cleaned = body.packPrices
      .filter((p) => p.label.trim() && p.qty > 0 && p.totalPrice > 0)
      .map((p) => ({ label: p.label.trim(), qty: Math.round(p.qty), totalPrice: Math.round(p.totalPrice) }));
    await updateProductPackPrices(body.productId, cleaned);
  }
  await broadcastPanelUpdate("products");
  return Response.json({ ok: true });
}
