import { syncStockFromOdoo } from "@/lib/products";
import { broadcastPanelUpdate } from "@/lib/realtime";

export const maxDuration = 60;

function hasValidCronSecret(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!hasValidCronSecret(request)) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await syncStockFromOdoo();
    if (result.updated > 0) {
      await broadcastPanelUpdate("products");
    }
    return Response.json(result);
  } catch (error) {
    console.error("SYNC_ODOO_STOCK_CRON_FAILED", error);
    return Response.json({ error: "No fue posible sincronizar el stock con Odoo." }, { status: 500 });
  }
}
