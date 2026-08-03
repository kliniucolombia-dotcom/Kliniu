declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPurchase(orderId: string, value: number) {
  if (typeof window === "undefined" || !window.gtag) return;

  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  const adsConversionId = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL;

  if (gaId) {
    window.gtag("event", "purchase", {
      transaction_id: orderId,
      value,
      currency: "COP",
    });
  }

  if (adsConversionId) {
    window.gtag("event", "conversion", {
      send_to: adsConversionId,
      transaction_id: orderId,
      value,
      currency: "COP",
    });
  }
}
