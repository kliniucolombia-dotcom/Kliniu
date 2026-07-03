import { requirePermission } from "@/lib/permissions";
import { getCampaignsForPanel } from "@/lib/panel";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requirePermission("MODULE_CAMPANAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  const sellerId = session.role === "SELLER" ? session.userId : undefined;
  const campaigns = await getCampaignsForPanel(sellerId);
  return Response.json(campaigns);
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_CAMPANAS", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json() as {
    name: string; sellerId: string; productId?: string;
    investment: number; sales: number; targetMultiple: number;
    platform: string; notes?: string; status: string;
  };

  if (!body.name) return Response.json({ error: "Nombre requerido" }, { status: 400 });

  const sellerId = session.role === "SELLER" ? session.userId : (body.sellerId || session.userId);

  const campaign = await prisma.campaign.create({
    data: {
      name: body.name,
      sellerId,
      productId: body.productId || null,
      investment: body.investment ?? 0,
      sales: body.sales ?? 0,
      leads: (body as { leads?: number }).leads ?? 0,
      targetMultiple: body.targetMultiple ?? 10,
      platform: body.platform ?? "Meta Ads",
      notes: body.notes ?? null,
      status: body.status ?? "ACTIVE",
    },
  });

  return Response.json(campaign);
}
