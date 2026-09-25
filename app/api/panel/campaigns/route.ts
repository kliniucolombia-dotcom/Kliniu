import { sellerBlockedFromCampaign } from "@/lib/campaign-access";
import { requirePermission } from "@/lib/permissions";
import { getCampaignsForPanel } from "@/lib/panel";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { broadcastPanelUpdate } from "@/lib/realtime";
import { revalidateTag } from "next/cache";
import { DASHBOARD_STATS_TAG } from "@/lib/cache-tags";

export async function GET() {
  const access = await requirePermission("MODULE_CAMPANAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  try {
    const campaigns = await getCampaignsForPanel();
    const { session } = access;
    // Un SELLER solo puede editar/eliminar sus campañas (el PATCH/DELETE lo exigen); la UI usa canEdit/canDelete
    return Response.json(campaigns.map((c) => {
      const canManage = !sellerBlockedFromCampaign(session, c.seller.id);
      return { ...c, canEdit: canManage, canDelete: canManage };
    }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar campañas";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_CAMPANAS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json() as {
    name: string; sellerId: string; productId?: string; comboId?: string;
    investment: number; sales: number; targetMultiple: number;
    platform: string; notes?: string; status: string;
    startDate?: string; endDate?: string;
  };

  if (!body.name) return Response.json({ error: "Nombre requerido" }, { status: 400 });

  const sellerId = session.role === "SELLER" ? session.userId : (body.sellerId || session.userId);

  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      sellerId,
      productId: body.productId || null,
      comboId: body.comboId || null,
      investment: body.investment ?? 0,
      sales: body.sales ?? 0,
      leads: (body as { leads?: number }).leads ?? 0,
      targetMultiple: body.targetMultiple ?? 10,
      platform: body.platform ?? "Meta Ads",
      notes: body.notes ?? null,
      status: body.status ?? "ACTIVE",
      ...(body.startDate ? { startDate: new Date(body.startDate) } : {}),
      endDate: body.endDate ? new Date(body.endDate) : null,
    },
  });

  createNotification({
    eventKey: "campaign.active",
    title: "Nueva campaña creada",
    detail: body.name,
    href: "/panel/campanas",
    createdById: session.userId,
    metadata: { campaignId: campaign.id, platform: body.platform },
  }).catch(() => {});

  broadcastPanelUpdate("campaigns").catch(() => {});

  revalidateTag(DASHBOARD_STATS_TAG, "max");

  return Response.json(campaign);
}
