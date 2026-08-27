import { config } from "dotenv";
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

config({ path: ".env.local", quiet: true });

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

function required(name: "DATABASE_URL" | "APP_SESSION_SECRET") {
  const value = process.env[name];
  if (!value) throw new Error(`${name} no está configurada.`);
  return value;
}

async function createSuperAdminToken(user: { id: string; email: string; role: "SUPERADMIN" }) {
  return new SignJWT({ userId: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(new TextEncoder().encode(required("APP_SESSION_SECRET")));
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: required("DATABASE_URL") }),
  });
  const superAdmin = await prisma.user.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true, email: true, role: true },
  });
  if (!superAdmin) throw new Error("No hay un SUPERADMIN disponible para la prueba E2E.");

  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext();

  try {
    await context.addInitScript(() => {
      window.localStorage.setItem("kliniu_cookie_consent", "rejected");
    });
    await context.addCookies([
      {
        name: "kliniu_session",
        value: await createSuperAdminToken(superAdmin),
        url: BASE_URL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const page = await context.newPage();
    let logoutResponse: Awaited<ReturnType<typeof page.waitForResponse>> | null = null;
    page.on("response", (response) => {
      if (response.url().endsWith("/api/auth/logout")) logoutResponse = response;
    });
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });
    await page.goto(`${BASE_URL}/panel`, { waitUntil: "domcontentloaded" });
    const stalePanel = await context.newPage();
    await stalePanel.goto(`${BASE_URL}/panel`, { waitUntil: "domcontentloaded" });

    const logoutButton = page.getByTitle("Cerrar sesión");
    await logoutButton.click({ timeout: 10_000 });
    await page.waitForURL(`${BASE_URL}/login`);

    const failures: string[] = [];
    if (!logoutResponse) {
      failures.push("El botón de logout no llamó al endpoint de cierre de sesión.");
    } else {
      const logoutHeaders = await logoutResponse.allHeaders();
      if (!logoutHeaders["clear-site-data"]?.includes('"cache"')) {
        failures.push("El logout no limpia la caché del navegador.");
      } else if (!logoutHeaders["cache-control"]?.includes("no-store")) {
        failures.push("La respuesta de logout permite almacenar datos de sesión en caché.");
      }
    }
    if ((await context.cookies(BASE_URL)).some((cookie) => cookie.name === "kliniu_session")) {
      failures.push("La cookie de sesión sigue presente después del logout.");
    }
    if (!(await page.locator('a[href="/login"]').count())) {
      failures.push("El navbar conserva el estado autenticado después del logout.");
    }

    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.waitForTimeout(300);
    if (page.url() !== `${BASE_URL}/`) {
      failures.push(`Atrás volvió a una ruta protegida: ${page.url()}`);
    }

    await stalePanel.evaluate(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
    });
    try {
      await stalePanel.waitForURL((url) => new URL(url).pathname === "/login", { timeout: 5_000 });
    } catch {
      failures.push("Una pestaña protegida restaurada desde caché conserva la sesión cerrada.");
    }

    if (failures.length) throw new Error(failures.join("\n"));
    console.log("OK logout elimina sesión, actualiza navbar y no deja volver al panel");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
