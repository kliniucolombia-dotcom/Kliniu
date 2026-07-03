import { getValidToken, forceRefreshToken } from "./auth";
import type { KommoApiError } from "./types";

const BASE_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 500;

function kommoBaseUrl() {
  const domain = process.env.KOMMO_DOMAIN;
  if (!domain) throw new Error("KOMMO_DOMAIN not set");
  return `https://${domain}.kommo.com/api/v4`;
}

function isRetryableStatus(status: number) {
  return status === 429 || (status >= 500 && status < 600);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function logError(context: string, error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`[kommo] ${context}: ${msg}`);
}

interface FetchOptions extends RequestInit {
  _retryCount?: number;
  _refreshed?: boolean;
}

export async function kommoFetch<T = unknown>(path: string, options: FetchOptions = {}): Promise<T> {
  const { _retryCount = 0, _refreshed = false, ...fetchOptions } = options;

  const token = await getValidToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BASE_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${kommoBaseUrl()}${path}`, {
      ...fetchOptions,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...fetchOptions.headers,
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    throw new Error(`KOMMO_NETWORK_ERROR: ${err instanceof Error ? err.message : String(err)}`);
  }
  clearTimeout(timeout);

  // Token rejected by Kommo — force refresh and retry once
  if (res.status === 401 && !_refreshed) {
    await forceRefreshToken().catch(() => null);
    return kommoFetch<T>(path, { ...fetchOptions, _refreshed: true });
  }

  if (res.status === 204) return undefined as T;

  const json = await res.json().catch(() => ({})) as Record<string, unknown>;

  if (!res.ok) {
    const err = json as unknown as KommoApiError;
    const msg = `KOMMO_API_ERROR ${res.status}: ${err.title ?? "unknown"} — ${err.detail ?? ""}`;

    if (isRetryableStatus(res.status) && _retryCount < MAX_RETRIES - 1) {
      const backoff = RETRY_BASE_DELAY_MS * Math.pow(2, _retryCount);
      logError(`retryable (attempt ${_retryCount + 1}) ${path}`, msg);
      await sleep(backoff);
      return kommoFetch<T>(path, { ...fetchOptions, _retryCount: _retryCount + 1 });
    }

    logError(`failed ${path}`, msg);
    throw new Error(msg);
  }

  return json as T;
}
