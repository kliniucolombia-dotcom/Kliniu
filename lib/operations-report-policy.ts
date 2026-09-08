import type { PanelModule } from "@/generated/prisma/client";

export const OPERATIONS_REPORT_MODULES = [
  "MODULE_LOGISTICA", "MODULE_BODEGAS", "MODULE_PRODUCCION", "MODULE_MANTENIMIENTO",
] as const satisfies readonly PanelModule[];

type ViewPermissionMap = Partial<Record<PanelModule, { canView: boolean }>>;

export function operationsModulesWithView(permissions: ViewPermissionMap): PanelModule[] {
  return OPERATIONS_REPORT_MODULES.filter((module) => permissions[module]?.canView ?? false);
}

export function reportKpisForModule(module: PanelModule, source: Record<string, unknown>): Record<string, number> {
  const number = (key: string) => typeof source[key] === "number" && Number.isFinite(source[key]) ? source[key] as number : 0;
  if (module === "MODULE_LOGISTICA") return { rutasTotal: number("routesTotal"), rutasFinalizadas: number("routesDone"), pedidosEnRuta: number("ordersTotal"), pedidosEntregados: number("ordersDelivered"), costoTotal: number("costTotal"), novedadesAbiertas: number("openIncidents") };
  if (module === "MODULE_MANTENIMIENTO") return { ordenesAbiertas: number("openOrders"), preventivas: number("preventive"), correctivas: number("corrective"), completadas: number("completed"), tiempoMuertoMin: number("downtimeMinutes"), equiposFueraServicio: number("equipmentDown"), itemsBajoMinimo: number("lowStockItems") };
  if (module === "MODULE_PRODUCCION") return { cambiosCompletados: number("changesCompleted"), tiempoPromedioCambioMin: number("avgChangeMinutes"), tiempoTotalCambioMin: number("totalChangeMinutes"), cambiosAbiertos: number("openChanges"), moldesEnUso: number("moldsInUse"), moldesTotal: number("moldsTotal") };
  return { unidadesTotales: number("units"), referenciasBajoMinimo: number("lowStock") };
}
