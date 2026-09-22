import { Resend } from "resend";
import type { Order, OrderItem } from "@/generated/prisma/client";
import { SITE_URL } from "@/lib/site";
import { formatPrice } from "@/lib/volume-discounts";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const DESTINATARIO = "ventas@kliniu.com";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildOrderPaidEmailHtml(order: Order & { items: OrderItem[] }): string {
  const panelUrl = `${SITE_URL.startsWith("http") ? SITE_URL : `https://${SITE_URL}`}/panel/pedidos`;
  const orderNumber = order.id.slice(-8).toUpperCase();

  const rows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="padding-right:12px;">
                <img src="${esc(item.image)}" width="48" height="48" style="border-radius:8px;object-fit:cover;display:block;background:#F4F6F8;" alt="" />
              </td>
              <td>
                <p style="margin:0;font-size:13px;color:#1A1A1A;font-weight:600;">${esc(item.name)}</p>
                <p style="margin:2px 0 0;font-size:12px;color:#94A3B8;">Cantidad: ${item.quantity}</p>
              </td>
            </tr></table>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid #F1F5F9;text-align:right;font-size:13px;color:#1A1A1A;font-weight:600;white-space:nowrap;">
            ${formatPrice(item.lineTotal)}
          </td>
        </tr>`,
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;">
    <div style="background:#0C535B;padding:28px 24px;text-align:center;">
      <img src="${SITE_URL}/logo-white.png" height="28" style="display:block;margin:0 auto 16px;" alt="Kliniu" />
      <h1 style="margin:0;color:#fff;font-size:20px;font-weight:800;">¡Nuevo pedido pagado!</h1>
      <p style="margin:6px 0 0;color:#A9E3E6;font-size:13px;">Pedido #${orderNumber}</p>
    </div>

    <div style="padding:24px;">
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr>
          <td style="font-size:12px;color:#94A3B8;padding-bottom:4px;">Cliente</td>
        </tr>
        <tr>
          <td style="font-size:14px;color:#1A1A1A;font-weight:700;">${esc(order.customerName)}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#64748B;padding-top:2px;">${esc(order.customerEmail)} · ${esc(order.customerPhone)}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#64748B;padding-top:2px;">${esc(order.addressLine1)}, ${esc(order.city)}, ${esc(order.department)}</td>
        </tr>
      </table>

      <table cellpadding="0" cellspacing="0" width="100%">
        ${rows}
      </table>

      <table cellpadding="0" cellspacing="0" width="100%" style="margin-top:16px;">
        <tr>
          <td style="font-size:13px;color:#64748B;padding:4px 0;">Subtotal</td>
          <td style="font-size:13px;color:#1A1A1A;text-align:right;padding:4px 0;">${formatPrice(order.subtotal)}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#64748B;padding:4px 0;">Envío</td>
          <td style="font-size:13px;color:#1A1A1A;text-align:right;padding:4px 0;">${order.shippingCost > 0 ? formatPrice(order.shippingCost) : "Gratis"}</td>
        </tr>
        <tr>
          <td style="font-size:15px;color:#1A1A1A;font-weight:800;padding-top:10px;border-top:1px solid #F1F5F9;">Total pagado</td>
          <td style="font-size:15px;color:#27B1B8;font-weight:800;text-align:right;padding-top:10px;border-top:1px solid #F1F5F9;">${formatPrice(order.subtotal + order.shippingCost)}</td>
        </tr>
      </table>

      <a href="${panelUrl}" style="display:block;text-align:center;margin-top:24px;background:#27B1B8;color:#fff;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:700;text-decoration:none;">Ver pedido en el panel</a>
    </div>

    <div style="padding:16px 24px;border-top:1px solid #F1F5F9;">
      <p style="margin:0;font-size:11px;color:#94A3B8;">Pago confirmado por Wompi. Correo automático de Kliniu.</p>
    </div>
  </div>
</body>
</html>`;
}

/** Envía a ventas@kliniu.com el resumen del pedido cuando Wompi confirma el pago. No lanza errores. */
export async function sendOrderPaidEmail(order: Order & { items: OrderItem[] }) {
  if (!resend) return;

  const from = process.env.NOTIFICATION_EMAIL_FROM ?? "Kliniu <notificaciones@kliniu.com>";

  await resend.emails.send({
    from,
    to: DESTINATARIO,
    subject: `[Kliniu] Nuevo pedido pagado #${order.id.slice(-8).toUpperCase()}`,
    html: buildOrderPaidEmailHtml(order),
  });
}
