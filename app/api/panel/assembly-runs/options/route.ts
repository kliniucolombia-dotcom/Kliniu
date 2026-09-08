import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getAssemblyStations } from "@/lib/assembly";

/** Catálogos del formulario de ensamble en una sola llamada. */
export async function GET() {
  const access = await requirePermission("MODULE_ENSAMBLE", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ stations: [], leaders: [], products: [], orders: [] });

  const [stations, leaders, products, orders] = await Promise.all([
    getAssemblyStations(true),
    prisma.user.findMany({
      where: { role: { in: ["LIDER_ENSAMBLE", "JEFE_OPERACIONES", "PACKING", "BODEGA"] } },
      select: { id: true, fullName: true, role: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.product.findMany({
      where: { active: true },
      select: { id: true, name: true, sku: true },
      orderBy: { name: "asc" },
    }),
    prisma.productionOrder.findMany({
      where: { area: "ENSAMBLE", status: { in: ["APPROVED", "IN_PRODUCTION"] } },
      select: { id: true, number: true, status: true },
      orderBy: { productionDate: "desc" },
      take: 50,
    }),
  ]);

  return Response.json({ stations, leaders, products, orders });
}
