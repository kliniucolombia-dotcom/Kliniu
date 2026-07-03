import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getQuotationTaxConfig, updateQuotationTaxConfig } from "@/lib/panel";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const cfg = await getQuotationTaxConfig();
  return Response.json(cfg);
}

export async function PATCH(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json().catch(() => ({})) as {
    reteIcaPct?: number; reteFuentePct?: number; ivaPct?: number;
  };

  const updated = await updateQuotationTaxConfig(body);
  return Response.json(updated);
}
