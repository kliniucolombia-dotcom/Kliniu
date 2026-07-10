import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Carrito de compras",
};

export default function CarritoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
