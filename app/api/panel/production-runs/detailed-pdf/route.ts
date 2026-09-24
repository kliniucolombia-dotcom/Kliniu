import { cookies } from "next/headers";
import { launchPdfBrowser } from "@/lib/pdf-browser";
import { requirePermission } from "@/lib/permissions";
import { getProductionRuns } from "@/lib/panel";
import { createEmptyProductionRunFilters, filterProductionRuns, type ProductionRunFilters } from "@/lib/production-filters";

export const runtime = "nodejs";
export const maxDuration = 60;

const SESSION_COOKIE_NAME = "kliniu_session";
const MAX_DETAIL_RUNS = 150;

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as {
    ids?: unknown;
    filters?: Partial<ProductionRunFilters>;
  };

  const ids = Array.isArray(body.ids) ? body.ids.filter((v): v is string => typeof v === "string") : [];

  let query: string;
  if (ids.length) {
    if (ids.length > MAX_DETAIL_RUNS) {
      return Response.json(
        { error: `Puedes generar hasta ${MAX_DETAIL_RUNS} corridas por reporte. Reduce la selección.` },
        { status: 400 },
      );
    }
    query = `i=${Buffer.from(JSON.stringify(ids)).toString("base64url")}`;
  } else {
    const filters: ProductionRunFilters = { ...createEmptyProductionRunFilters(), ...body.filters };
    const matching = filterProductionRuns(await getProductionRuns(), filters).length;
    if (matching > MAX_DETAIL_RUNS) {
      return Response.json(
        { error: `Hay ${matching} corridas para esos filtros. El máximo por reporte es ${MAX_DETAIL_RUNS}. Ajusta los filtros.` },
        { status: 400 },
      );
    }
    query = `f=${Buffer.from(JSON.stringify(filters)).toString("base64url")}`;
  }

  const origin = new URL(request.url).origin;
  const printUrl = `${origin}/imprimir-produccion/detallado?${query}`;

  let browser;
  try {
    browser = await launchPdfBrowser();
    const context = await browser.newContext();
    await context.addCookies([{
      name: SESSION_COOKIE_NAME,
      value: token,
      url: origin,
      httpOnly: true,
      sameSite: "Lax",
    }]);
    const page = await context.newPage();
    await page.goto(printUrl, { waitUntil: "networkidle" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      landscape: false,
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    await browser.close();

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="recorridas-detalladas.pdf"`,
      },
    });
  } catch (error) {
    console.error("[production-runs/detailed-pdf] No se pudo generar el PDF:", error);
    if (browser) await browser.close();
    return Response.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}
