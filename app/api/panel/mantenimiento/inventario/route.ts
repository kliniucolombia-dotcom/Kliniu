import { requirePermission } from "@/lib/permissions";
import { createInventoryItem } from "@/lib/maintenance";
import type { InventoryItemCategory } from "@/generated/prisma/client";
import { parseNonNegativeNumber } from "@/lib/operations-validation";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    name?: string;
    code?: string;
    category?: InventoryItemCategory;
    stock?: number;
    minStock?: number;
    unit?: string;
    location?: string;
  };
  if (!body.name?.trim() || !body.code?.trim() || (body.category !== "SPARE_PART" && body.category !== "TOOL")) {
    return Response.json({ error: "Faltan datos (name, code, category)" }, { status: 400 });
  }

  try {
    const stock = body.stock === undefined ? 0 : parseNonNegativeNumber(body.stock);
    const minStock = body.minStock === undefined ? 0 : parseNonNegativeNumber(body.minStock);
    if (!Number.isInteger(stock) || !Number.isInteger(minStock)) throw new Error("INVALID_NUMBER");
    const item = await createInventoryItem({
      name: body.name,
      code: body.code,
      category: body.category,
      stock,
      minStock,
      unit: body.unit,
      location: body.location,
    });
    return Response.json({ item });
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_NUMBER") return Response.json({ error: "Stock inválido" }, { status: 400 });
    const dup = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
    return Response.json({ error: dup ? "Ya existe un ítem con ese código" : "No fue posible crear el ítem" }, { status: 400 });
  }
}
