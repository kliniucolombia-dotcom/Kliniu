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

  const maintenancePermission = await getEffectivePermission(access.user, "MODULE_MANTENIMIENTO");
  // Quien solo consulta ve únicamente las órdenes que tiene asignadas, salvo el
  // líder de inyección: supervisa su planta y necesita el detalle completo.
  const seesAllOrders =
    access.user.role === "SUPERADMIN" ||
    access.user.role === "LIDER_INYECCION" ||
    maintenancePermission.canEdit;

  const [equipment, machines, orders, inventory, quotes, kpis, permission, technicians, molds] = await Promise.all([
    listEquipment(),
    listMachinesForEquipment(),
    listOrders(from, to, seesAllOrders ? undefined : access.user.id),
    listInventory(),
    listQuotes(),
    getMaintenanceKpis(from, to),
    maintenancePermission,
    prisma!.user.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { role: { in: ["MANTENIMIENTO", "JEFE_OPERACIONES", "LIDER_ENSAMBLE", "LIDER_INYECCION", "INGENIERIA", "LOGISTICA", "OPERARIO"] } },
          // Personal de Inyección (p. ej. bodega de inyección) con otro rol.
          { department: "Inyección", role: { not: "CUSTOMER" } },
        ],
      },
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
