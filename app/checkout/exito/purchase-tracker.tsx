"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/gtag";
import { fbPurchase } from "@/lib/fbpixel";
import { pushEcommerce, type DataLayerItem } from "@/lib/datalayer";

type Props = {
  orderId: string;
  /** Total pagado: subtotal + envío. */
  value: number;
  shipping: number;
  items: DataLayerItem[];
  userData?: { email: string; phone: string };
};

/** Teléfono a E.164; los celulares colombianos de 10 dígitos llevan +57. */
function toE164(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  return digits.length === 10 ? `+57${digits}` : `+${digits}`;
}

export default function PurchaseTracker({ orderId, value, shipping, items, userData }: Props) {
  useEffect(() => {
    // Una compra se reporta una sola vez por navegador aunque el cliente recargue la página.
    const key = `purchase:${orderId}`;
    try {
      if (window.localStorage.getItem(key)) return;
      window.localStorage.setItem(key, "1");
    } catch {}

    pushEcommerce(
      "purchase",
      { transaction_id: orderId, value, shipping, items },
      userData
        ? { user_data: { email: userData.email.trim().toLowerCase(), phone_number: toE164(userData.phone) } }
        : {},
    );
    trackPurchase(orderId, value);
    fbPurchase(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  return null;
}
