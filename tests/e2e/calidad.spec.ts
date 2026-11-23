import { expect, test, type Page } from "playwright/test";
import { SignJWT } from "jose";
import pg from "pg";

const PREFIX = "E2E-CAL-";
const pool = () => new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function authenticateAs(page: Page, where: string, param: string) {
  const secret = process.env.APP_SESSION_SECRET;
  const db = pool();
  try {
    const { rows } = await db.query(`SELECT id, email, role FROM "User" WHERE ${where} AND status = 'ACTIVE' LIMIT 1`, [param]);
    if (!rows[0]) throw new Error(`Usuario E2E no disponible (${where}=${param})`);
    const token = await new SignJWT({ userId: rows[0].id, email: rows[0].email, role: rows[0].role })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(secret));
    await page.context().addCookies([{ name: "kliniu_session", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);
  } finally { await db.end(); }
}
const asJefe = (page: Page) => authenticateAs(page, "role = $1", "JEFE_OPERACIONES");

const valid = (n: string) => ({
  deliveryNote: `${PREFIX}${n}`, lotNumber: "L-1", city: "Bogotá", dispatchedQty: 100, defectiveQty: 3,
  photos: [{ url: "https://example.com/e2e.webp", name: "e2e.webp", isImage: true }],
  analysis: "a", diagnosis: "d", followUp: "s", solution: "x",
});

test.afterAll(async () => {
  const db = pool();
  await db.query(`DELETE FROM "QualityCase" WHERE "deliveryNote" LIKE $1`, [`${PREFIX}%`]);
  await db.query(`DELETE FROM "OperationsReport" WHERE module = 'MODULE_CALIDAD' AND notes LIKE $1`, [`${PREFIX}%`]);
  await db.end();
});

test("un rol sin permiso de Calidad recibe 403", async ({ page }) => {
  await authenticateAs(page, "role = $1", "LOGISTICA");
  expect((await page.request.get("/api/panel/calidad")).status()).toBe(403);
  expect((await page.request.post("/api/panel/calidad", { data: valid("x") })).status()).toBe(403);
});

test("la API exige todos los campos y cantidades coherentes", async ({ page }) => {
  await asJefe(page);
  const post = (data: object) => page.request.post("/api/panel/calidad", { data });
  for (const key of ["deliveryNote", "lotNumber", "city", "analysis", "diagnosis", "followUp", "solution"]) {
    expect((await post({ ...valid("v"), [key]: "" })).status(), key).toBe(400);
  }
  expect((await post({ ...valid("v"), photos: [] })).status()).toBe(400);
  expect((await post({ ...valid("v"), defectiveQty: 101 })).status()).toBe(400);
  expect((await post({ ...valid("v"), dispatchedQty: 0, defectiveQty: 0 })).status()).toBe(400);
});

test("formulario: asteriscos rojos y Confirmar bloqueado hasta completar", async ({ page }) => {
  await asJefe(page);
  await page.goto("/panel/calidad");
  await page.getByRole("button", { name: "Nuevo caso" }).click();
  const modal = page.locator("div.fixed");
  await expect(modal.locator("span.text-\\[\\#DC2626\\]")).toHaveCount(10);
  await expect(modal.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  const inputs = modal.locator("input:not([type=file])");
  await inputs.nth(3).fill("100");
  await inputs.nth(4).fill("101");
  await expect(modal.getByText("no puede superar la despachada")).toBeVisible();
});

test("flujo: caso nuevo, KPI sobre la meta, mover de columna e informe", async ({ page }) => {
  await asJefe(page);
  const created = await page.request.post("/api/panel/calidad", { data: valid("flujo") });
  expect(created.status()).toBe(200);
  const id = (await created.json()).case.id as string;

  await page.goto("/panel/calidad");
  const card = page.locator("div[draggable]").filter({ hasText: `${PREFIX}flujo` });
  await expect(card).toBeVisible();
  await expect(card.getByText("3%")).toBeVisible();

  await card.getByLabel("Mover a la siguiente columna").click();
  const confirmed = page.locator("div.rounded-2xl.bg-\\[\\#F8FAFC\\]").filter({ has: page.getByRole("heading", { name: "Confirmado" }) });
  await expect(confirmed.getByText(`${PREFIX}flujo`)).toBeVisible();
  const row = await pool().query(`SELECT status FROM "QualityCase" WHERE id = $1`, [id]);
  expect(row.rows[0].status).toBe("CONFIRMED");

  await page.getByRole("button", { name: /^Informes/ }).click();
  await page.getByRole("button", { name: "Presentar informe" }).click();
  await page.locator("div.fixed textarea").fill(`${PREFIX}informe`);
  await page.locator("div.fixed").getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText(`${PREFIX}informe`)).toBeVisible();
});
