import { getEffectivePermissions, requireActiveUser, requirePermission } from "@/lib/permissions";
import { buildOperationsReportKpis, createOperationsReport, listAuthorizedOperationsReports, OPERATIONS_REPORT_MODULES } from "@/lib/operations-reports";
import { operationsModulesWithView } from "@/lib/operations-report-policy";
import { parseBogotaCivilDate } from "@/lib/operations-validation";
import type { PanelModule } from "@/generated/prisma/client";

function isReportModule(value: unknown): value is PanelModule {
  return typeof value === "string" && (OPERATIONS_REPORT_MODULES as readonly string[]).includes(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const moduleParam = url.searchParams.get("module");
  const reportModule = isReportModule(moduleParam) ? moduleParam : undefined;

  const access = await requireActiveUser();
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const allowed = operationsModulesWithView(await getEffectivePermissions(access.user));
  if (reportModule && !allowed.includes(reportModule)) return Response.json({ error: "No autorizado" }, { status: 403 });
  return Response.json({ reports: await listAuthorizedOperationsReports(reportModule ? [reportModule] : allowed) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    module?: string;
    periodStart?: string;
    periodEnd?: string;
    notes?: string;
  };

  if (!isReportModule(body.module)) return Response.json({ error: "Módulo inválido" }, { status: 400 });
  if (!body.periodStart || !body.periodEnd) {
    return Response.json({ error: "Faltan datos (periodStart, periodEnd)" }, { status: 400 });
  }
  try {
    if (parseBogotaCivilDate(body.periodEnd) < parseBogotaCivilDate(body.periodStart)) throw new Error("INVALID_RANGE");
  } catch {
    return Response.json({ error: "El rango del período es inválido" }, { status: 400 });
  }

  const access = await requirePermission(body.module, "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const report = await createOperationsReport({
    module: body.module,
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
    kpis: await buildOperationsReportKpis(body.module, body.periodStart, body.periodEnd),
    notes: body.notes,
    authorId: access.user.id,
  });
  return Response.json({ report });
}
