import { requireRRHH } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { sanitizeFieldsSchema } from "@/lib/tickets";
import { broadcastPanelUpdate } from "@/lib/realtime";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRRHH();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  if (!prisma) return Response.json({ error: "Base de datos no disponible" }, { status: 500 });

  const { id } = await params;
  const body = await request.json();
  const { name, icon, defaultResponsibleId, allowedDepartmentIds, active, fieldsSchema } = body as {
    name?: string;
    icon?: string | null;
    defaultResponsibleId?: string | null;
    allowedDepartmentIds?: string[];
    active?: boolean;
    fieldsSchema?: unknown;
  };

  const updated = await prisma.requestCategory.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(icon !== undefined ? { icon: icon?.trim() || null } : {}),
      ...(defaultResponsibleId !== undefined ? { defaultResponsibleId: defaultResponsibleId || null } : {}),
      ...(allowedDepartmentIds !== undefined ? { allowedDepartmentIds } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(fieldsSchema !== undefined ? { fieldsSchema: sanitizeFieldsSchema(fieldsSchema) as never } : {}),
    },
  });
  broadcastPanelUpdate("rrhh").catch(() => {});
  return Response.json(updated);
}
