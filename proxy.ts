import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get("kliniu_session")?.value;
  if (!token) return false;
  const secret = process.env.APP_SESSION_SECRET;
  if (!secret) return false;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    // Tokens de reset/verificación (llevan `purpose`) no son sesiones. Ver lib/auth.ts.
    return !("purpose" in payload) && Boolean(payload.userId);
  } catch {
    return false;
  }
}

// Destinos de GA4 y de las conversiones/remarketing de Google Ads disparados desde GTM
// (lista de la guía CSP de Google Tag Platform).
const GOOGLE_TAG_HOSTS = [
  "https://*.google-analytics.com",
  "https://*.googletagmanager.com",
  "https://*.g.doubleclick.net",
  "https://www.google.com",
  "https://google.com",
  "https://www.googleadservices.com",
  "https://pagead2.googlesyndication.com",
].join(" ");

// Gateway de la API de Conversiones de Meta: el propio script del pixel
// (connect.facebook.net/signals/config/<pixel>) manda ahí una copia de cada evento.
// Hosts exactos, no comodines: *.run.app y *.on.aws los puede alojar cualquiera.
// Si Meta los cambia, la consola mostrará de nuevo el bloqueo de connect-src.
const META_GATEWAY_HOSTS = [
  "https://sl-11a463aaedf44600a99367660fd6fa70.ecs.us-east-1.on.aws",
  "https://bded8a3c6ae-1-1053047382554.us-central1.run.app",
].join(" ");

function buildCsp(nonce: string) {
  // React en desarrollo usa eval() para reconstruir callstacks. Nunca en producción.
  const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devEval} https://va.vercel-scripts.com https://www.googletagmanager.com https://www.googleadservices.com https://connect.facebook.net`,
    "style-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://fonts.googleapis.com",
    `img-src 'self' data: blob: https://*.supabase.co https://www.facebook.com ${GOOGLE_TAG_HOSTS} https://www.google.com.co https://ssl.gstatic.com https://www.gstatic.com https://fonts.gstatic.com`,
    "media-src 'self' blob: https://*.supabase.co",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.analytics.google.com https://www.facebook.com https://connect.facebook.net ${META_GATEWAY_HOSTS} ${GOOGLE_TAG_HOSTS}`,
    "frame-src 'self' https://www.youtube.com https://www.googletagmanager.com https://td.doubleclick.net https://www.facebook.com",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'self'",
  ].join("; ");
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const JSON_METHODS = new Set(["POST", "PUT", "PATCH"]);
const OPERATIONS_API_PREFIXES = [
  "/api/panel/operaciones", "/api/panel/logistica", "/api/panel/mantenimiento",
  "/api/panel/bodegas", "/api/panel/production-orders", "/api/panel/production-runs",
  "/api/panel/produccion/moldes", "/api/panel/ensamble",
];
const WEBHOOK_PREFIXES = ["/api/webhooks/", "/api/kommo/webhook", "/api/kommo/assistant", "/api/wati/webhook"];
const PROTECTED_PREFIXES = [
  "/mi-cuenta",
  "/panel",
  "/empaque",
  "/admin",
  "/empleado",
  "/imprimir-cotizacion",
  "/imprimir-produccion",
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

function isOperationsJsonMutation(request: NextRequest) {
  return JSON_METHODS.has(request.method) && OPERATIONS_API_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  if (isCrossOriginMutation(request)) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  if (isOperationsJsonMutation(request)) {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return NextResponse.json({ error: "Content-Type debe ser application/json" }, { status: 415 });
    }
    try {
      const body: unknown = await request.clone().json();
      if (typeof body !== "object" || body === null || Array.isArray(body)) throw new Error("INVALID_BODY");
    } catch {
      return NextResponse.json({ error: "Cuerpo JSON inválido" }, { status: 400 });
    }
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
  requestHeaders.set("x-pathname", pathname);
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
