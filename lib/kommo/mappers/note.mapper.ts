import type { OrderInput } from "./lead.mapper";

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(amount);
}

export function mapOrderToNote(order: OrderInput): string {
  const lines = [
    `📦 Pedido: ${order.id}`,
    `👤 Cliente: ${order.customerName} (${order.customerEmail})`,
    `📱 Teléfono: ${order.customerPhone}`,
    order.company ? `🏢 Empresa: ${order.company}` : null,
    `📍 Dirección: ${order.addressLine1}, ${order.city}, ${order.department}`,
    ``,
    `🛒 Productos (${order.totalItems} und):`,
    ...order.items.map((item) => `  • ${item.name} × ${item.quantity} — ${formatCOP(item.unitPrice)}`),
    ``,
    `💰 Subtotal: ${formatCOP(order.subtotal)}`,
    `💳 Pago: ${order.paymentStatus}`,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

export function mapStatusChangeToNote(orderId: string, newStatus: string, adminNotes?: string | null): string {
  const lines = [
    `🔄 Cambio de estado — Pedido ${orderId}`,
    `Estado: ${newStatus}`,
  ];
  if (adminNotes) lines.push(`Notas: ${adminNotes}`);
  return lines.join("\n");
}
