import { requirePermission } from "@/lib/permissions";
import { loadCalendar } from "@/lib/commercial-calendar-data";
import { bogotaNow } from "@/lib/commercial-calendar";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_CAMPANAS", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? bogotaNow().key.slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return Response.json({ error: "Mes inválido" }, { status: 400 });

  try {
    const data = await loadCalendar({
      month,
      session: access.session,
      sellerId: searchParams.get("sellerId") || undefined,
      platform: searchParams.get("platform") || undefined,
    });
    return Response.json({ ...data, role: access.session.role, userId: access.session.userId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al cargar el calendario";
    return Response.json({ error: message }, { status: 500 });
  }
}
