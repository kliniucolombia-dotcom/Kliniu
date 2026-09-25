import { requirePermission } from "@/lib/permissions";
import { closeSellerDay } from "@/lib/commercial-calendar-data";
import { bogotaNow } from "@/lib/commercial-calendar";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_CAMPANAS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;

  const body = await request.json().catch(() => ({})) as { sellerId?: string; date?: string; noSales?: boolean };
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) return Response.json({ error: "Fecha inválida" }, { status: 400 });
  if (body.date > bogotaNow().key) return Response.json({ error: "No se puede cerrar un día futuro" }, { status: 400 });

  const sellerId = session.role === "SELLER" ? session.userId : body.sellerId || session.userId;
  try {
    const close = await closeSellerDay({ sellerId, date: body.date, noSales: body.noSales ?? true, actorId: session.userId });
    broadcastPanelUpdate("campaigns").catch(() => {});
    return Response.json(close);
  } catch {
    return Response.json({ error: "No se pudo cerrar el día" }, { status: 500 });
  }
}
