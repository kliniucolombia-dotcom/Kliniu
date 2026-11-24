import { expect, test, type Page } from "playwright/test";
import { SignJWT } from "jose";
import pg from "pg";

const PREFIX = "E2E-CC-";
const SIGNER = "jefeoperaciones@kliniu.com";
const pool = () => new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function authenticateAs(page: Page, where: string, param: string) {
  const db = pool();
  try {
    const { rows } = await db.query(`SELECT id, email, role FROM "User" WHERE ${where} AND status = 'ACTIVE' LIMIT 1`, [param]);
    if (!rows[0]) throw new Error(`Usuario E2E no disponible (${where}=${param})`);
    const token = await new SignJWT({ userId: rows[0].id, email: rows[0].email, role: rows[0].role })
      .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(new TextEncoder().encode(process.env.APP_SESSION_SECRET));
    // Sin decidir cookies, el banner (z-70) tapa el pie de los modales.
    await page.addInitScript(() => localStorage.setItem("kliniu_cookie_consent", "rejected"));
    await page.context().addCookies([{ name: "kliniu_session", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);
  } finally { await db.end(); }
}

const checks = { color: "C", forma: "C", transparencia: "NA", fisuras: "C", soldadura: "C", acople: "C", succion: "NA", sellado: "C", etiqueta: "C" };
const valid = (n: string) => ({
  inspectedOn: "2026-11-24", productRef: `${PREFIX}${n}`, lotNumber: "2148", lotQty: 54, sampleSize: 6,
  sampleRange: "150-156", checks, nonConforming: 0, lotConforming: true, action: "",
});
// PNG 1x1 válido
const SIG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

test.afterAll(async () => {
  const db = pool();
  await db.query(`DELETE FROM "QualityInspection" WHERE "productRef" LIKE $1`, [`${PREFIX}%`]);
  await db.end();
});

test("un rol sin permiso recibe 403", async ({ page }) => {
  await authenticateAs(page, "role = $1", "LOGISTICA");
  expect((await page.request.get("/api/panel/control-calidad")).status()).toBe(403);
  expect((await page.request.post("/api/panel/control-calidad", { data: valid("x") })).status()).toBe(403);
});

test("la API valida campos, criterios y acción si el lote no es conforme", async ({ page }) => {
  await authenticateAs(page, "email = $1", SIGNER);
  const post = (data: object) => page.request.post("/api/panel/control-calidad", { data });
  for (const key of ["productRef", "lotNumber", "sampleRange"]) expect((await post({ ...valid("v"), [key]: "" })).status(), key).toBe(400);
  expect((await post({ ...valid("v"), checks: { ...checks, color: "X" } })).status()).toBe(400);
  expect((await post({ ...valid("v"), sampleSize: 55 })).status()).toBe(400);
  expect((await post({ ...valid("v"), nonConforming: 7 })).status()).toBe(400);
  expect((await post({ ...valid("v"), lotConforming: false })).status()).toBe(400);
});

test("solo el ingeniero firma; firmado queda bloqueado", async ({ page }) => {
  await authenticateAs(page, "role = $1", "LIDER_INYECCION");
  const created = await page.request.post("/api/panel/control-calidad", { data: valid("firma") });
  expect(created.status()).toBe(200);
  const id = (await created.json()).inspection.id as string;
  expect((await page.request.patch(`/api/panel/control-calidad/${id}`, { data: { action: "sign", signatureData: SIG } })).status()).toBe(403);

  await page.context().clearCookies();
  await authenticateAs(page, "email = $1", SIGNER);
  await page.goto("/panel/control-calidad");
  const row = page.locator("div.print\\:hidden tr").filter({ hasText: `${PREFIX}firma` });
  await expect(row.getByRole("button", { name: "Firmar" })).toBeVisible();
  await row.getByRole("button", { name: "Firmar" }).click();
  const modal = page.locator("div.fixed");
  await expect(modal.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  const box = (await modal.locator("canvas").boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + 120, box.y + 60, { steps: 8 });
  await page.mouse.up();
  await modal.getByRole("button", { name: "Confirmar" }).click();
  await expect(row.getByRole("img", { name: /Firma de/ })).toBeVisible();

  expect((await page.request.patch(`/api/panel/control-calidad/${id}`, { data: valid("firma") })).status()).toBe(409);
  expect((await page.request.delete(`/api/panel/control-calidad/${id}`)).status()).toBe(409);
});

test("menú de Operaciones muestra Control de calidad", async ({ page }) => {
  await authenticateAs(page, "email = $1", SIGNER);
  await page.goto("/panel/control-calidad");
  await page.getByRole("button", { name: /Ver \d+ páginas/ }).click();
  await expect(page.locator('a[href="/panel/control-calidad"]').filter({ hasText: "Control de calidad" }).first()).toBeVisible();
});

test("UI: crear inspección no conforme exige acción, editar y eliminar", async ({ page }) => {
  await authenticateAs(page, "email = $1", SIGNER);
  await page.goto("/panel/control-calidad");
  await page.getByRole("button", { name: "Nueva inspección" }).click();
  const modal = page.locator("div.fixed");
  const confirmBtn = modal.getByRole("button", { name: "Confirmar" });
  await expect(confirmBtn).toBeDisabled();

  const text = modal.locator("input:not([type=date]):not([type=number])");
  const nums = modal.locator("input[type=number]");
  await text.nth(0).fill(`${PREFIX}ui`);
  await text.nth(1).fill("2153");
  await text.nth(2).fill("10-13");
  await nums.nth(0).fill("22");
  await nums.nth(1).fill("30");
  await expect(modal.getByText("La muestra no puede superar las piezas del lote.")).toBeVisible();
  await nums.nth(1).fill("3");
  await nums.nth(2).fill("1");

  const groups = modal.getByRole("radiogroup");
  for (let i = 0; i < 9; i++) await groups.nth(i).getByRole("radio", { name: i === 4 ? "N" : "C", exact: true }).click();
  await expect(confirmBtn).toBeDisabled(); // falta conformidad del lote
  await modal.getByRole("radiogroup", { name: "Conformidad del lote" }).getByRole("radio", { name: "No" }).click();
  await expect(confirmBtn).toBeDisabled(); // no conforme sin acción
  await modal.locator("textarea").fill("Separar y reprocesar");
  await expect(confirmBtn).toBeEnabled();
  await confirmBtn.click();
  await expect(page.getByText("Inspección registrada")).toBeVisible();

  const row = page.locator("div.print\\:hidden tr").filter({ hasText: `${PREFIX}ui` });
  await expect(row).toContainText("Separar y reprocesar");
  await expect(row.getByText("No", { exact: true })).toBeVisible();
  const db = pool();
  const saved = (await db.query(`SELECT checks, "lotConforming", "nonConforming" FROM "QualityInspection" WHERE "productRef" = $1`, [`${PREFIX}ui`])).rows[0];
  expect(saved.checks.soldadura).toBe("N");
  expect(saved.lotConforming).toBe(false);
  expect(saved.nonConforming).toBe(1);

  await row.getByLabel("Editar inspección").click();
  await modal.getByRole("radiogroup", { name: "Conformidad del lote" }).getByRole("radio", { name: "Sí" }).click();
  await modal.getByRole("button", { name: "Confirmar" }).click();
  await expect(page.getByText("Inspección actualizada")).toBeVisible();
  await expect(row.getByText("Sí", { exact: true })).toBeVisible();

  await row.getByLabel("Eliminar inspección").click();
  await page.getByRole("button", { name: "Eliminar", exact: true }).last().click();
  await expect(page.getByText("Registro eliminado")).toBeVisible();
  await expect(row).toHaveCount(0);
  expect((await db.query(`SELECT 1 FROM "QualityInspection" WHERE "productRef" = $1`, [`${PREFIX}ui`])).rowCount).toBe(0);
  await db.end();
});

test("quien no es el ingeniero ve 'Pendiente de firma' y no puede editar un firmado", async ({ page }) => {
  await authenticateAs(page, "email = $1", SIGNER);
  const id = (await (await page.request.post("/api/panel/control-calidad", { data: valid("vista") })).json()).inspection.id;
  await page.context().clearCookies();
  await authenticateAs(page, "role = $1", "LIDER_INYECCION");
  await page.goto("/panel/control-calidad");
  const row = page.locator("div.print\\:hidden tr").filter({ hasText: `${PREFIX}vista` });
  await expect(row.getByText("Pendiente de firma")).toBeVisible();
  await expect(row.getByRole("button", { name: "Firmar" })).toHaveCount(0);
  await expect(row.getByLabel("Eliminar inspección")).toHaveCount(0); // líder: ver + crear, sin borrar

  await page.context().clearCookies();
  await authenticateAs(page, "email = $1", SIGNER);
  expect((await page.request.patch(`/api/panel/control-calidad/${id}`, { data: { action: "sign", signatureData: "data:image/jpeg;base64,xx" } })).status()).toBe(400);
  expect((await page.request.patch(`/api/panel/control-calidad/${id}`, { data: { action: "sign", signatureData: SIG } })).status()).toBe(200);
  expect((await page.request.patch(`/api/panel/control-calidad/${id}`, { data: { action: "sign", signatureData: SIG } })).status()).toBe(409);
  await page.goto("/panel/control-calidad");
  await expect(row.getByLabel("Editar inspección")).toHaveCount(0);
  await expect(row.getByLabel("Eliminar inspección")).toHaveCount(0);
});

test("filtro de fechas e impresión del formato", async ({ page }) => {
  await authenticateAs(page, "email = $1", SIGNER);
  await page.request.post("/api/panel/control-calidad", { data: { ...valid("viejo"), inspectedOn: "2026-01-15" } });
  await page.request.post("/api/panel/control-calidad", { data: valid("print") });
  await page.goto("/panel/control-calidad");
  const screen = page.locator("div.print\\:hidden table");
  await expect(screen.getByText(`${PREFIX}print`)).toBeVisible();
  await expect(screen.getByText(`${PREFIX}viejo`)).toHaveCount(0);
  await page.getByLabel("Desde").fill("2026-01-01");
  await expect(screen.getByText(`${PREFIX}viejo`)).toBeVisible();

  await page.emulateMedia({ media: "print" });
  const sheet = page.locator("#cc-print");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("FORMATO INSPECCIÓN Y CONTROL DE CALIDAD DE PRODUCTO TERMINADO")).toBeVisible();
  await expect(sheet.locator("tbody tr").filter({ hasText: `${PREFIX}print` })).toContainText("Pendiente");
  await expect(page.getByRole("button", { name: "Nueva inspección" })).toBeHidden();
  const width = await sheet.locator("table").evaluate((t) => t.scrollWidth <= (t.parentElement?.clientWidth ?? 0) + 1);
  expect(width).toBe(true); // la tabla no se corta a la derecha
});
