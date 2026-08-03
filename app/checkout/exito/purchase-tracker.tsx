"use client";

import { useEffect } from "react";
import { trackPurchase } from "@/lib/gtag";

export default function PurchaseTracker({ orderId, value }: { orderId: string; value: number }) {
  useEffect(() => {
    trackPurchase(orderId, value);
  }, [orderId, value]);

  return null;
}
