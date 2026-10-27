import { requireSuperAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { apiHandler } from "@/lib/api-handler";
import type { Prisma } from "@/generated/prisma/client";

const PAGE = 100;
// Bogotá es UTC-5 todo el año: el día "2026-10-27" empieza a las 05:00 UTC.
const dayStart = (d: string) => new Date(`${d}T05:00:00.000Z`);

export const GET = apiHandler(async (request: Request) => {
  const access = await requireSuperAdmin();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Sin base de datos" }, { status: 503 });

  const sp = new URL(request.url).searchParams;
  const q = sp.get("q")?.trim();
  const group = sp.get("group")?.trim(); // product | auth | user | appconfig
  const from = sp.get("from");
  const to = sp.get("to");
  const before = sp.get("before");

  const createdAt: Prisma.DateTimeFilter = {};
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) createdAt.gte = dayStart(from);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) createdAt.lt = new Date(dayStart(to).getTime() + 24 * 3600 * 1000);
  if (before && !Number.isNaN(Date.parse(before))) createdAt.lt = new Date(before);

  const where: Prisma.AuditLogWhereInput = {
    ...(q ? { actorEmail: { contains: q, mode: "insensitive" } } : {}),
    ...(group && /^[a-z]+$/.test(group) ? { action: { startsWith: `${group}.` } } : {}),
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
  };

  const rows = await prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take: PAGE + 1 });
  const hasMore = rows.length > PAGE;
  return Response.json({ rows: rows.slice(0, PAGE), hasMore });
});
