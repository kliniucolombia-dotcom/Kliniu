import { requirePermission } from "@/lib/permissions";
import { updateIncident } from "@/lib/logistics";
import type { TransportIncidentStatus } from "@/generated/prisma/client";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "edit");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { id } = await params;
  const body = (await request.json()) as { status?: TransportIncidentStatus; correctiveAction?: string | null };
  if (body.status && body.status !== "OPEN" && body.status !== "RESOLVED") {
    return Response.json({ error: "Estado inválido" }, { status: 400 });
  }

  const incident = await updateIncident(id, body);
  return Response.json({ incident });
}
