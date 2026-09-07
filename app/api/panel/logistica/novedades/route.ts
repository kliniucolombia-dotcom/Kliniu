import { requirePermission } from "@/lib/permissions";
import { createIncident } from "@/lib/logistics";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    vehicleId?: string;
    driverId?: string;
    date?: string;
    type?: string;
    description?: string;
    correctiveAction?: string;
  };
  if (!body.date || !body.type?.trim() || !body.description?.trim()) {
    return Response.json({ error: "Faltan datos (date, type, description)" }, { status: 400 });
  }

  const incident = await createIncident({ ...body, date: body.date, type: body.type, description: body.description, userId: access.user.id });
  return Response.json({ incident });
}
