import { requirePermission } from "@/lib/permissions";
import { listChecklistEntries, upsertChecklistEntry } from "@/lib/logistics";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const url = new URL(request.url);
  const vehicleId = url.searchParams.get("vehicleId") ?? "";
  const month = url.searchParams.get("month") ?? "";
  if (!vehicleId || !/^\d{4}-\d{2}$/.test(month)) {
    return Response.json({ error: "Faltan datos (vehicleId, month)" }, { status: 400 });
  }

  const entries = await listChecklistEntries(vehicleId, month);
  return Response.json({ entries });
}

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_LOGISTICA", "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const body = (await request.json()) as {
    vehicleId?: string;
    driverId?: string;
    date?: string;
    items?: Record<string, "B" | "M" | "NA">;
    initials?: string;
    notes?: string;
  };
  if (!body.vehicleId || !body.driverId || !body.date || !body.items) {
    return Response.json({ error: "Faltan datos (vehicleId, driverId, date, items)" }, { status: 400 });
  }

  const entry = await upsertChecklistEntry({
    vehicleId: body.vehicleId,
    driverId: body.driverId,
    date: body.date,
    items: body.items,
    initials: body.initials,
    notes: body.notes,
    userId: access.user.id,
  });
  return Response.json({ entry });
}
