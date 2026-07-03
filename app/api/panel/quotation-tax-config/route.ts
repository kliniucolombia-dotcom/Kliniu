import { requirePermission, requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getQuotationTaxConfig, updateQuotationTaxConfig } from "@/lib/panel";

export async function GET() {
  const access = await requirePermission("MODULE_COTIZACIONES", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const cfg = await getQuotationTaxConfig();
  return Response.json(cfg);
}

export async function PATCH(request: Request) {
  const access = await requireAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json().catch(() => ({})) as {
    reteIcaPct?: number; reteFuentePct?: number; ivaPct?: number;
  };

  const updated = await updateQuotationTaxConfig(body);
  return Response.json(updated);
}
