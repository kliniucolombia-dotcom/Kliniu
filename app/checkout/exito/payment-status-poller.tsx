"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// El webhook de Wompi puede llegar unos segundos después del redirect a esta
// página, así que si el pago sigue PENDING reintentamos unas cuantas veces
// antes de dejar el mensaje de "estamos verificando" definitivo.
const POLL_INTERVAL_MS = 2000;
const MAX_ATTEMPTS = 5;

export default function PaymentStatusPoller({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    let attempts = 0;
    let cancelled = false;

    const interval = setInterval(async () => {
      attempts += 1;

      try {
        const response = await fetch(`/api/orders/${orderId}/status`);
        if (response.ok) {
          const data = (await response.json()) as { paymentStatus: string };
          if (data.paymentStatus !== "PENDING") {
            clearInterval(interval);
            if (!cancelled) router.refresh();
            return;
          }
        }
      } catch {
        // Reintenta en el siguiente tick.
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(interval);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [orderId, router]);

  return null;
}
