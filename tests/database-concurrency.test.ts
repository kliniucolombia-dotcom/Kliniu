import assert from "node:assert/strict";
import test from "node:test";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config({ path: ".env.local", quiet: true });

test("PostgreSQL serializa el mismo recurso de molde con advisory transaction locks", async (t) => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return t.skip("DATABASE_URL no configurada");
  const pool = new pg.Pool({ connectionString, max: 2 });
  const first = await pool.connect();
  const second = await pool.connect();
  try {
    await first.query("BEGIN");
    await second.query("BEGIN");
    await first.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["mold:test-exclusive"]);
    const blocked = await second.query<{ acquired: boolean }>("SELECT pg_try_advisory_xact_lock(hashtext($1)) AS acquired", ["mold:test-exclusive"]);
    assert.equal(blocked.rows[0].acquired, false);
    await first.query("ROLLBACK");
    const acquired = await second.query<{ acquired: boolean }>("SELECT pg_try_advisory_xact_lock(hashtext($1)) AS acquired", ["mold:test-exclusive"]);
    assert.equal(acquired.rows[0].acquired, true);
  } finally {
    await first.query("ROLLBACK").catch(() => undefined);
    await second.query("ROLLBACK").catch(() => undefined);
    first.release();
    second.release();
    await pool.end();
  }
});

test("MaintenanceOrder.number tiene una restricción única real", async (t) => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return t.skip("DATABASE_URL no configurada");
  const pool = new pg.Pool({ connectionString });
  try {
    const result = await pool.query<{ unique_number: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'MaintenanceOrder'
          AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
          AND indexdef LIKE '%(number)%'
      ) AS unique_number
    `);
    assert.equal(result.rows[0].unique_number, true);
  } finally {
    await pool.end();
  }
});
