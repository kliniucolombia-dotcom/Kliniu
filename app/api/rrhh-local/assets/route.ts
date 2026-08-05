import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

const TYPES = ["COMPUTO", "MOVIL", "UNIFORME", "EPP", "HERRAMIENTA", "MOBILIARIO", "VEHICULO", "OTRO"] as const;

export async function GET() {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const include = {
    employee: { include: { user: { select: { fullName: true } }, department: { select: { name: true } } } },
    createdBy: { select: { fullName: true } },
  } as const;

  if (isRRHH(access.user)) {
    const assets = await prisma.employeeAsset.findMany({ orderBy: { deliveredAt: "desc" }, include });
    return Response.json(assets);
  }

  // Un colaborador solo ve la dotación que tiene asignada.
  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const assets = await prisma.employeeAsset.findMany({
    where: { employeeId: employee.id },
    orderBy: { deliveredAt: "desc" },
    include,
  });
  return Response.json(assets);
}

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });
  if (!isRRHH(access.user)) return Response.json({ error: "No autorizado" }, { status: 403 });

  const body = await request.json();
  const { employeeId, type, name, serial, deliveredAt, notes } = body as {
    employeeId?: string;
    type?: string;
    name?: string;
    serial?: string;
    deliveredAt?: string;
    notes?: string;
  };

  if (!employeeId || !name?.trim()) {
    return Response.json({ error: "El colaborador y la descripción son obligatorios" }, { status: 400 });
  }
  if (type && !TYPES.includes(type as (typeof TYPES)[number])) {
    return Response.json({ error: "Tipo de dotación inválido" }, { status: 400 });
  }

  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) return Response.json({ error: "Colaborador no encontrado" }, { status: 404 });

  const delivered = deliveredAt ? new Date(deliveredAt) : new Date();
  if (Number.isNaN(delivered.getTime())) {
    return Response.json({ error: "Fecha de entrega inválida" }, { status: 400 });
  }

  const asset = await prisma.employeeAsset.create({
    data: {
      employeeId,
      type: (type as never) || "OTRO",
      name: name.trim(),
      serial: serial?.trim() || null,
      deliveredAt: delivered,
      notes: notes?.trim() || null,
      createdById: access.user.id,
    },
    include: {
      employee: { include: { user: { select: { fullName: true } }, department: { select: { name: true } } } },
      createdBy: { select: { fullName: true } },
    },
  });

  return Response.json(asset, { status: 201 });
}
