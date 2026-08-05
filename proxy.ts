import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get("kliniu_session")?.value;
  if (!token) return false;
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

function buildCsp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://va.vercel-scripts.com https://www.googletagmanager.com https://www.googleadservices.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://*.supabase.co https://www.google-analytics.com https://www.googletagmanager.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
    "frame-src https://www.youtube.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const WEBHOOK_PREFIXES = ["/api/webhooks/", "/api/kommo/webhook", "/api/kommo/assistant", "/api/wati/webhook"];

function isCrossOriginMutation(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/") || SAFE_METHODS.has(request.method)) return false;
  if (WEBHOOK_PREFIXES.some((p) => pathname.startsWith(p))) return false;

  const origin = request.headers.get("origin");
  if (!origin) return false; // server-to-server o clientes sin Origin (no hay cookie de navegador que proteger)

  return origin !== request.nextUrl.origin;
}

export async function proxy(request: NextRequest) {
  if (isCrossOriginMutation(request)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const hasSession = await hasValidSession(request);
  const { pathname } = request.nextUrl;

  if (
    (pathname.startsWith("/mi-cuenta") || pathname.startsWith("/panel") || pathname.startsWith("/empaque") || pathname.startsWith("/admin") || pathname.startsWith("/empleado")) &&
    !hasSession
  ) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname.startsWith("/login") || pathname.startsWith("/registro")) && hasSession) {
    return NextResponse.redirect(new URL("/mi-cuenta", request.url));
  }

  const nonce = crypto.randomUUID().replace(/-/g, "");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
