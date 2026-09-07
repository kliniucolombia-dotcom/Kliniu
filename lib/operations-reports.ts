import { prisma } from "@/lib/prisma";
import type { PanelModule, Prisma } from "@/generated/prisma/client";
import { parseBogotaDate } from "@/lib/logistics";

function requirePrisma() {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");
  return prisma;
}

export const OPERATIONS_REPORT_MODULES: PanelModule[] = [
  "MODULE_LOGISTICA",
  "MODULE_BODEGAS",
  "MODULE_PRODUCCION",
  "MODULE_MANTENIMIENTO",
];

export async function listOperationsReports(module?: PanelModule, take = 50) {
  return requirePrisma().operationsReport.findMany({
    where: module ? { module } : { module: { in: OPERATIONS_REPORT_MODULES } },
    orderBy: { periodStart: "desc" },
    take,
    include: { author: { select: { fullName: true, role: true } } },
  });
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
