import { isRRHH } from "@/lib/roles";
import { requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const employeeIdParam = new URL(request.url).searchParams.get("employeeId");

  if (isRRHH(access.user)) {
    const documents = await prisma.employeeDocument.findMany({
      where: employeeIdParam ? { employeeId: employeeIdParam } : undefined,
      orderBy: { createdAt: "desc" },
      include: { employee: { include: { user: { select: { fullName: true } } } } },
    });
    return Response.json(documents);
  }

  const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
  if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });

  const documents = await prisma.employeeDocument.findMany({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
  });
  return Response.json(documents);
}

export async function POST(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const body = await request.json();
  const { employeeId, category, name, fileUrl, fileName, fileSize, expiresAt } = body as {
    employeeId?: string;
    category?: string;
    name?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    expiresAt?: string;
  };

  // RRHH puede cargar documentos a cualquier empleado; el empleado solo a sí mismo.
  let targetEmployeeId = employeeId;
  let uploadedBySelf = false;

  if (!isRRHH(access.user)) {
    const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
    if (!employee) return Response.json({ error: "No tienes un perfil de empleado" }, { status: 403 });
    targetEmployeeId = employee.id;
    uploadedBySelf = true;

    // El empleado solo puede registrar archivos que él mismo subió: /api/rrhh-local/time-off/upload
    // los guarda en `${userId}/...`. Sin esta validación podría apuntar la fila al archivo privado
    // de otra persona y RRHH lo abriría desde el panel bajo su nombre.
    if (!fileUrl?.startsWith(`${access.user.id}/`) || fileUrl.includes("..")) {
      return Response.json({ error: "El archivo no corresponde a una carga tuya" }, { status: 403 });
    }
  }

  if (!targetEmployeeId || !category || !name?.trim() || !fileUrl || !fileName) {
    return Response.json({ error: "employeeId, category, name y el archivo son obligatorios" }, { status: 400 });
  }

  const document = await prisma.employeeDocument.create({
    data: {
      employeeId: targetEmployeeId,
      category: category as never,
      name: name.trim(),
      fileUrl,
      fileName,
      fileSize: typeof fileSize === "number" ? fileSize : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      uploadedBySelf,
    },
  });
  return Response.json(document, { status: 201 });
}
