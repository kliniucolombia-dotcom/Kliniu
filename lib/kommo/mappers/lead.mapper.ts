import { getKommoConfig } from "./config";
import type { KommoDeal, KommoCustomField } from "../types";

export interface OrderItemInput {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface OrderInput {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company?: string | null;
  department: string;
  city: string;
  addressLine1: string;
  subtotal: number;
  totalItems: number;
  paymentStatus: string;
  items: OrderItemInput[];
}

// Tag format used for idempotency searches in Kommo
export function orderTag(orderId: string) {
  return `kliniu-order-${orderId}`;
}

function buildCustomFields(order: OrderInput): KommoCustomField[] {
  const cfg = getKommoConfig().customFields.lead;
  const fields: KommoCustomField[] = [];

  const add = (fieldId: number | undefined, value: string | number | null | undefined) => {
    if (fieldId && value !== null && value !== undefined && value !== "") {
      fields.push({ field_id: fieldId, values: [{ value }] });
    }
  };

  add(cfg.orderId, order.id);
  add(cfg.department, order.department);
  add(cfg.city, order.city);
  add(cfg.addressLine1, order.addressLine1);
  add(cfg.customerPhone, order.customerPhone);
  add(cfg.totalItems, order.totalItems);
  add(cfg.paymentStatus, order.paymentStatus);

  return fields;
}

export function mapOrderToLead(order: OrderInput, contactId: number): KommoDeal {
  const cfg = getKommoConfig();
  const customFields = buildCustomFields(order);

  const deal: KommoDeal = {
    name: `Pedido ${order.id.slice(-6).toUpperCase()} — ${order.customerName}`,
    price: order.subtotal,
    _embedded: {
      contacts: [{ id: contactId }],
      tags: [{ name: orderTag(order.id) }],
    },
  };

  if (cfg.pipelines.orders) deal.pipeline_id = cfg.pipelines.orders;
  if (cfg.statuses.newOrder) deal.status_id = cfg.statuses.newOrder;
  if (cfg.users.defaultResponsible) deal.responsible_user_id = cfg.users.defaultResponsible;
  if (customFields.length > 0) deal.custom_fields_values = customFields;

  return deal;
}
