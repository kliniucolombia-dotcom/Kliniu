import { cookies } from "next/headers";
import { launchPdfBrowser } from "@/lib/pdf-browser";
import { requirePermission } from "@/lib/permissions";

export const runtime = "nodejs";
export const maxDuration = 60;

const SESSION_COOKIE_NAME = "kliniu_session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_PRODUCCION", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const origin = new URL(request.url).origin;
  const printUrl = `${origin}/imprimir-produccion/corrida/${id}`;

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
        "Content-Disposition": `attachment; filename="corrida-${id}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[production-runs/[id]/pdf] No se pudo generar el PDF:", error);
    if (browser) await browser.close();
    return Response.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}
