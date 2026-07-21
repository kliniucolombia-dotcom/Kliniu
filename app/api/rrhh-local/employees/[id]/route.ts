import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** Edición de datos laborales del empleado. Solo RRHH. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { managerId, site, jobTitle, departmentId, status } = body as {
    managerId?: string | null;
    site?: string | null;
    jobTitle?: string;
    departmentId?: string | null;
    status?: string;
  };

  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) return Response.json({ error: "Empleado no encontrado" }, { status: 404 });

  // Un empleado no puede ser su propio jefe.
  if (managerId && managerId === id) {
    return Response.json({ error: "Un empleado no puede ser su propio jefe" }, { status: 400 });
  }

  // Evita ciclos en la jerarquía (A reporta a B que reporta a A).
  if (managerId) {
    let cursor: string | null = managerId;
    const seen = new Set<string>([id]);
    while (cursor) {
      if (seen.has(cursor)) {
        return Response.json({ error: "La jerarquía no puede formar un ciclo" }, { status: 400 });
      }
      seen.add(cursor);
      const next: { managerId: string | null } | null = await prisma.employee.findUnique({
        where: { id: cursor },
        select: { managerId: true },
      });
      cursor = next?.managerId ?? null;
    }
  }

  const updated = await prisma.employee.update({
    where: { id },
    data: {
      managerId: managerId !== undefined ? managerId || null : undefined,
      site: site !== undefined ? site?.trim() || null : undefined,
      jobTitle: jobTitle?.trim() || undefined,
      departmentId: departmentId !== undefined ? departmentId || null : undefined,
      status: (status as never) || undefined,
    },
  });

  return Response.json(updated);
}
