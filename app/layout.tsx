import type { Metadata } from "next";
import { headers } from "next/headers";
import { Figtree } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { CartProvider } from "./components/cart-provider";
import { ProductsProvider } from "./components/products-provider";
import { SaleModeProvider } from "./components/sale-mode-provider";
import AuthHistoryGuard from "./components/auth-history-guard";
import ConditionalShell from "./components/conditional-shell";
import CookieConsent from "./components/cookie-consent";
import MetaPixel from "./components/meta-pixel";
import { getProducts } from "@/lib/products";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { getCartItemsForUser } from "@/lib/cart";
import { getSaleMode } from "@/lib/sale-mode";
import { SITE_URL } from "@/lib/site";

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Kliniu — Dispensadores e insumos para tu negocio",
    template: "%s — Kliniu",
  },
  description: "Dispensadores, insumos y soluciones de higiene para hoteles, restaurantes y negocios en Colombia.",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [initialProducts, session, nonce, initialSaleMode] = await Promise.all([
    getProducts(),
    getSessionFromCookies(),
    headers().then((h) => h.get("x-nonce") ?? undefined),
    getSaleMode(),
  ]);
  const [currentUser, initialCartItems] = session
    ? await Promise.all([
        getUserById(session.userId).catch(() => null),
        getCartItemsForUser(session.userId).catch(() => []),
      ])
    : [null, []];
  const cartProviderKey = `${currentUser?.id ?? "guest"}:${initialCartItems
    .map((item) => `${item.id}:${item.cantidad}`)
    .join("|")}`;

  return (
    <html
      lang="es"
      className={`${figtree.variable} h-full antialiased`}
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NQSTZ4ZL');`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#050C14]">
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NQSTZ4ZL"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <AuthHistoryGuard />
        <SaleModeProvider initialMode={initialSaleMode}>
          <ProductsProvider initialProducts={initialProducts}>
            <CartProvider
              key={cartProviderKey}
              initialItems={initialCartItems}
              currentUserId={currentUser?.id ?? null}
            >
              <ConditionalShell
                currentUser={
                  currentUser
                    ? { fullName: currentUser.fullName, role: currentUser.role, avatarUrl: currentUser.avatarUrl }
                    : null
                }
              >
                {children}
              </ConditionalShell>
            </CartProvider>
          </ProductsProvider>
        </SaleModeProvider>
        <SpeedInsights />
        <MetaPixel nonce={nonce} />
        <CookieConsent nonce={nonce} />
      </body>
    </html>
  );
}
