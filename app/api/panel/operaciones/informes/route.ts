import { requirePermission } from "@/lib/permissions";
import { createOperationsReport, listOperationsReports, OPERATIONS_REPORT_MODULES } from "@/lib/operations-reports";
import type { PanelModule } from "@/generated/prisma/client";

function isReportModule(value: unknown): value is PanelModule {
  return typeof value === "string" && (OPERATIONS_REPORT_MODULES as string[]).includes(value);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const moduleParam = url.searchParams.get("module");
  const reportModule = isReportModule(moduleParam) ? moduleParam : undefined;

  const access = await requirePermission(reportModule ?? "MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  return Response.json({ reports: await listOperationsReports(reportModule) });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    module?: string;
    periodStart?: string;
    periodEnd?: string;
    kpis?: Record<string, number | string>;
    notes?: string;
  };

  if (!isReportModule(body.module)) return Response.json({ error: "Módulo inválido" }, { status: 400 });
  if (!body.periodStart || !body.periodEnd || !body.kpis) {
    return Response.json({ error: "Faltan datos (periodStart, periodEnd, kpis)" }, { status: 400 });
  }
  if (body.periodEnd < body.periodStart) {
    return Response.json({ error: "El fin del período no puede ser anterior al inicio" }, { status: 400 });
  }

  const access = await requirePermission(body.module, "create");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const report = await createOperationsReport({
    module: body.module,
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
    kpis: body.kpis,
    notes: body.notes,
    authorId: access.user.id,
  });
  return Response.json({ report });
}
