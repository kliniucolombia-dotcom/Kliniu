import { requirePermission } from "@/lib/permissions";
import { getProductsForPanel, updateProductPrice } from "@/lib/panel";
import { prisma } from "@/lib/prisma";

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
  const body = await request.json() as { productId: string; newPrice: number; note?: string };
  if (!body.productId || !body.newPrice) {
    return Response.json({ error: "Faltan datos" }, { status: 400 });
  }
  await updateProductPrice(body.productId, body.newPrice, session.userId, body.note);
  return Response.json({ ok: true });
}
