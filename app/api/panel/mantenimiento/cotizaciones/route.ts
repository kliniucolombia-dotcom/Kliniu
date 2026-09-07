import { requirePermission } from "@/lib/permissions";
import { createQuote } from "@/lib/maintenance";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as { supplier?: string; description?: string; amount?: number; maintenanceOrderId?: string };
  if (!body.supplier?.trim() || !body.description?.trim()) {
    return Response.json({ error: "Faltan datos (supplier, description)" }, { status: 400 });
  }
  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    return Response.json({ error: "El monto debe ser mayor a 0" }, { status: 400 });
  }

  const quote = await createQuote({ supplier: body.supplier, description: body.description, amount: body.amount, maintenanceOrderId: body.maintenanceOrderId });
  return Response.json({ quote });
}
