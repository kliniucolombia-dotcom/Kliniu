import { config } from "dotenv";
import { chromium } from "playwright";
import { SignJWT } from "jose";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const SALE_MODE_KEY = "sale_mode";
const CHROME_PATH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
type SaleMode = "cart" | "whatsapp";

config({ path: ".env.local" });

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
  const original = await prisma.appConfig.findUnique({ where: { key: SALE_MODE_KEY } });
  const originalMode: SaleMode = original?.value === "whatsapp" ? "whatsapp" : "cart";
  const targetMode: SaleMode = originalMode === "cart" ? "whatsapp" : "cart";
  const superAdmin = await prisma.user.findFirst({
    where: { role: "SUPERADMIN" },
    select: { id: true, email: true, role: true },
  });

  if (!superAdmin) throw new Error("No hay un SUPERADMIN disponible para la prueba E2E.");

  const token = await createSuperAdminToken(superAdmin);
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
  const context = await browser.newContext();

  try {
    await context.addCookies([
      {
        name: "kliniu_session",
        value: token,
        url: BASE_URL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const storefront = await context.newPage();
    await storefront.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const initialCartVisible = Boolean(await storefront.locator('a[href="/carrito"]').count());
    if ((originalMode === "cart") !== initialCartVisible) {
      throw new Error("La tienda no inició con el modo de venta configurado.");
    }

    const page = await context.newPage();
    console.log("Abriendo configuración...");
    await page.goto(`${BASE_URL}/panel/configuracion/modo-venta`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    console.log(`Configuración cargada: ${page.url()}`);
    await page.getByRole("button", { name: targetMode === "whatsapp" ? "Modo WhatsApp" : "Modo Carrito" }).click();
    console.log("Modo seleccionado...");
    await page.getByText("Cambio guardado.").waitFor();
    console.log("Cambio confirmado...");
    await storefront.waitForFunction(
      (mode) => {
        const cartVisible = Boolean(document.querySelector('a[href="/carrito"]'));
        return mode === "whatsapp" ? !cartVisible : cartVisible;
      },
      targetMode,
      { timeout: 5_000 },
    );
    console.log("Tienda abierta actualizada...");

    console.log(`OK modo ${targetMode} aplicado sin recargar`);
  } finally {
    await browser.close();
    if (original) {
      await prisma.appConfig.update({ where: { key: SALE_MODE_KEY }, data: { value: original.value } });
    } else {
      await prisma.appConfig.deleteMany({ where: { key: SALE_MODE_KEY } });
    }
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
