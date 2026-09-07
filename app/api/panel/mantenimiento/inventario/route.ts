import { requirePermission } from "@/lib/permissions";
import { createInventoryItem } from "@/lib/maintenance";
import type { InventoryItemCategory } from "@/generated/prisma/client";

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
    const item = await createInventoryItem({
      name: body.name,
      code: body.code,
      category: body.category,
      stock: Number(body.stock) || 0,
      minStock: Number(body.minStock) || 0,
      unit: body.unit,
      location: body.location,
    });
    return Response.json({ item });
  } catch (error) {
    const dup = typeof error === "object" && error !== null && (error as { code?: string }).code === "P2002";
    return Response.json({ error: dup ? "Ya existe un ítem con ese código" : "No fue posible crear el ítem" }, { status: 400 });
  }
}
