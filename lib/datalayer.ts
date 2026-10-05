declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export type DataLayerItem = {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
};

export function pushEvent(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...params });
}

/** Evento de comercio electrónico GA4; limpia el objeto ecommerce anterior como pide GTM. */
export function pushEcommerce(
  event: string,
  ecommerce: { value: number; items: DataLayerItem[] } & Record<string, unknown>,
  extra: Record<string, unknown> = {},
) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({ event, ecommerce: { currency: "COP", ...ecommerce }, ...extra });
}

/** Consent Mode v2: refleja en GTM la elección del banner de cookies (el default "denied" vive en app/layout.tsx). */
export function updateConsent(granted: boolean) {
  if (typeof window === "undefined") return;
  const dataLayer = (window.dataLayer = window.dataLayer || []);
  const state = granted ? "granted" : "denied";
  // GTM solo reconoce comandos de consentimiento empujados como objeto `arguments`, no como array.
  function gtag(..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  }
  gtag("consent", "update", {
    ad_storage: state,
    ad_user_data: state,
    ad_personalization: state,
    analytics_storage: state,
  });
}
