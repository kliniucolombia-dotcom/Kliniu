import { cookies } from "next/headers";
import { launchPdfBrowser } from "@/lib/pdf-browser";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const maxDuration = 60;

const SESSION_COOKIE_NAME = "kliniu_session";

// Comprobante de entrega en PDF: se renderiza la página de impresión con la sesión del usuario.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePermission("MODULE_LOGISTICA", "view");
  if (!access.ok) return Response.json({ error: "No autorizado" }, { status: access.status });

  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return Response.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  // Se valida antes de abrir el navegador: la página de impresión responde 200 aunque muestre un 404.
  const attempt = prisma ? await prisma.deliveryAttempt.findFirst({ where: { id, outcome: "DELIVERED" }, select: { id: true } }) : null;
  if (!attempt) return Response.json({ error: "Entrega no encontrada" }, { status: 404 });
  const origin = new URL(request.url).origin;

  let browser;
  try {
    browser = await launchPdfBrowser();
    const context = await browser.newContext();
    await context.addCookies([{ name: SESSION_COOKIE_NAME, value: token, url: origin, httpOnly: true, sameSite: "Lax" }]);
    const page = await context.newPage();
    await page.goto(`${origin}/imprimir-logistica/comprobante/${encodeURIComponent(id)}`, { waitUntil: "networkidle" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" } });
    await browser.close();

    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="comprobante-entrega-${id.slice(-8).toUpperCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("[logistica/comprobante] No se pudo generar el PDF:", error);
    if (browser) await browser.close();
    return Response.json({ error: "No se pudo generar el PDF" }, { status: 500 });
  }
}
