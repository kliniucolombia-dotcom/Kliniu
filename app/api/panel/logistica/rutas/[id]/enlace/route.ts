import { randomBytes } from "node:crypto";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Devuelve el token del enlace del conductor; lo crea la primera vez.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no configurada" }, { status: 503 });

  const { id } = await params;
  const route = await prisma.deliveryRoute.findUnique({ where: { id }, select: { trackToken: true } });
  if (!route) return Response.json({ error: "Ruta no encontrada" }, { status: 404 });
  const token = route.trackToken ?? randomBytes(24).toString("base64url");
  if (!route.trackToken) await prisma.deliveryRoute.update({ where: { id }, data: { trackToken: token } });
  return Response.json({ token });
}
