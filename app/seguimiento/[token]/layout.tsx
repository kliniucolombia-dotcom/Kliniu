import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Seguimiento de tu pedido | KLINIU",
  robots: { index: false, follow: false },
};

export default function SeguimientoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
