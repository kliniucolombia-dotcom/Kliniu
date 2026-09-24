import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La generación de PDF usa Chromium. En Vercel no se puede empaquetar el
  // navegador de Playwright, así que se usa el binario de @sparticuz/chromium:
  // hay que incluirlo en el trace de las funciones y no dejar que Next lo
  // intente bundlear.
  serverExternalPackages: ["@sparticuz/chromium", "playwright-core"],
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/@sparticuz/chromium/bin/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  async headers() {
    // CSP se genera por request (con nonce) en proxy.ts, no aquí.
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
