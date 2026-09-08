import { requirePermission } from "@/lib/permissions";
import { createProductionOrder, getProductionOrders } from "@/lib/panel";
import { parseBogotaCivilDate } from "@/lib/operations-validation";
import type { ProductionArea, ProductionOrderStatus } from "@/generated/prisma/client";

const STATUSES: ProductionOrderStatus[] = ["DRAFT", "APPROVED", "IN_PRODUCTION", "COMPLETED", "CANCELLED"];
const AREAS: ProductionArea[] = ["INYECCION", "ENSAMBLE"];

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const params = new URL(request.url).searchParams;
  const status = params.get("status") ?? undefined;
  if (status && !STATUSES.includes(status as ProductionOrderStatus)) return Response.json({ error: "Estado inválido" }, { status: 400 });

  const area = params.get("area") ?? undefined;
  if (area && !AREAS.includes(area as ProductionArea)) return Response.json({ error: "Área inválida" }, { status: 400 });

  const orders = await getProductionOrders({ status, area });
  return Response.json({ orders });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;

  const body = await request.json().catch(() => ({})) as { productionDate?: string; notes?: string | null; area?: string };
  if (!body.productionDate) {
    return Response.json({ error: "Fecha de producción requerida" }, { status: 400 });
  }
  if (body.area && !AREAS.includes(body.area as ProductionArea)) {
    return Response.json({ error: "Área inválida" }, { status: 400 });
  }

  try {
    const created = await createProductionOrder({
      createdById: session.userId,
      productionDate: parseBogotaCivilDate(body.productionDate),
      area: (body.area as ProductionArea | undefined) ?? "INYECCION",
      notes: body.notes,
    });
    return Response.json(created);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_DATE") return Response.json({ error: "Fecha de producción inválida" }, { status: 400 });
    return Response.json({ error: "No se pudo crear la orden" }, { status: 500 });
  }
}
