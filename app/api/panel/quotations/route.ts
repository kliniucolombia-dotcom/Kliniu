import { getSessionFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createQuotation, getQuotations } from "@/lib/panel";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ quotations: [] });

  const quotations = await getQuotations(session);
  return Response.json({ quotations });
}

export async function POST(request: Request) {
  const session = await getSessionFromCookies();
  if (!session || (session.role !== "ADMIN" && session.role !== "SELLER")) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const body = await request.json().catch(() => ({})) as { clientId?: string };
  if (!body.clientId) return Response.json({ error: "Cliente requerido" }, { status: 400 });

  const created = await createQuotation(session.userId, body.clientId);
  return Response.json(created);
}
