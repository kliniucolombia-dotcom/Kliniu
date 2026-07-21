import { requireActiveUser } from "@/lib/permissions";
import { isRRHH } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;

  // El empleado solo puede borrar documentos que él mismo subió; RRHH puede borrar cualquiera.
  if (!isRRHH(access.user)) {
    const employee = await prisma.employee.findUnique({ where: { userId: access.user.id } });
    const document = await prisma.employeeDocument.findUnique({ where: { id } });
    if (!employee || !document || document.employeeId !== employee.id || !document.uploadedBySelf) {
      return Response.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  await prisma.employeeDocument.delete({ where: { id } });
  return Response.json({ ok: true });
}
