import { requirePermission } from "@/lib/permissions";
import { createCustomer } from "@/lib/logistics";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { name?: string; phone?: string; address?: string; city?: string };
  if (!body.name?.trim() || !body.address?.trim() || !body.city?.trim()) {
    return Response.json({ error: "Faltan datos (name, address, city)" }, { status: 400 });
  }

  const customer = await createCustomer({
    name: body.name.trim(),
    phone: body.phone?.trim() || undefined,
    address: body.address.trim(),
    city: body.city.trim(),
  });
  return Response.json({ customer });
}
