import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const TYPES = ["SEGUIMIENTO", "LLAMADO_ATENCION", "RECONOCIMIENTO", "OTRO"] as const;

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const employeeId = new URL(request.url).searchParams.get("employeeId");

  const notes = await prisma.employeeNote.findMany({
    where: employeeId ? { employeeId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      employee: { include: { user: { select: { fullName: true } } } },
      author: { select: { fullName: true } },
    },
  });
  return Response.json(notes);
}

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const { employeeId, type, note } = body as { employeeId?: string; type?: string; note?: string };

  if (!employeeId || !note?.trim()) {
    return Response.json({ error: "El colaborador y la nota son obligatorios" }, { status: 400 });
  }
  if (type && !TYPES.includes(type as (typeof TYPES)[number])) {
    return Response.json({ error: "Tipo de nota inválido" }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return Response.json({ error: "Colaborador no encontrado" }, { status: 404 });

  const created = await prisma.employeeNote.create({
    data: {
      employeeId,
      authorId: access.user.id,
      type: (type as never) || "SEGUIMIENTO",
      note: note.trim(),
    },
    include: {
      employee: { include: { user: { select: { fullName: true } } } },
      author: { select: { fullName: true } },
    },
  });

  return Response.json(created, { status: 201 });
}
