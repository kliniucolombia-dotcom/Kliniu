import { getSessionFromCookies } from "@/lib/auth";
import { createProductionOrder, getProductionOrders } from "@/lib/panel";

export async function GET(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? undefined;

  const orders = await getProductionOrders({ status });
  return Response.json({ orders });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER" && session.role !== "PACKING")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

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
