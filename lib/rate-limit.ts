import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const redis = Redis.fromEnv();
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowMs: number) {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);

  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${Math.max(1, Math.round(windowMs / 1000))} s`),
      prefix: "kliniu-ratelimit",
    });
    limiters.set(cacheKey, limiter);
  }

  return limiter;
}

/** Rate limit distribuido vía Upstash Redis — persiste entre cold starts serverless. */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const { success } = await getLimiter(limit, windowMs).limit(key);
  return success;
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}
