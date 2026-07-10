import crypto from "crypto";

const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";

export function getWompiPublicKey() {
  const key = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  if (!key) throw new Error("WOMPI_NOT_CONFIGURED");
  return key;
}

// Firma de integridad requerida por Wompi Web Checkout:
// SHA256(reference + amountInCents + currency + integritySecret)
export function buildIntegritySignature(
  reference: string,
  amountInCents: number,
  currency: string,
) {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!secret) throw new Error("WOMPI_NOT_CONFIGURED");

  return crypto
    .createHash("sha256")
    .update(`${reference}${amountInCents}${currency}${secret}`)
    .digest("hex");
}

export function buildWompiCheckoutUrl(params: {
  reference: string;
  amountInCents: number;
  currency?: string;
  redirectUrl: string;
  customerEmail?: string;
}) {
  const currency = params.currency || "COP";
  const signature = buildIntegritySignature(params.reference, params.amountInCents, currency);

  const query = new URLSearchParams({
    "public-key": getWompiPublicKey(),
    currency,
    "amount-in-cents": String(params.amountInCents),
    reference: params.reference,
    "signature:integrity": signature,
    "redirect-url": params.redirectUrl,
  });

  if (params.customerEmail) {
    query.set("customer-data:email", params.customerEmail);
  }

  return `${WOMPI_CHECKOUT_URL}?${query.toString()}`;
}

type WompiEventPayload = {
  event: string;
  data: {
    transaction: {
      id: string;
      status: string;
      reference: string;
      amount_in_cents: number;
    };
  };
  signature: { checksum: string; properties: string[] };
  timestamp: number;
};

// Verifica el checksum del webhook: SHA256 de los valores de `properties`
// concatenados + timestamp + secreto de eventos, en ese orden.
export function verifyWompiEventSignature(payload: WompiEventPayload) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) throw new Error("WOMPI_NOT_CONFIGURED");

  const values = payload.signature.properties
    .map((path) => {
      const parts = path.split(".");
      let value: unknown = payload;
      for (const part of parts) {
        value = (value as Record<string, unknown>)?.[part];
      }
      return value;
    })
    .join("");

  const expected = crypto
    .createHash("sha256")
    .update(`${values}${payload.timestamp}${secret}`)
    .digest("hex");

  return expected === payload.signature.checksum;
}

export type { WompiEventPayload };
