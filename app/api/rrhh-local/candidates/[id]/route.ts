import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const STAGES = ["POSTULADO", "ENTREVISTA", "PRUEBA", "OFERTA", "CONTRATADO", "DESCARTADO"] as const;
type Stage = (typeof STAGES)[number];

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { stage, notes } = body as { stage?: string; notes?: string };

  const existing = await prisma.candidate.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Candidato no encontrado" }, { status: 404 });

  if (stage !== undefined && !STAGES.includes(stage as Stage)) {
    return Response.json({ error: "Etapa inválida" }, { status: 400 });
  }

  const updated = await prisma.candidate.update({
    where: { id },
    data: {
      stage: stage !== undefined ? (stage as never) : existing.stage,
      notes: notes !== undefined ? notes.trim() || null : existing.notes,
    },
    include: { createdBy: { select: { fullName: true } } },
  });

  return Response.json(updated);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.candidate.findUnique({ where: { id } });
  if (!existing) return Response.json({ error: "Candidato no encontrado" }, { status: 404 });

  await prisma.candidate.delete({ where: { id } });
  return Response.json({ deleted: true });
}
