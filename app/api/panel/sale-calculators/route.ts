import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSaleCalculator, getSaleCalculators } from "@/lib/panel";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ calculators: [] });

  const calculators = await getSaleCalculators(session.userId);
  return Response.json({ calculators });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json().catch(() => ({})) as { name?: string };
  const created = await createSaleCalculator(session.userId, body.name);
  return Response.json(created);
}
