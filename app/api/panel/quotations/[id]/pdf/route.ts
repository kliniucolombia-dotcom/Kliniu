import { cookies } from "next/headers";
import { chromium } from "playwright";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SESSION_COOKIE_NAME = "kliniu_session";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_COTIZACIONES", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });
  const { session } = access;
  if (!prisma) return Response.json({ error: "DB no disponible" }, { status: 500 });

  const { id } = await params;
  const quotation = await prisma.quotation.findUnique({ where: { id }, select: { sellerId: true, status: true, number: true } });
  if (!quotation) return Response.json({ error: "Cotización no encontrada" }, { status: 404 });
  if (session.role !== "ADMIN" && quotation.sellerId !== session.userId) {
    return Response.json({ error: "Sin permiso" }, { status: 403 });
  }
  if (quotation.status === "DRAFT") {
    return Response.json({ error: "Envía la cotización antes de generar el PDF" }, { status: 409 });
  }

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });

  const origin = new URL(request.url).origin;
  const printUrl = `${origin}/imprimir-cotizacion/${id}`;

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
    const pdfBuffer = await page.pdf({ format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "12mm", right: "12mm" } });
    await browser.close();

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${quotation.number}.pdf"`,
      },
    });
  } catch {
    if (browser) await browser.close();
    return Response.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}
