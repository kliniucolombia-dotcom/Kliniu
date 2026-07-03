import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { createQuotation, getQuotations } from "@/lib/panel";

export async function GET() {
  const access = await requirePermission("MODULE_COTIZACIONES", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ quotations: [] });

  const quotations = await getQuotations(session);
  return Response.json({ quotations });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_COTIZACIONES", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json().catch(() => ({})) as { clientId?: string };
  if (!body.clientId) return Response.json({ error: "Cliente requerido" }, { status: 400 });

  const created = await createQuotation(session.userId, body.clientId);
  return Response.json(created);
}
