import { requirePermission } from "@/lib/permissions";
import { geocodeAddress } from "@/lib/geocode";
import { geocodeWhere } from "@/lib/logistics";

// Previsualización del mapa al crear una ruta: ubica pedidos existentes (con caché) o una dirección suelta.
export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { orderIds?: string[]; address?: { address?: string; city?: string; department?: string } };
  if (body.address?.address && body.address.city) {
    const g = await geocodeAddress({ address: body.address.address, city: body.address.city, department: body.address.department });
    return Response.json({ location: g });
  }
  const ids = Array.isArray(body.orderIds) ? body.orderIds.filter((i) => typeof i === "string").slice(0, 100) : [];
  return Response.json({ stops: ids.length ? await geocodeWhere({ id: { in: ids } }, 25) : [] });
}
