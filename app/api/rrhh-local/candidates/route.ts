import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const candidates = await prisma.candidate.findMany({
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { fullName: true } } },
  });
  return Response.json(candidates);
}

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const { fullName, email, phone, position, source, notes, resumeUrl } = body as {
    fullName?: string;
    email?: string;
    phone?: string;
    position?: string;
    source?: string;
    notes?: string;
    resumeUrl?: string;
  };

  if (!fullName?.trim() || !position?.trim()) {
    return Response.json({ error: "El nombre y el cargo son obligatorios" }, { status: 400 });
  }

  const candidate = await prisma.candidate.create({
    data: {
      fullName: fullName.trim(),
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      position: position.trim(),
      source: source?.trim() || null,
      notes: notes?.trim() || null,
      resumeUrl: resumeUrl?.trim() || null,
      createdById: access.user.id,
    },
    include: { createdBy: { select: { fullName: true } } },
  });

  return Response.json(candidate, { status: 201 });
}
