import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createCampaignDailyEntry, getCampaignDailyEntries } from "@/lib/panel";
import { buildCampaignDailyRows, calcCampaignDailyTotals } from "@/lib/panel-utils";

async function assertAccess(campaignId: string, session: { role: string; userId: string }) {
  if (!prisma) return null;
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { error: "Campaña no encontrada", status: 404 as const };
  if (session.role === "SELLER" && campaign.sellerId !== session.userId) {
    return { error: "Sin permiso", status: 403 as const };
  }
  return null;
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const { id } = await params;
  const denied = await assertAccess(id, session);
  if (denied) return Response.json({ error: denied.error }, { status: denied.status });

  const entries = await getCampaignDailyEntries(id);
  const rows = buildCampaignDailyRows(entries);
  const totals = calcCampaignDailyTotals(entries);

  return Response.json({ rows, totals });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_CAMPANAS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const { id } = await params;
  const denied = await assertAccess(id, session);
  if (denied) return Response.json({ error: denied.error }, { status: denied.status });

  const body = await request.json() as {
    fecha: string; mensajes?: number; transacciones?: number;
    presupuestoPublicidad?: number; ventaDelDia?: number;
  };
  if (!body.fecha) return Response.json({ error: "Fecha requerida" }, { status: 400 });

  try {
    const created = await createCampaignDailyEntry(id, body);
    return Response.json(created);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    if (msg === "FECHA_INVALIDA") return Response.json({ error: "Fecha inválida" }, { status: 400 });
    if (msg.includes("Unique constraint")) return Response.json({ error: "Ya existe un registro para esa fecha" }, { status: 409 });
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
