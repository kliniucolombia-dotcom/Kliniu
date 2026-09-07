import { requirePermission } from "@/lib/permissions";
import { createCost } from "@/lib/logistics";
import type { TransportCostCategory } from "@/generated/prisma/client";

const CATEGORIES: TransportCostCategory[] = ["COMBUSTIBLE", "MANTENIMIENTO", "PEAJES", "OTRO"];

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    vehicleId?: string;
    date?: string;
    category?: TransportCostCategory;
    amount?: number;
    notes?: string;
  };
  if (!body.vehicleId || !body.date || !body.category || !CATEGORIES.includes(body.category)) {
    return Response.json({ error: "Faltan datos (vehicleId, date, category)" }, { status: 400 });
  }
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    return Response.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
  }

  const cost = await createCost({
    vehicleId: body.vehicleId,
    date: body.date,
    category: body.category,
    amount: body.amount,
    notes: body.notes,
    userId: access.user.id,
  });
  return Response.json({ cost });
}
