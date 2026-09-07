import { requirePermission, getEffectivePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  getMaintenanceKpis,
  listEquipment,
  listInventory,
  listMachinesForEquipment,
  listOrders,
  listQuotes,
} from "@/lib/maintenance";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || to < from) {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const [equipment, machines, orders, inventory, quotes, kpis, permission, technicians] = await Promise.all([
    listEquipment(),
    listMachinesForEquipment(),
    listOrders(from, to),
    listInventory(),
    listQuotes(),
    getMaintenanceKpis(from, to),
    getEffectivePermission(access.user, "MODULE_MANTENIMIENTO"),
    prisma!.user.findMany({
      where: { role: { in: ["MANTENIMIENTO", "JEFE_OPERACIONES"] }, status: "ACTIVE" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  return Response.json({ equipment, machines, orders, inventory, quotes, kpis, permission, technicians });
}
