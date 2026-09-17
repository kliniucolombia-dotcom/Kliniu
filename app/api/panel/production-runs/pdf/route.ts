import { cookies } from "next/headers";
import { chromium } from "playwright";
import { requirePermission } from "@/lib/permissions";
import { createEmptyProductionRunFilters, type ProductionRunFilters } from "@/lib/production-filters";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "kliniu_session";

export async function POST(request: Request) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { filters?: Partial<ProductionRunFilters> };
  const filters: ProductionRunFilters = { ...createEmptyProductionRunFilters(), ...body.filters };

  const encodedFilters = Buffer.from(JSON.stringify(filters)).toString("base64url");
  const origin = new URL(request.url).origin;
  const printUrl = `${origin}/imprimir-produccion?f=${encodedFilters}`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
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
      landscape: true,
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "10mm", right: "10mm" },
    });
    await browser.close();

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="historial-recorridas.pdf"`,
      },
    });
  } catch (error) {
    console.error("[production-runs/pdf] No se pudo generar el PDF:", error);
    if (browser) await browser.close();
    return Response.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}
