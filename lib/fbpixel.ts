declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

function track(event: string, params?: Record<string, unknown>, retries = 20) {
  if (typeof window === "undefined") return;
  if (!window.fbq) {
    if (retries <= 0) return;
    setTimeout(() => track(event, params, retries - 1), 150);
    return;
  }
  window.fbq("track", event, params);
}

export const fbAddPaymentInfo = (params?: Record<string, unknown>) => track("AddPaymentInfo", params);
export const fbAddToCart = (params?: Record<string, unknown>) => track("AddToCart", params);
export const fbAddToWishlist = (params?: Record<string, unknown>) => track("AddToWishlist", params);
export const fbCompleteRegistration = (params?: Record<string, unknown>) => track("CompleteRegistration", params);
export const fbContact = (params?: Record<string, unknown>) => track("Contact", params);
export const fbCustomizeProduct = (params?: Record<string, unknown>) => track("CustomizeProduct", params);
export const fbDonate = (params?: Record<string, unknown>) => track("Donate", params);
export const fbFindLocation = (params?: Record<string, unknown>) => track("FindLocation", params);
export const fbInitiateCheckout = (params?: Record<string, unknown>) => track("InitiateCheckout", params);
export const fbLead = (params?: Record<string, unknown>) => track("Lead", params);
export const fbSchedule = (params?: Record<string, unknown>) => track("Schedule", params);
export const fbSearch = (params?: Record<string, unknown>) => track("Search", params);
export const fbStartTrial = (params?: Record<string, unknown>) => track("StartTrial", params);
export const fbSubmitApplication = (params?: Record<string, unknown>) => track("SubmitApplication", params);
export const fbSubscribe = (params?: Record<string, unknown>) => track("Subscribe", params);
export const fbViewContent = (params?: Record<string, unknown>) => track("ViewContent", params);

export function fbPurchase(value: number, currency: string = "COP") {
  track("Purchase", { value, currency });
}
