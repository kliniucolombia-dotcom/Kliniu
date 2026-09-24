<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Odoo stock sync + crons (2026-09-24)

**Odoo:** `gcinternational1.odoo.com`, db `gcinternational1`, uid `2`. Credenciales en `ODOO_URL/ODOO_DB/ODOO_USERNAME/ODOO_API_KEY` (`.env.local` + Vercel, entornos production/preview/development). Token rotado; producción verificada (`/api/odoo/status` → connected, uid 2).

**Sync de stock:** `syncStockFromOdoo()` en `lib/products.ts` — lee `qty_available` de Odoo por SKU, escribe bodega `PRODUCTO_TERMINADO`. Optimizada: prelee el stock actual en 1 query y solo escribe cambios (~2.5s steady vs ~53s antes).

**Endpoints cron** (todos `GET`, protegidos con `Authorization: Bearer CRON_SECRET`):
- `/api/cron/sync-odoo-stock` — sync de stock.
- `/api/cron/expire-orders` — libera stock + cancela pedidos online `PENDING` vencidos (ventana de pago 60 min).
- `/api/cron/wati-followup` — seguimiento WhatsApp 10 min sin respuesta.

**Agendado:**
- Stock: cron-job.org cada **1 min** (`https://kliniucolombia.com/api/cron/sync-odoo-stock`).
- Los 3: GitHub Action `.github/workflows/crons.yml` cada **5 min** (secret del repo `CRON_SECRET`).

**Pendiente (pausado por el usuario):**
- Mover `expire-orders` y `wati-followup` a cron-job.org para no depender de GitHub. GitHub desactiva workflows programados tras 60 días sin actividad del repo.
- Opcional descartado por ahora: read-through live (consultar Odoo al abrir ficha de producto, 0 lag).

**Vercel:** proyecto `kliniu` (`prj_bR5Zj5ci2w3zsgFtTHN6CcKBop9G`, team `kliniu`). `ODOO_API_KEY` consolidada en 1 entrada `sensitive` (3 entornos).

