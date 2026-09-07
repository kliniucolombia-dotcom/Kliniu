import { requirePermission } from "@/lib/permissions";
import { updateDriver } from "@/lib/logistics";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { fullName?: string; phone?: string | null; active?: boolean };
  const driver = await updateDriver(id, body);
  return Response.json({ driver });
}
