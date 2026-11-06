import { sellerHasFullAccess } from "@/lib/campaign-access";
import { CoordinadoraError, createGuide, getGuidePdf } from "@/lib/coordinadora";
import { getCoordinadoraCityCode } from "@/lib/dane";
import { updateOrderShipping } from "@/lib/orders";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/rate-limit";
import { broadcastPanelUpdate } from "@/lib/realtime";

const CARRIER = "Coordinadora";
type Params = { params: Promise<{ id: string }> };

async function loadOrder(id: string, permission: "view" | "edit") {
  const access = await requirePermission("MODULE_PEDIDOS", permission);
  if (!access.ok) return { error: Response.json({ error: "No autorizado" }, { status: access.status }) };
  if (!prisma) return { error: Response.json({ error: "DB no disponible" }, { status: 503 }) };
  const order = await prisma.order.findUnique({ where: { id }, include: { items: { select: { name: true, quantity: true } } } });
  if (!order) return { error: Response.json({ error: "Pedido no encontrado" }, { status: 404 }) };
  const { session } = access;
  if (session.role === "SELLER" && order.assignedSellerId !== session.userId && !sellerHasFullAccess(session.userId)) {
    return { error: Response.json({ error: "Sin permiso" }, { status: 403 }) };
  }
  return { access, order };
}

function toNumber(v: unknown, min: number, max: number) {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/** Genera la guía en Coordinadora y la guarda como carrier + trackingNumber del pedido. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const loaded = await loadOrder(id, "edit");
  if ("error" in loaded) return loaded.error;
  const { access, order } = loaded;

  if (order.trackingNumber && order.carrier === CARRIER) {
    return Response.json({ error: `El pedido ya tiene la guía ${order.trackingNumber}` }, { status: 409 });
  }
  if (order.shippingStatus === "CANCELLED") {
    return Response.json({ error: "El pedido está cancelado" }, { status: 400 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const paquete = {
    pesoKg: toNumber(body.pesoKg, 0.1, 1000),
    largoCm: toNumber(body.largoCm, 1, 500),
    anchoCm: toNumber(body.anchoCm, 1, 500),
    altoCm: toNumber(body.altoCm, 1, 500),
    unidades: toNumber(body.unidades, 1, 999),
  };
  if (Object.values(paquete).some((v) => v === null)) {
    return Response.json({ error: "Revisa peso, medidas y unidades de la caja" }, { status: 400 });
  }

  const codigoCiudad = getCoordinadoraCityCode(order.department, order.city);
  if (!codigoCiudad) {
    return Response.json(
      { error: `No se reconoce la ciudad "${order.city}, ${order.department}". Corrígela antes de generar la guía.` },
      { status: 400 },
    );
  }

  const contenido = order.items.map((i) => `${i.quantity} x ${i.name}`).join(", ").slice(0, 200) || "Productos Kliniu";
  const direccion = [order.addressLine1, order.addressLine2].filter(Boolean).join(", ");

  let codigo: string;
  try {
    codigo = await createGuide({
      orderId: order.id,
      valor: order.subtotal,
      contenido,
      observaciones: order.notes,
      destinatario: { nombre: order.company || order.customerName, direccion, codigoCiudad, celular: order.customerPhone },
      paquete: paquete as { pesoKg: number; largoCm: number; anchoCm: number; altoCm: number; unidades: number },
    });
  } catch (error) {
    const message = error instanceof CoordinadoraError ? error.message : "No fue posible conectar con Coordinadora";
    console.error("[coordinadora] crear guía", order.id, error);
    return Response.json({ error: message }, { status: 502 });
  }

  // La guía ya existe en Coordinadora: si esto falla, el número queda en el error para no perderlo.
  try {
    const updated = await updateOrderShipping(
      order.id,
      {
        shippingStatus: order.shippingStatus === "PENDING" ? "PREPARING" : order.shippingStatus,
        carrier: CARRIER,
        trackingNumber: codigo,
        adminNotes: order.adminNotes ?? undefined,
      },
      { actorId: access.session.userId, actorEmail: access.user.email, ip: getClientIp(request) },
    );
    await broadcastPanelUpdate("orders");
    return Response.json(updated);
  } catch (error) {
    console.error("[coordinadora] guardar guía", order.id, codigo, error);
    return Response.json({ error: `Guía ${codigo} creada pero no se guardó en el pedido. Anótala.` }, { status: 500 });
  }
}

/** Descarga el PDF del rótulo. */
export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const loaded = await loadOrder(id, "view");
  if ("error" in loaded) return loaded.error;
  const { order } = loaded;
  if (!order.trackingNumber || order.carrier !== CARRIER) {
    return Response.json({ error: "El pedido no tiene guía de Coordinadora" }, { status: 404 });
  }
  try {
    const pdf = await getGuidePdf(order.trackingNumber);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="guia-${order.trackingNumber}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof CoordinadoraError ? error.message : "No fue posible descargar la guía";
    return Response.json({ error: message }, { status: 502 });
  }
}
