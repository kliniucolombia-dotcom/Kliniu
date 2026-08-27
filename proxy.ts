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
  // React en desarrollo usa eval() para reconstruir callstacks. Nunca en producción.
  const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval} https://va.vercel-scripts.com https://www.googletagmanager.com https://www.googleadservices.com`,
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
const PROTECTED_PREFIXES = [
  "/mi-cuenta",
  "/panel",
  "/empaque",
  "/admin",
  "/empleado",
  "/imprimir-cotizacion",
  "/nomina/desprendible",
];

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

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

  if (isProtectedPath(pathname) && !hasSession) {
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
  if (isProtectedPath(pathname)) {
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  }
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
