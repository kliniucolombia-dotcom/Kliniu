import { requirePermission } from "@/lib/permissions";
import { adjustInventoryItem } from "@/lib/maintenance";
import { parseNonNegativeNumber } from "@/lib/operations-validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { delta?: number; minStock?: number; location?: string | null };
  if (body.delta !== undefined && (typeof body.delta !== "number" || !Number.isFinite(body.delta) || body.delta === 0)) {
    return Response.json({ error: "Cantidad inválida" }, { status: 400 });
  }
  if (body.delta !== undefined && !Number.isInteger(body.delta)) return Response.json({ error: "Cantidad inválida" }, { status: 400 });
  if (body.minStock !== undefined) {
    try {
      if (!Number.isInteger(parseNonNegativeNumber(body.minStock))) throw new Error("INVALID_NUMBER");
    } catch { return Response.json({ error: "Stock mínimo inválido" }, { status: 400 }); }
  }

  try {
    const item = await adjustInventoryItem(id, body);
    return Response.json({ item });
  } catch (error) {
    const msg = error instanceof Error && error.message === "INSUFFICIENT_STOCK" ? "No hay suficiente stock para esa salida." : "No fue posible actualizar el ítem.";
    return Response.json({ error: msg }, { status: 400 });
  }
}
