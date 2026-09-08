import { expect, test } from "playwright/test";
import { SignJWT } from "jose";
import pg from "pg";

async function sessionFor(email: string) {
  const connectionString = process.env.DATABASE_URL;
  const secret = process.env.APP_SESSION_SECRET;
  if (!connectionString || !secret) throw new Error("Entorno local incompleto para E2E");
  const pool = new pg.Pool({ connectionString });
  try {
    const result = await pool.query<{ id: string; email: string; role: string; status: string }>('SELECT id, email, role, status FROM "User" WHERE email = $1 LIMIT 1', [email]);
    const user = result.rows[0];
    if (!user || user.status !== "ACTIVE") throw new Error(`Usuario E2E no disponible: ${email}`);
    return new SignJWT({ userId: user.id, email: user.email, role: user.role })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m")
      .sign(new TextEncoder().encode(secret));
  } finally {
    await pool.end();
  }
}

async function authenticate(page: import("playwright/test").Page, email: string) {
  await page.context().addCookies([{ name: "kliniu_session", value: await sessionFor(email), url: "http://127.0.0.1:3000", httpOnly: true, sameSite: "Lax" }]);
}

test("logística solo ve y consulta su módulo de Operaciones", async ({ page }) => {
  await authenticate(page, "logistica@kliniu.com");
  await page.goto("/panel/logistica");
  await expect(page.getByRole("heading", { name: "Logística" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Mantenimiento" })).toHaveCount(0);

  const allowed = await page.request.get("/api/panel/operaciones/informes?module=MODULE_LOGISTICA");
  expect(allowed.status()).toBe(200);
  const forbidden = await page.request.get("/api/panel/operaciones/informes?module=MODULE_MANTENIMIENTO");
  expect(forbidden.status()).toBe(403);
});

test("los rangos de fechas imposibles se rechazan en la API real", async ({ page }) => {
  await authenticate(page, "logistica@kliniu.com");
  const response = await page.request.get("/api/panel/logistica?from=2026-02-30&to=2026-03-01");
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toMatchObject({ error: "Rango de fechas inválido" });
});

test("dirección de operaciones abre el tablero integrado", async ({ page }) => {
  await authenticate(page, "direcciondeoperaciones@kliniu.com");
  await page.goto("/panel/operaciones");
  await expect(page.getByRole("heading", { name: "Tablero del área" })).toBeVisible();
  await expect(page.getByText("Logística, ensamble, inyección, despachos y mantenimiento en una sola vista.")).toBeVisible();
});
