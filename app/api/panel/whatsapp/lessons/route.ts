import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { apiHandler } from "@/lib/api-handler";
import { FACTUAL_GUARD } from "@/lib/wati-lessons";

// Quién puede proponer lecciones a mano: vendedores y superadmin.
const PROPOSER_ROLES = ["SELLER", "SUPERADMIN"];
const PROPOSABLE = ["VOCABULARIO", "ERROR", "ESTILO", "PROCESO", "VENTA"] as const;

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_WHATSAPP", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "DB no configurada" }, { status: 500 });

  const status = new URL(request.url).searchParams.get("status");
  const where =
    status === "PENDING" || status === "APPROVED" || status === "REJECTED" ? { status } satisfies { status: typeof status } : {};

  const [lessons, grouped] = await Promise.all([
    prisma.watiLesson.findMany({ where, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.watiLesson.groupBy({ by: ["status"], _count: true }),
  ]);
  const counts = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const row of grouped) counts[row.status] = row._count;

  const ids = [...new Set(lessons.map((l) => l.proposedById).filter((id): id is string => !!id))];
  const users = ids.length ? await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, fullName: true } }) : [];
  const names = new Map(users.map((u) => [u.id, u.fullName]));

  return Response.json({
    lessons: lessons.map((l) => ({ ...l, proposedByName: l.proposedById ? names.get(l.proposedById) ?? "Asesor" : null })),
    counts,
    canApprove: access.user.role === "SUPERADMIN",
    canPropose: PROPOSER_ROLES.includes(access.user.role),
  });
}

// Propuesta manual. Las del superadmin entran aprobadas; las de vendedores quedan pendientes.
// Si el texto toca datos comerciales/legales queda como REVISAR (nunca llega al bot como regla).
export const POST = apiHandler(async (request: Request) => {
  const access = await requirePermission("MODULE_WHATSAPP", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!PROPOSER_ROLES.includes(access.user.role)) return Response.json({ error: "Solo vendedores y superadmin pueden proponer lecciones" }, { status: 403 });
  if (!prisma) return Response.json({ error: "DB no configurada" }, { status: 500 });

  const body = (await request.json().catch(() => ({}))) as { text?: unknown; category?: unknown; note?: unknown };
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";
  if (text.length < 10 || text.length > 500) return Response.json({ error: "La lección debe tener entre 10 y 500 caracteres" }, { status: 400 });
  if (!PROPOSABLE.includes(body.category as (typeof PROPOSABLE)[number])) return Response.json({ error: "Categoría inválida" }, { status: 400 });

  const duplicate = await prisma.watiLesson.findFirst({ where: { text: { equals: text, mode: "insensitive" }, status: { not: "REJECTED" } }, select: { id: true } });
  if (duplicate) return Response.json({ error: "Ya existe una lección igual" }, { status: 409 });

  const flagged = FACTUAL_GUARD.test(text);
  const approved = access.user.role === "SUPERADMIN" && !flagged;
  const lesson = await prisma.watiLesson.create({
    data: {
      text,
      category: flagged ? "REVISAR" : (body.category as (typeof PROPOSABLE)[number]),
      status: approved ? "APPROVED" : "PENDING",
      evidence: note || `Propuesta manual de ${access.user.fullName}`,
      proposedById: access.user.id,
      ...(approved ? { reviewedById: access.user.id, reviewedAt: new Date() } : {}),
    },
  });
  return Response.json(lesson, { status: 201 });
});
