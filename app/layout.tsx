import type { Metadata } from "next";
import { headers } from "next/headers";
import { Figtree } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import { CartProvider } from "./components/cart-provider";
import { ProductsProvider } from "./components/products-provider";
import ConditionalShell from "./components/conditional-shell";
import GoogleTags from "./components/google-tags";
import { getProducts } from "@/lib/products";
import { getSessionFromCookies } from "@/lib/auth";
import { getUserById } from "@/lib/users";
import { getCartItemsForUser } from "@/lib/cart";
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
  const [initialProducts, session, nonce] = await Promise.all([
    getProducts(),
    getSessionFromCookies(),
    headers().then((h) => h.get("x-nonce") ?? undefined),
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
      <body className="min-h-full flex flex-col bg-[#050C14]">
        <ProductsProvider initialProducts={initialProducts}>
          <CartProvider
            key={cartProviderKey}
            initialItems={initialCartItems}
            currentUserId={currentUser?.id ?? null}
          >
            <ConditionalShell
              currentUser={
                currentUser
                  ? { fullName: currentUser.fullName, role: currentUser.role }
                  : null
              }
            >
              {children}
            </ConditionalShell>
          </CartProvider>
        </ProductsProvider>
        <SpeedInsights />
        <GoogleTags nonce={nonce} />
      </body>
    </html>
  );
}
