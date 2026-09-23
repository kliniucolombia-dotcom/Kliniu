import { expireStaleOrders } from "@/lib/orders";
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
    const result = await expireStaleOrders();
    if (result.expiredCount > 0) {
      await broadcastPanelUpdate("orders");
    }
    return Response.json(result);
  } catch (error) {
    console.error("EXPIRE_ORDERS_CRON_FAILED", error);
    return Response.json({ error: "No fue posible expirar los pedidos." }, { status: 500 });
  }
}
