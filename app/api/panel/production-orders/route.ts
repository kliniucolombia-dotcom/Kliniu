import { requirePermission } from "@/lib/permissions";
import { createProductionOrder, getProductionOrders } from "@/lib/panel";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? undefined;

  const orders = await getProductionOrders({ status });
  return Response.json({ orders });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;

  const body = await request.json().catch(() => ({})) as { productionDate?: string; notes?: string | null };
  if (!body.productionDate) {
    return Response.json({ error: "Fecha de producción requerida" }, { status: 400 });
  }

  const created = await createProductionOrder({
    createdById: session.userId,
    productionDate: new Date(body.productionDate),
    notes: body.notes,
  });
  return Response.json(created);
}
