import { expect, test } from "playwright/test";
import { SignJWT } from "jose";
import pg from "pg";

const TEMP_EMAIL = "qa.checkout.temp@example.com";

async function withDb<T>(fn: (pool: pg.Pool) => Promise<T>): Promise<T> {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

test("checkout: formulario, combobox de ciudad, legales y resumen del carrito", async ({ page }) => {
  const product = await withDb(async (pool) => {
    await pool.query('DELETE FROM "User" WHERE email = $1', [TEMP_EMAIL]);
    await pool.query(
      `INSERT INTO "User" (id,"fullName",email,"passwordHash",role,status,"createdAt","updatedAt")
       VALUES (gen_random_uuid()::text,$1,$2,$3,$4::"UserRole",$5::"UserStatus",now(),now())`,
      ["QA Checkout", TEMP_EMAIL, "no-login", "CUSTOMER", "ACTIVE"],
    );
    const u = await pool.query<{ id: string }>('SELECT id FROM "User" WHERE email = $1', [TEMP_EMAIL]);
    const p = await pool.query<{ id: string; name: string; price: number; image: string; sku: string | null }>(
      'SELECT id, name, price, image, sku FROM "Product" WHERE active = true LIMIT 1',
    );
    return { userId: u.rows[0].id, ...p.rows[0] };
  });

  const token = await new SignJWT({ userId: product.userId, email: TEMP_EMAIL, role: "CUSTOMER" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(new TextEncoder().encode(process.env.APP_SESSION_SECRET));

  await page.context().addCookies([
    { name: "kliniu_session", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" },
  ]);

  try {
    const seeded = await page.request.post("/api/cart", {
      data: {
        id: product.id,
        nombre: product.name,
        precio: String(product.price),
        imagen: product.image,
        cantidad: 1,
        sku: product.sku ?? undefined,
      },
    });
    expect(seeded.status()).toBe(200);

    await page.goto("/checkout");

    // Formulario de envío.
    await expect(page.locator("#customerName")).toBeVisible();
    await expect(page.locator("#customerEmail")).toBeVisible();
    await expect(page.locator("#customerPhone")).toBeVisible();
    await expect(page.locator("#addressLine1")).toBeVisible();

    // El resumen muestra el producto del carrito.
    await expect(page.getByText(product.name, { exact: false }).first()).toBeVisible();

    // Enlaces legales correctos (prioridad alta, commit 0aec347).
    await expect(page.getByRole("link", { name: "Términos y Condiciones" })).toHaveAttribute(
      "href",
      "/politicas/terminos-y-condiciones",
    );
    await expect(page.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute(
      "href",
      "/politicas/privacidad",
    );

    // Combobox de ciudad: al elegir Cundinamarca → Bogotá, el envío es gratis.
    await page.locator("#department").selectOption("Cundinamarca");
    await page.locator("#city").click();
    await page.getByRole("button", { name: "Bogotá", exact: true }).click();
    await expect(page.getByText(/Gratis/).first()).toBeVisible();

    // No se envía el pedido: la base es producción y un pedido reserva stock.
  } finally {
    await page.request.delete("/api/cart").catch(() => undefined);
    await withDb((pool) => pool.query('DELETE FROM "User" WHERE email = $1', [TEMP_EMAIL]));
  }
});
