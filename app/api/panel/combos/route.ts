import { requirePermission } from "@/lib/permissions";
import { getCombosForPanel, createCombo, updateCombo, deleteCombo } from "@/lib/combos";

export async function GET() {
  const access = await requirePermission("MODULE_COMBOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const combos = await getCombosForPanel();
  return Response.json(combos);
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_COMBOS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    image?: string;
    galleryImages?: string[];
    price?: number;
    active?: boolean;
    items?: { productId: string; quantity: number }[];
    createdByName?: string;
  };

  if (!body.name || !body.price || !body.items || body.items.length === 0) {
    return Response.json({ error: "Faltan datos (name, price, items)" }, { status: 400 });
  }

  try {
    const combo = await createCombo({
      name: body.name,
      description: body.description,
      image: body.image,
      galleryImages: body.galleryImages,
      price: body.price,
      active: body.active,
      items: body.items,
      createdByName: body.createdByName || access.user.fullName,
    });
    return Response.json(combo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear combo";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const access = await requirePermission("MODULE_COMBOS", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    description?: string;
    image?: string;
    galleryImages?: string[];
    price?: number;
    active?: boolean;
    items?: { productId: string; quantity: number }[];
    createdByName?: string;
  };

  if (!body.id) return Response.json({ error: "Falta id" }, { status: 400 });

  try {
    const combo = await updateCombo(body.id, {
      name: body.name,
      description: body.description,
      image: body.image,
      galleryImages: body.galleryImages,
      price: body.price,
      active: body.active,
      items: body.items,
      createdByName: body.createdByName,
    });
    return Response.json(combo);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar combo";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const access = await requirePermission("MODULE_COMBOS", "delete");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Falta id" }, { status: 400 });

  await deleteCombo(id);
  return Response.json({ ok: true });
}
