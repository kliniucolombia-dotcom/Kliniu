import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createSaleCalculator, getSaleCalculators } from "@/lib/panel";

export async function GET() {
  const access = await requirePermission("MODULE_CALCULADORA_PRECIO", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ calculators: [] });

  const calculators = await getSaleCalculators(session.userId);
  return Response.json({ calculators });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_CALCULADORA_PRECIO", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json().catch(() => ({})) as { name?: string };
  const created = await createSaleCalculator(session.userId, body.name);
  return Response.json(created);
}
