"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/gtag";
import { fbPurchase } from "@/lib/fbpixel";

export default function PurchaseTracker({ orderId, value }: { orderId: string; value: number }) {
  useEffect(() => {
    trackPurchase(orderId, value);
    fbPurchase(value);
  }, [orderId, value]);

  return null;
}
