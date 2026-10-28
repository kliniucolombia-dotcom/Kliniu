import { requirePermission } from "@/lib/permissions";
import { logAudit, diffChanges } from "@/lib/audit";
import { getClientIp } from "@/lib/rate-limit";
import { getCombosForPanel, getComboById, createCombo, updateCombo, deleteCombo } from "@/lib/combos";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function GET(request: Request) {
  const mine = new URL(request.url).searchParams.get("mine") === "1";
  const access = await requirePermission(mine ? "MODULE_MIS_COMBOS" : "MODULE_COMBOS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const combos = await getCombosForPanel();
  const isSuperAdmin = access.user.role === "SUPERADMIN";
  return Response.json(mine && !isSuperAdmin ? combos.filter((c) => c.createdByName === access.user.fullName) : combos);
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

  // Solo SUPERADMIN puede asignar el combo a otro vendedor; el resto queda auto-asignado a su propia cuenta.
  const createdByName = access.user.role === "SUPERADMIN"
    ? (body.createdByName || access.user.fullName)
    : access.user.fullName;

  try {
    const combo = await createCombo({
      name: body.name,
      description: body.description,
      image: body.image,
      galleryImages: body.galleryImages,
      price: body.price,
      active: body.active,
      items: body.items,
      createdByName,
    });
    await broadcastPanelUpdate("combos");
    await logAudit({
      actorId: access.user.id, actorEmail: access.user.email, action: "combo.create", entity: "combo", entityId: combo.id,
      meta: { name: combo.name, price: combo.price }, ip: getClientIp(request),
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

  // Solo SUPERADMIN puede reasignar el vendedor de un combo existente.
  const createdByName = access.user.role === "SUPERADMIN" ? body.createdByName : undefined;

  const before = await getComboById(body.id);
  try {
    const combo = await updateCombo(body.id, {
      name: body.name,
      description: body.description,
      image: body.image,
      galleryImages: body.galleryImages,
      price: body.price,
      active: body.active,
      items: body.items,
      createdByName,
    });
    await broadcastPanelUpdate("combos");
    if (before) {
      const keys = ["name", "price", "active", "createdByName"] as const;
      const changes = diffChanges(before, { name: body.name, price: body.price, active: body.active, createdByName }, keys);
      const alsoChanged = [
        ...(body.description !== undefined && body.description !== (before.description ?? "") ? ["description"] : []),
        ...(body.image !== undefined && body.image !== before.image ? ["image"] : []),
        ...(body.items && JSON.stringify(body.items.map((i) => [i.productId, i.quantity]).sort()) !==
          JSON.stringify(before.items.map((i: { productId: string; quantity: number }) => [i.productId, i.quantity]).sort()) ? ["items"] : []),
      ];
      if (Object.keys(changes).length || alsoChanged.length) {
        await logAudit({
          actorId: access.user.id, actorEmail: access.user.email, action: "combo.update", entity: "combo", entityId: body.id,
          meta: { name: combo.name, changes, alsoChanged }, ip: getClientIp(request),
        });
      }
    }
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

  const before = await getComboById(id);
  await deleteCombo(id);
  await broadcastPanelUpdate("combos");
  await logAudit({
    actorId: access.user.id, actorEmail: access.user.email, action: "combo.delete", entity: "combo", entityId: id,
    meta: { name: before?.name, price: before?.price }, ip: getClientIp(request),
  });
  return Response.json({ ok: true });
}
