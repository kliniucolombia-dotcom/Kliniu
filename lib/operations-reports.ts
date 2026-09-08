import { prisma } from "@/lib/prisma";
import type { PanelModule, Prisma } from "@/generated/prisma/client";
import { endOfBogotaDay, parseBogotaDate } from "@/lib/logistics";
import { getLogisticsKpis } from "@/lib/logistics";
import { getMaintenanceKpis } from "@/lib/maintenance";
import { getMoldKpis } from "@/lib/molds";
import { getAssemblyKpis } from "@/lib/assembly";
import { getWarehouses, listProductsWithWarehouseStock, summarizeWarehouseStock } from "@/lib/warehouses";
import { OPERATIONS_REPORT_MODULES, reportKpisForModule } from "@/lib/operations-report-policy";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

export { OPERATIONS_REPORT_MODULES } from "@/lib/operations-report-policy";

export async function listOperationsReports(module?: PanelModule, take = 50) {
  return requirePrisma().operationsReport.findMany({
    where: module ? { module } : { module: { in: [...OPERATIONS_REPORT_MODULES] } },
    orderBy: { periodStart: "desc" },
    take,
    include: { author: { select: { fullName: true, role: true } } },
  });
}

export async function listAuthorizedOperationsReports(modules: PanelModule[], take = 50) {
  if (modules.length === 0) return [];
  return requirePrisma().operationsReport.findMany({ where: { module: { in: modules } }, orderBy: { periodStart: "desc" }, take, include: { author: { select: { fullName: true, role: true } } } });
}

export async function buildOperationsReportKpis(module: PanelModule, from: string, to: string) {
  if (module === "MODULE_LOGISTICA") return reportKpisForModule(module, await getLogisticsKpis(from, to));
  if (module === "MODULE_MANTENIMIENTO") return reportKpisForModule(module, await getMaintenanceKpis(from, to));
  if (module === "MODULE_PRODUCCION") return reportKpisForModule(module, await getMoldKpis(from, to));
  if (module === "MODULE_ENSAMBLE") return reportKpisForModule(module, await getAssemblyKpis(parseBogotaDate(from), endOfBogotaDay(to)));
  const summary = summarizeWarehouseStock(await getWarehouses(), await listProductsWithWarehouseStock());
  return reportKpisForModule(module, { units: summary.reduce((total, warehouse) => total + warehouse.units, 0), lowStock: summary.reduce((total, warehouse) => total + warehouse.lowStock, 0) });
}

export async function createOperationsReport(input: {
  module: PanelModule;
  periodStart: string;
  periodEnd: string;
  kpis: Prisma.InputJsonValue;
  notes?: string;
  authorId: string;
}) {
  return requirePrisma().operationsReport.create({
    data: {
      module: input.module,
      periodStart: parseBogotaDate(input.periodStart),
      periodEnd: parseBogotaDate(input.periodEnd),
      kpis: input.kpis,
      notes: input.notes?.trim() || null,
      authorId: input.authorId,
    },
  });
}
