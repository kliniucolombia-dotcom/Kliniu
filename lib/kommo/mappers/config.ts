function envInt(key: string): number | undefined {
  const val = process.env[key];
  if (!val) return undefined;
  const n = parseInt(val, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/**
 * Reads Kommo configuration from env vars.
 * All IDs are optional — mappers omit the field if undefined,
 * so Kommo uses its account defaults. No business logic depends
 * on specific values being set.
 */
export function getKommoConfig() {
  return {
    pipelines: {
      orders: envInt("KOMMO_PIPELINE_ORDERS_ID"),
    },
    statuses: {
      newOrder: envInt("KOMMO_STATUS_NEW_ORDER_ID"),
      paid: envInt("KOMMO_STATUS_PAID_ID"),
      cancelled: envInt("KOMMO_STATUS_CANCELLED_ID"),
    },
    users: {
      defaultResponsible: envInt("KOMMO_DEFAULT_USER_ID"),
    },
    customFields: {
      contact: {
        phone: envInt("KOMMO_CF_CONTACT_PHONE_ID"),
        whatsappPhone: envInt("KOMMO_CF_CONTACT_WHATSAPP_ID"),
        company: envInt("KOMMO_CF_CONTACT_COMPANY_ID"),
        city: envInt("KOMMO_CF_CONTACT_CITY_ID"),
        customerLevel: envInt("KOMMO_CF_CONTACT_LEVEL_ID"),
      },
      lead: {
        orderId: envInt("KOMMO_CF_LEAD_ORDER_ID"),
        department: envInt("KOMMO_CF_LEAD_DEPARTMENT_ID"),
        city: envInt("KOMMO_CF_LEAD_CITY_ID"),
        addressLine1: envInt("KOMMO_CF_LEAD_ADDRESS_ID"),
        customerPhone: envInt("KOMMO_CF_LEAD_PHONE_ID"),
        totalItems: envInt("KOMMO_CF_LEAD_TOTAL_ITEMS_ID"),
        paymentStatus: envInt("KOMMO_CF_LEAD_PAYMENT_STATUS_ID"),
      },
    },
  } as const;
}

export type KommoConfig = ReturnType<typeof getKommoConfig>;
