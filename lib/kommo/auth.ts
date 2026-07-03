import { prisma } from "@/lib/prisma";
import type { KommoTokenResponse } from "./types";

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000; // renovar 5min antes de expirar
const MAX_REFRESH_ATTEMPTS = 2;

function kommoTokenEndpoint() {
  const domain = process.env.KOMMO_DOMAIN;
  if (!domain) throw new Error("KOMMO_DOMAIN not set");
  return `https://${domain}.kommo.com/oauth2/access_token`;
}

async function fetchNewTokens(body: Record<string, string>): Promise<KommoTokenResponse> {
  const clientId = process.env.KOMMO_CLIENT_ID;
  const clientSecret = process.env.KOMMO_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("KOMMO_CLIENT_ID or KOMMO_CLIENT_SECRET not set");

  const res = await fetch(kommoTokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, ...body }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Kommo token request failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<KommoTokenResponse>;
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const redirectUri = process.env.KOMMO_REDIRECT_URI;
  if (!redirectUri) throw new Error("KOMMO_REDIRECT_URI not set");

  const tokens = await fetchNewTokens({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  await storeToken(tokens);
}

export async function storeToken(tokens: KommoTokenResponse): Promise<void> {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const existing = await prisma.kommoToken.findFirst();

  if (existing) {
    await prisma.kommoToken.update({
      where: { id: existing.id },
      data: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt },
    });
  } else {
    await prisma.kommoToken.create({
      data: { accessToken: tokens.access_token, refreshToken: tokens.refresh_token, expiresAt },
    });
  }
}

async function refreshAccessToken(refreshToken: string): Promise<KommoTokenResponse> {
  return fetchNewTokens({ grant_type: "refresh_token", refresh_token: refreshToken });
}

export async function getValidToken(): Promise<string> {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const record = await prisma.kommoToken.findFirst();
  if (!record) throw new Error("KOMMO_NOT_CONFIGURED: no token stored. Complete OAuth flow first.");

  const isExpired = record.expiresAt.getTime() - TOKEN_EXPIRY_BUFFER_MS < Date.now();
  if (!isExpired) return record.accessToken;

  return forceRefreshToken(record.refreshToken);
}

export async function forceRefreshToken(refreshToken?: string): Promise<string> {
  if (!prisma) throw new Error("DATABASE_NOT_CONFIGURED");

  const record = refreshToken
    ? { refreshToken }
    : await prisma.kommoToken.findFirst();

  if (!record) throw new Error("KOMMO_NOT_CONFIGURED");

  const fresh = await refreshAccessToken(record.refreshToken);
  await storeToken(fresh);
  return fresh.access_token;
}
