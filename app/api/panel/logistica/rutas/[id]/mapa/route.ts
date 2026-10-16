import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { geocodeAddress } from "@/lib/geocode";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  if (!prisma) return Response.json({ error: "Base de datos no configurada" }, { status: 503 });
  const db = prisma;
  const { id } = await ctx.params;
  const orders = await db.order.findMany({
    where: { deliveryRouteId: id },
    select: { id: true, customerName: true, department: true, city: true, addressLine1: true, lat: true, lng: true },
    orderBy: { createdAt: "asc" },
  });

  // Geocodifica solo los que no tienen coordenadas y las guarda (caché en la fila).
  // ponytail: si se edita la dirección del pedido, las coordenadas no se recalculan.
  const stops = await Promise.all(
    orders.map(async (o) => {
      let { lat, lng } = o;
      if (lat == null || lng == null) {
        const g = await geocodeAddress({ address: o.addressLine1, city: o.city, department: o.department });
        if (g) {
          lat = g.lat;
          lng = g.lng;
          await db.order.update({ where: { id: o.id }, data: { lat, lng } });
        }
      }
      return { id: o.id, name: o.customerName, address: `${o.addressLine1}, ${o.city}`, lat, lng };
    }),
  );
  return Response.json({ stops });
}
