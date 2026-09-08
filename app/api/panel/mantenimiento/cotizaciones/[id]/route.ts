import { requirePermission } from "@/lib/permissions";
import { updateQuote } from "@/lib/maintenance";
import type { MaintenanceQuoteStatus } from "@/generated/prisma/client";

const STATUSES: MaintenanceQuoteStatus[] = ["REQUESTED", "APPROVED", "REJECTED", "PURCHASED"];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { status?: MaintenanceQuoteStatus; amount?: number };
  if (body.status && !STATUSES.includes(body.status)) return Response.json({ error: "Estado inválido" }, { status: 400 });
  if (body.amount !== undefined && (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0)) return Response.json({ error: "Monto inválido" }, { status: 400 });

  const quote = await updateQuote(id, body);
  return Response.json({ quote });
}
