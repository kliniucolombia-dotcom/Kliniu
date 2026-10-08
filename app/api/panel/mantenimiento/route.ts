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
import { parseDateRange } from "@/lib/operations-validation";

export async function GET(request: Request) {
  const access = await requirePermission("MODULE_MANTENIMIENTO", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  try { parseDateRange(from, to); } catch {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const [equipment, machines, orders, inventory, quotes, kpis, permission, technicians, molds] = await Promise.all([
    listEquipment(),
    listMachinesForEquipment(),
    listOrders(from, to, access.user.role !== "SUPERADMIN" && !(await getEffectivePermission(access.user, "MODULE_MANTENIMIENTO")).canEdit ? access.user.id : undefined),
    listInventory(),
    listQuotes(),
    getMaintenanceKpis(from, to),
    getEffectivePermission(access.user, "MODULE_MANTENIMIENTO"),
    prisma!.user.findMany({
      where: { role: { in: ["MANTENIMIENTO", "JEFE_OPERACIONES", "LIDER_ENSAMBLE", "LIDER_INYECCION", "INGENIERIA", "LOGISTICA", "OPERARIO"] }, status: "ACTIVE" },
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
    prisma!.mold.findMany({
      where: { equipment: { none: {} } },
      select: { id: true, code: true, name: true },
      orderBy: { code: "asc" },
    }),
  ]);

  return Response.json({ equipment, machines, orders, inventory, quotes, kpis, permission, technicians, molds });
}
