import { getEffectivePermissions, requireActiveUser } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getLogisticsKpis } from "@/lib/logistics";
import { getMaintenanceKpis } from "@/lib/maintenance";
import { getMoldKpis } from "@/lib/molds";
import { listAuthorizedOperationsReports } from "@/lib/operations-reports";
import { operationsModulesWithView } from "@/lib/operations-report-policy";
import { listProductsWithWarehouseStock, getWarehouses, summarizeWarehouseStock } from "@/lib/warehouses";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const perms = await getEffectivePermissions(access.user);
  const visible = {
    logistica: perms.MODULE_LOGISTICA?.canView ?? false,
    mantenimiento: perms.MODULE_MANTENIMIENTO?.canView ?? false,
    produccion: perms.MODULE_PRODUCCION?.canView ?? false,
    bodegas: perms.MODULE_BODEGAS?.canView ?? false,
  };
  if (!Object.values(visible).some(Boolean)) {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || to < from) {
    return Response.json({ error: "Rango de fechas inválido" }, { status: 400 });
  }

  const [logistica, mantenimiento, moldes, reports, warehouses, products, productionOrders] = await Promise.all([
    visible.logistica ? getLogisticsKpis(from, to) : null,
    visible.mantenimiento ? getMaintenanceKpis(from, to) : null,
    visible.produccion ? getMoldKpis(from, to) : null,
    listAuthorizedOperationsReports(operationsModulesWithView(perms), 20),
    visible.bodegas ? getWarehouses() : null,
    visible.bodegas ? listProductsWithWarehouseStock() : null,
    visible.produccion
      ? prisma!.productionOrder.groupBy({ by: ["status"], _count: { _all: true } })
      : null,
  ]);

  const bodegas = warehouses && products ? summarizeWarehouseStock(warehouses, products) : null;

  const coverage = await prisma!.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["DIRECTOR_OPERACIONES", "JEFE_OPERACIONES", "LOGISTICA", "LIDER_ENSAMBLE", "LIDER_INYECCION", "MANTENIMIENTO", "BODEGA"] },
    },
    select: {
      id: true,
      fullName: true,
      role: true,
      department: true,
      backupUser: { select: { fullName: true, role: true } },
    },
    orderBy: [{ department: "asc" }, { fullName: "asc" }],
  });

  const produccion = moldes
    ? {
        ...moldes,
        ordersByStatus: (productionOrders ?? []).map((o) => ({ status: o.status, count: o._count._all })),
      }
    : null;

  return Response.json({ visible, logistica, mantenimiento, produccion, bodegas, reports, coverage });
}
