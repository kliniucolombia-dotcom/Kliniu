import assert from "node:assert/strict";
import test from "node:test";
import type { PanelModule } from "../generated/prisma/client";
import { operationsModulesWithView, reportKpisForModule } from "../lib/operations-report-policy";

test("operationsModulesWithView limita informes a módulos visibles", () => {
  const allowed = operationsModulesWithView({
    MODULE_LOGISTICA: { canView: true },
    MODULE_MANTENIMIENTO: { canView: false },
    MODULE_PRODUCCION: { canView: false },
    MODULE_BODEGAS: { canView: false },
  });
  assert.deepEqual(allowed, ["MODULE_LOGISTICA"] satisfies PanelModule[]);
});

test("reportKpisForModule genera claves estables de logística desde datos del servidor", () => {
  assert.deepEqual(reportKpisForModule("MODULE_LOGISTICA", {
    routesTotal: 4,
    routesDone: 3,
    ordersTotal: 12,
    ordersDelivered: 10,
    costTotal: 250000,
    openIncidents: 2,
  }), {
    rutasTotal: 4,
    rutasFinalizadas: 3,
    pedidosEnRuta: 12,
    pedidosEntregados: 10,
    costoTotal: 250000,
    novedadesAbiertas: 2,
  });
});

test("reportKpisForModule no copia campos arbitrarios del cliente", () => {
  const result = reportKpisForModule("MODULE_MANTENIMIENTO", {
    openOrders: 1,
    preventive: 2,
    corrective: 3,
    completed: 4,
    downtimeMinutes: 5,
    equipmentDown: 6,
    lowStockItems: 7,
    cifraInventada: 999,
  });
  assert.equal("cifraInventada" in result, false);
});
